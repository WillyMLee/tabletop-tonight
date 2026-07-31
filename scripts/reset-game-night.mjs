import { readFile } from 'node:fs/promises'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../convex/_generated/api.js'

const deploymentUrl = process.argv.find(argument => argument.startsWith('https://'))
if (!deploymentUrl || !process.argv.includes('--confirm')) {
  throw new Error('Usage: npm run reset:live -- https://your-production.convex.cloud --confirm')
}

const envFile = await readFile(new URL('../.env.local', import.meta.url), 'utf8')
const eventKey = envFile.match(/^VITE_GAME_NIGHT_KEY=(.+)$/m)?.[1]?.trim()
if (!eventKey) throw new Error('VITE_GAME_NIGHT_KEY is missing from .env.local')

const client = new ConvexHttpClient(deploymentUrl)
await client.mutation(api.sharedState.reset, { eventKey })
const state = await client.query(api.sharedState.get, { eventKey })

if (!state || state.scores.meeple !== 0 || state.scores.mayhem !== 0 || state.players.length !== 0) {
  throw new Error('Game-night reset could not be verified')
}

console.log('Game night reset to an empty roster and a 0-0 score.')
