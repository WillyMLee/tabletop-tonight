import { readFile } from 'node:fs/promises'
import { ConvexClient } from 'convex/browser'
import { api } from '../convex/_generated/api.js'

const deploymentUrl = process.argv[2]
if (!deploymentUrl?.startsWith('https://')) {
  throw new Error('Usage: npm run verify:live -- https://your-production.convex.cloud')
}

const envFile = await readFile(new URL('../.env.local', import.meta.url), 'utf8')
const configuredEventKey = envFile.match(/^VITE_GAME_NIGHT_KEY=(.+)$/m)?.[1]?.trim()
if (!configuredEventKey) throw new Error('VITE_GAME_NIGHT_KEY is missing from .env.local')

// Keep verification isolated from the real event while exercising the same
// production deployment, subscriptions, mutations, and scoring transaction.
const eventKey = `${configuredEventKey.slice(0, 47)}-sync-check`
const writer = new ConvexClient(deploymentUrl)
const reader = new ConvexClient(deploymentUrl)
const unsubscribers = []

const waitForUpdate = (query, args, matches, label) => {
  const startedAt = Date.now()
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${label}`)), 10_000)
    const unsubscribe = reader.onUpdate(
      query,
      args,
      value => {
        if (!matches(value)) return
        clearTimeout(timer)
        resolve(Date.now() - startedAt)
      },
      error => {
        clearTimeout(timer)
        reject(error)
      },
    )
    unsubscribers.push(unsubscribe)
  })
}

try {
  await writer.mutation(api.sharedState.ensure, { eventKey })
  await writer.mutation(api.sharedState.reset, { eventKey })
  const initial = await reader.query(api.sharedState.get, { eventKey })
  if (!initial) throw new Error('Shared game night did not initialize')

  const scoreUpdate = waitForUpdate(
    api.sharedState.get,
    { eventKey },
    state => state?.scores.meeple === 1,
    'the second client to receive a team score',
  )
  await writer.mutation(api.sharedState.adjustTeamScore, { eventKey, team: 'meeple', delta: 1 })
  const scoreLatencyMs = await scoreUpdate
  await writer.mutation(api.sharedState.adjustTeamScore, { eventKey, team: 'meeple', delta: -1 })

  const player = initial.players.find(item => item.team === 'meeple')
  if (!player) throw new Error('The sync test needs a Team Jessa player')
  const claimToken = crypto.randomUUID()
  const puzzleId = 'wordle-pool-v1-1'
  await writer.mutation(api.sharedState.joinPlayer, { eventKey, playerId: player.id, claimToken })

  const leaderboardUpdate = waitForUpdate(
    api.puzzleResults.list,
    { eventKey },
    results => results.some(result => result.game === 'wordle' && result.puzzleId === puzzleId && result.playerId === player.id && result.metric === 4),
    'the second client to receive the Wordle leaderboard result',
  )
  const wordleScoreUpdate = waitForUpdate(
    api.sharedState.get,
    { eventKey },
    state => state?.scores.meeple === 3 && state.players.find(item => item.id === player.id)?.points === 3,
    'the second client to receive Wordle scoring',
  )
  await writer.mutation(api.puzzleResults.submit, {
    eventKey,
    playerId: player.id,
    claimToken,
    game: 'wordle',
    puzzleId,
    metric: 4,
  })
  const [leaderboardLatencyMs, wordleScoreLatencyMs] = await Promise.all([leaderboardUpdate, wordleScoreUpdate])

  console.log(`Live sync verified: team score ${scoreLatencyMs} ms, Wordle leaderboard ${leaderboardLatencyMs} ms, Wordle scoreboards ${wordleScoreLatencyMs} ms.`)
} finally {
  for (const unsubscribe of unsubscribers) unsubscribe()
  try {
    await writer.mutation(api.sharedState.reset, { eventKey })
  } finally {
    await Promise.all([writer.close(), reader.close()])
  }
}
