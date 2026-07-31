import { readFile } from 'node:fs/promises'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../convex/_generated/api.js'

const envFile = await readFile(new URL('../.env.local', import.meta.url), 'utf8')
const readEnv = key => envFile.match(new RegExp(`^${key}=(.+)$`, 'm'))?.[1]?.trim()
const deploymentUrl = process.argv[2] || readEnv('VITE_CONVEX_URL')
const eventKey = readEnv('VITE_GAME_NIGHT_KEY')
if (!deploymentUrl || !eventKey) throw new Error('Convex URL and game-night key are required')

const client = new ConvexHttpClient(deploymentUrl)
const winnerKey = `geoguessr:verify-${Date.now()}`

await client.mutation(api.sharedState.ensure, { eventKey })
const before = await client.query(api.sharedState.get, { eventKey })
const jessaPlayer = before?.players.find(player => player.team === 'meeple')
const willyPlayer = before?.players.find(player => player.team === 'mayhem')
if (!before || !jessaPlayer || !willyPlayer) throw new Error('Both preset teams are required')

try {
  await client.mutation(api.sharedState.recordGameWinner, { eventKey, winnerKey, playerId: jessaPlayer.id })
  const first = await client.query(api.sharedState.get, { eventKey })
  if (first.scores.meeple !== before.scores.meeple + 3) throw new Error('First winner did not receive three team points')
  if (first.players.find(player => player.id === jessaPlayer.id)?.points !== jessaPlayer.points + 3) throw new Error('First winner did not receive three individual points')

  await client.mutation(api.sharedState.recordGameWinner, { eventKey, winnerKey, playerId: willyPlayer.id })
  const switched = await client.query(api.sharedState.get, { eventKey })
  if (switched.scores.meeple !== before.scores.meeple || switched.scores.mayhem !== before.scores.mayhem + 3) throw new Error('Changing a winner did not transfer team points')
  if (switched.players.find(player => player.id === jessaPlayer.id)?.points !== jessaPlayer.points) throw new Error('Changing a winner did not remove old individual points')
  if (switched.players.find(player => player.id === willyPlayer.id)?.points !== willyPlayer.points + 3) throw new Error('Changing a winner did not add new individual points')

  console.log('Winner scoring verified; individual and team points transfer atomically.')
} finally {
  await client.mutation(api.sharedState.recordGameWinner, { eventKey, winnerKey })
}
