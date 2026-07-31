import { readFile } from 'node:fs/promises'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../convex/_generated/api.js'

const envFile = await readFile(new URL('../.env.local', import.meta.url), 'utf8')
const readEnv = key => envFile.match(new RegExp(`^${key}=(.+)$`, 'm'))?.[1]?.trim()
const deploymentUrl = process.argv[2] || readEnv('VITE_CONVEX_URL')
const eventKey = readEnv('VITE_GAME_NIGHT_KEY')
if (!deploymentUrl || !eventKey) throw new Error('Convex URL and game-night key are required')

const client = new ConvexHttpClient(deploymentUrl)
let playerId

try {
  await client.mutation(api.sharedState.ensure, { eventKey })
  const before = await client.query(api.sharedState.get, { eventKey })
  const available = before?.players.find(player => !player.checkedIn)
  if (!available) throw new Error('No unclaimed roster name is available for the join check')
  const claimToken = crypto.randomUUID()
  playerId = await client.mutation(api.sharedState.joinPlayer, { eventKey, playerId: available.id, claimToken })
  const samePlayerId = await client.mutation(api.sharedState.joinPlayer, { eventKey, playerId: available.id, claimToken })
  let duplicateRejected = false
  try {
    await client.mutation(api.sharedState.joinPlayer, { eventKey, playerId: available.id, claimToken: crypto.randomUUID() })
  } catch {
    duplicateRejected = true
  }
  let impersonatedScoreRejected = false
  try {
    await client.mutation(api.puzzleResults.submit, { eventKey, playerId: available.id, claimToken: crypto.randomUUID(), game: 'wordle', puzzleId: 'claim-check', metric: 1 })
  } catch {
    impersonatedScoreRejected = true
  }
  const state = await client.query(api.sharedState.get, { eventKey })
  const player = state?.players.find(item => item.id === playerId)

  if (samePlayerId !== playerId) throw new Error('The same device did not reclaim its roster name')
  if (!duplicateRejected) throw new Error('A second device was able to claim the same roster name')
  if (!impersonatedScoreRejected) throw new Error('A second device was able to submit a score for the claimed name')
  if (!player?.checkedIn) throw new Error('Claimed player did not sync correctly')
  console.log('Guest join verified; one roster name can be claimed by only one device.')
} finally {
  if (playerId) await client.mutation(api.sharedState.releasePlayer, { eventKey, playerId })
}
