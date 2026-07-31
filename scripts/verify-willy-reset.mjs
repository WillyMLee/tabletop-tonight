import { readFile } from 'node:fs/promises'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../convex/_generated/api.js'

const envFile = await readFile(new URL('../.env.local', import.meta.url), 'utf8')
const deploymentUrl = process.argv.find(argument => argument.startsWith('https://')) || envFile.match(/^VITE_CONVEX_URL=(.+)$/m)?.[1]?.trim()
if (!deploymentUrl) throw new Error('VITE_CONVEX_URL is missing from .env.local')

const eventKey = 'tabletop-tonight-willy-reset-check'
const client = new ConvexHttpClient(deploymentUrl)

try {
  await client.mutation(api.sharedState.ensure, { eventKey })
  await client.mutation(api.sharedState.reset, { eventKey })
  const initial = await client.query(api.sharedState.get, { eventKey })
  const willy = initial?.players.find(player => player.name === 'Willy')
  const opponent = initial?.players.find(player => player.team === 'meeple')
  if (!willy || !opponent) throw new Error('The reset check needs Willy and one Team Jessa player')

  const willyToken = crypto.randomUUID()
  const opponentToken = crypto.randomUUID()
  await client.mutation(api.sharedState.joinPlayer, { eventKey, playerId: willy.id, claimToken: willyToken })
  await client.mutation(api.sharedState.joinPlayer, { eventKey, playerId: opponent.id, claimToken: opponentToken })
  await client.mutation(api.sharedState.recordGameWinner, { eventKey, winnerKey: 'geoguessr:1', playerId: opponent.id })
  await client.mutation(api.sharedState.recordGameWinner, { eventKey, winnerKey: 'jenga:1', playerId: willy.id })
  await client.mutation(api.puzzleResults.submit, { eventKey, playerId: willy.id, claimToken: willyToken, game: 'wordle', puzzleId: 'wordle-pool-v1-1', metric: 4 })
  await client.mutation(api.sharedState.recordGameWinner, { eventKey, winnerKey: 'blokus:1', playerId: opponent.id })

  let unauthorizedResetRejected = false
  try {
    await client.mutation(api.sharedState.resetGroupGameScores, { eventKey, playerId: opponent.id, claimToken: opponentToken })
  } catch {
    unauthorizedResetRejected = true
  }
  if (!unauthorizedResetRejected) throw new Error('A non-Willy profile was allowed to reset group-game scores')

  const result = await client.mutation(api.sharedState.resetGroupGameScores, { eventKey, playerId: willy.id, claimToken: willyToken })
  const state = await client.query(api.sharedState.get, { eventKey })
  const puzzleResults = await client.query(api.puzzleResults.list, { eventKey })
  const remainingWilly = state?.players.find(player => player.id === willy.id)
  const remainingOpponent = state?.players.find(player => player.id === opponent.id)

  if (result.clearedRounds !== 3 || result.clearedPuzzleResults !== 1) throw new Error('The group reset did not report the expected cleared results')
  if (puzzleResults.length) throw new Error('The group reset left puzzle leaderboard results behind')
  if (state?.gameWinners?.['geoguessr:1'] || state?.gameWinners?.['jenga:1'] || state?.gameWinners?.['wordle:1']) throw new Error('The group reset left a group-game winner behind')
  if (state?.gameWinners?.['blokus:1'] !== opponent.id) throw new Error('The group reset removed a circuit winner')
  if (state?.scores.meeple !== 2 || state?.scores.mayhem !== 0 || remainingOpponent?.points !== 2 || remainingWilly?.points !== 0) throw new Error('The group reset did not preserve only circuit points')
  if (!remainingWilly?.checkedIn || !remainingOpponent?.checkedIn) throw new Error('The group reset checked players out')

  console.log('Willy reset verified; unauthorized profiles are rejected and circuit state is preserved.')
} finally {
  await client.mutation(api.sharedState.reset, { eventKey })
}
