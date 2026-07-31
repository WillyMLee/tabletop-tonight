import { readFile } from 'node:fs/promises'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../convex/_generated/api.js'

const envFile = await readFile(new URL('../.env.local', import.meta.url), 'utf8')
const readEnv = key => envFile.match(new RegExp(`^${key}=(.+)$`, 'm'))?.[1]?.trim()
const deploymentUrl = readEnv('VITE_CONVEX_URL')
const eventKey = readEnv('VITE_GAME_NIGHT_KEY')
if (!deploymentUrl || !eventKey) throw new Error('The development Convex URL and game-night key are required')

const client = new ConvexHttpClient(deploymentUrl)
await client.mutation(api.sharedState.ensure, { eventKey })
const before = await client.query(api.sharedState.get, { eventKey })
const priorResults = await client.query(api.puzzleResults.list, { eventKey })
if (!before || before.scores.meeple !== 0 || before.scores.mayhem !== 0 || before.players.some(player => player.checkedIn || player.points) || priorResults.length) {
  throw new Error('Puzzle scoring verification requires a clean development game night')
}

const jessa = before.players.find(player => player.team === 'meeple')
const willy = before.players.find(player => player.team === 'mayhem')
if (!jessa || !willy) throw new Error('Both teams need a player')
const jessaToken = crypto.randomUUID()
const willyToken = crypto.randomUUID()

try {
  await client.mutation(api.sharedState.joinPlayer, { eventKey, playerId: jessa.id, claimToken: jessaToken })
  await client.mutation(api.sharedState.joinPlayer, { eventKey, playerId: willy.id, claimToken: willyToken })
  await client.mutation(api.puzzleResults.submit, { eventKey, playerId: jessa.id, claimToken: jessaToken, game: 'wordle', puzzleId: 'wordle-pool-v1-1', metric: 4 })
  const first = await client.query(api.sharedState.get, { eventKey })
  if (first.scores.meeple !== 3 || first.players.find(player => player.id === jessa.id)?.points !== 3) throw new Error('The first puzzle leader was not scored')

  await client.mutation(api.puzzleResults.submit, { eventKey, playerId: willy.id, claimToken: willyToken, game: 'wordle', puzzleId: 'wordle-pool-v1-1', metric: 3 })
  const second = await client.query(api.sharedState.get, { eventKey })
  if (second.scores.meeple !== 0 || second.scores.mayhem !== 3) throw new Error('A better result did not transfer team points')
  if (second.players.find(player => player.id === jessa.id)?.points !== 0 || second.players.find(player => player.id === willy.id)?.points !== 3) throw new Error('A better result did not transfer individual points')

  await client.mutation(api.puzzleResults.submit, { eventKey, playerId: jessa.id, claimToken: jessaToken, game: 'wordle', puzzleId: 'wordle-pool-v1-1', metric: 2 })
  const final = await client.query(api.sharedState.get, { eventKey })
  if (final.scores.meeple !== 3 || final.scores.mayhem !== 0 || final.gameWinners?.['wordle:1'] !== jessa.id) throw new Error('The final live leader was not reflected in the scoreboards')

  console.log('Puzzle scoring verified; live leaders automatically transfer individual and team points.')
} finally {
  await client.mutation(api.sharedState.reset, { eventKey })
}
