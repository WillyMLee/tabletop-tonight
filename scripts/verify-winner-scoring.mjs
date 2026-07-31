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
const circuitPhase = 9
const circuitSlug = 'mario-strikers-gc'

await client.mutation(api.sharedState.ensure, { eventKey })
const before = await client.query(api.sharedState.get, { eventKey })
const jessaPlayer = before?.players.find(player => player.team === 'meeple')
const willyPlayer = before?.players.find(player => player.team === 'mayhem')
if (!before || !jessaPlayer || !willyPlayer) throw new Error('Both preset teams are required')
const previousCircuitResult = before.circuitResults[`${circuitPhase}:${circuitSlug}`]
const previousGameChoice = before.circuitGameChoices?.['4'] || 'flip-7'

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

  await client.mutation(api.sharedState.recordCircuitResult, { eventKey, phase: circuitPhase, slug: circuitSlug })
  const circuitBefore = await client.query(api.sharedState.get, { eventKey })
  await client.mutation(api.sharedState.recordCircuitResult, { eventKey, phase: circuitPhase, slug: circuitSlug, result: 'meeple' })
  const circuitAfter = await client.query(api.sharedState.get, { eventKey })
  if (circuitAfter.scores.meeple !== circuitBefore.scores.meeple + 2 || circuitAfter.scores.mayhem !== circuitBefore.scores.mayhem) throw new Error('Strikers did not add exactly two points to the winning team')
  if (circuitAfter.players.some((player, index) => player.points !== circuitBefore.players[index]?.points)) throw new Error('Strikers incorrectly changed an individual score')

  await client.mutation(api.sharedState.setCircuitGameChoice, { eventKey, round: 4, choice: 'magical-athlete' })
  const choiceAfter = await client.query(api.sharedState.get, { eventKey })
  if (choiceAfter.circuitGameChoices?.['4'] !== 'magical-athlete') throw new Error('The shared circuit game choice did not update')

  console.log('Winner scoring verified; player awards, team-only Strikers scoring, and the shared game choice are correct.')
} finally {
  await client.mutation(api.sharedState.recordGameWinner, { eventKey, winnerKey })
  await client.mutation(api.sharedState.recordCircuitResult, { eventKey, phase: circuitPhase, slug: circuitSlug, result: previousCircuitResult })
  await client.mutation(api.sharedState.setCircuitGameChoice, { eventKey, round: 4, choice: previousGameChoice })
}
