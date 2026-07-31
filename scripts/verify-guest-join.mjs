import { readFile } from 'node:fs/promises'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../convex/_generated/api.js'

const envFile = await readFile(new URL('../.env.local', import.meta.url), 'utf8')
const readEnv = key => envFile.match(new RegExp(`^${key}=(.+)$`, 'm'))?.[1]?.trim()
const deploymentUrl = process.argv[2] || readEnv('VITE_CONVEX_URL')
const eventKey = readEnv('VITE_GAME_NIGHT_KEY')
if (!deploymentUrl || !eventKey) throw new Error('Convex URL and game-night key are required')

const client = new ConvexHttpClient(deploymentUrl)
const testName = `Guest Test ${Date.now()}`
let playerId

try {
  await client.mutation(api.sharedState.ensure, { eventKey })
  playerId = await client.mutation(api.sharedState.joinPlayer, { eventKey, name: testName, team: 'meeple' })
  const samePlayerId = await client.mutation(api.sharedState.joinPlayer, { eventKey, name: testName.toUpperCase(), team: 'mayhem' })
  const state = await client.query(api.sharedState.get, { eventKey })
  const player = state?.players.find(item => item.id === playerId)

  if (samePlayerId !== playerId) throw new Error('Duplicate name created a second player')
  if (!player || player.team !== 'mayhem' || !player.checkedIn) throw new Error('Joined player did not sync correctly')
  console.log('Guest join verified; duplicate names reclaim the same checked-in player.')
} finally {
  if (playerId) await client.mutation(api.sharedState.removePlayer, { eventKey, playerId })
}
