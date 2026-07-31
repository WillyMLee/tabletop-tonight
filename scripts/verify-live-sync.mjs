import { readFile } from 'node:fs/promises'
import { ConvexClient } from 'convex/browser'
import { api } from '../convex/_generated/api.js'

const deploymentUrl = process.argv[2]
if (!deploymentUrl?.startsWith('https://')) {
  throw new Error('Usage: npm run verify:live -- https://your-production.convex.cloud')
}

const envFile = await readFile(new URL('../.env.local', import.meta.url), 'utf8')
const eventKey = envFile.match(/^VITE_GAME_NIGHT_KEY=(.+)$/m)?.[1]?.trim()
if (!eventKey) throw new Error('VITE_GAME_NIGHT_KEY is missing from .env.local')

const writer = new ConvexClient(deploymentUrl)
const reader = new ConvexClient(deploymentUrl)
let unsubscribe

try {
  await writer.mutation(api.sharedState.ensure, { eventKey })
  const initial = await reader.query(api.sharedState.get, { eventKey })
  if (!initial) throw new Error('Shared game night did not initialize')

  const startingScore = initial.scores.meeple
  const delta = startingScore > 0 ? -1 : 1
  const expectedScore = startingScore + delta
  const startedAt = Date.now()

  const updateReceived = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timed out waiting for the second client')), 10_000)
    unsubscribe = reader.onUpdate(
      api.sharedState.get,
      { eventKey },
      (state) => {
        if (state?.scores.meeple === expectedScore) {
          clearTimeout(timer)
          resolve(Date.now() - startedAt)
        }
      },
      reject,
    )
  })

  await writer.mutation(api.sharedState.adjustTeamScore, { eventKey, team: 'meeple', delta })
  const latencyMs = await updateReceived
  await writer.mutation(api.sharedState.adjustTeamScore, { eventKey, team: 'meeple', delta: -delta })

  const restored = await writer.query(api.sharedState.get, { eventKey })
  if (restored?.scores.meeple !== startingScore) throw new Error('Score restoration failed')

  console.log(`Live sync verified in ${latencyMs} ms; test score restored.`)
} finally {
  unsubscribe?.()
  await Promise.all([writer.close(), reader.close()])
}
