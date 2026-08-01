import { mutation, query, type MutationCtx } from './_generated/server'
import type { Doc } from './_generated/dataModel'
import { v } from 'convex/values'
import { circuitFourLockedAssignments, circuitFourTeamCapacities, initialRoster } from './eventConfig'

const teamSlug = v.union(v.literal('meeple'), v.literal('mayhem'))
const puzzleGame = v.union(v.literal('wordle'), v.literal('connections'))
const pod = v.union(v.literal('A'), v.literal('B'), v.literal('C'), v.literal('D'))
const circuitResult = v.union(v.literal('meeple'), v.literal('mayhem'), v.literal('split'))
const circuitGameChoice = v.union(v.literal('flip-7'), v.literal('magical-athlete'))
const gamePointValues: Record<string, number> = {
  geoguessr: 3,
  wordle: 3,
  connections: 3,
  jenga: 1,
  blokus: 2,
  'mario-strikers-gc': 2,
  'flip-7': 2,
  'magical-athlete': 2,
  'table-choice': 2,
}
const defaultPlayers: Doc<'sharedGameNights'>['players'] = initialRoster.map(player => ({ ...player, points: 0, checkedIn: false }))

const defaultPodAssignments: Doc<'sharedGameNights'>['podAssignments'] = {}
const lockedCircuitFourAssignments: Record<string, 'A' | 'B' | 'C' | 'D'> = Object.fromEntries(
  initialRoster
    .filter(player => player.name in circuitFourLockedAssignments)
    .map(player => [String(player.id), circuitFourLockedAssignments[player.name as keyof typeof circuitFourLockedAssignments]]),
)

const initialState = (eventKey: string) => ({
  eventKey,
  scores: { meeple: 0, mayhem: 0 },
  players: defaultPlayers,
  currentEvent: 0,
  phaseScores: {},
  individualPhaseScores: {},
  podAssignments: defaultPodAssignments,
  circuitResults: {},
  circuitGameChoices: {},
  circuitFourAssignments: lockedCircuitFourAssignments,
  gameWinners: {},
  dinnerOrder: '',
  updatedAt: Date.now(),
})

const cleanEventKey = (eventKey: string) => {
  const key = eventKey.trim().toLowerCase()
  if (!/^[a-z0-9-]{6,64}$/.test(key)) throw new Error('Invalid event key')
  return key
}

const getState = async (ctx: MutationCtx, eventKey: string): Promise<Doc<'sharedGameNights'>> => {
  const key = cleanEventKey(eventKey)
  const state = await ctx.db.query('sharedGameNights').withIndex('by_event_key', q => q.eq('eventKey', key)).unique()
  if (!state) throw new Error('Game night is not initialized')
  return state
}

const clampPoints = (value: number) => Math.max(0, Math.min(9999, value))

export const get = query({
  args: { eventKey: v.string() },
  handler: async (ctx, { eventKey }) => {
    const key = cleanEventKey(eventKey)
    const state = await ctx.db.query('sharedGameNights').withIndex('by_event_key', q => q.eq('eventKey', key)).unique()
    if (!state) return null
    return { ...state, players: state.players.map(({ claimToken: _claimToken, ...player }) => player) }
  },
})

export const ensure = mutation({
  args: { eventKey: v.string() },
  handler: async (ctx, { eventKey }) => {
    const key = cleanEventKey(eventKey)
    const existing = await ctx.db.query('sharedGameNights').withIndex('by_event_key', q => q.eq('eventKey', key)).unique()
    return existing?._id ?? await ctx.db.insert('sharedGameNights', initialState(key))
  },
})

export const adjustTeamScore = mutation({
  args: { eventKey: v.string(), team: teamSlug, delta: v.number() },
  handler: async (ctx, { eventKey, team, delta }) => {
    if (!Number.isInteger(delta) || Math.abs(delta) > 100) throw new Error('Invalid score change')
    const state = await getState(ctx, eventKey)
    await ctx.db.patch(state._id, { scores: { ...state.scores, [team]: clampPoints(state.scores[team] + delta) }, updatedAt: Date.now() })
  },
})

export const adjustPlayerScore = mutation({
  args: { eventKey: v.string(), playerId: v.number(), delta: v.number() },
  handler: async (ctx, { eventKey, playerId, delta }) => {
    if (!Number.isInteger(delta) || Math.abs(delta) > 25) throw new Error('Invalid player score change')
    const state = await getState(ctx, eventKey)
    const players = state.players.map(player => player.id === playerId ? { ...player, points: clampPoints(player.points + delta) } : player)
    await ctx.db.patch(state._id, { players, updatedAt: Date.now() })
  },
})

export const setCurrentEvent = mutation({
  args: { eventKey: v.string(), currentEvent: v.number() },
  handler: async (ctx, { eventKey, currentEvent }) => {
    if (!Number.isInteger(currentEvent) || currentEvent < 0 || currentEvent > 9) throw new Error('Invalid phase')
    const state = await getState(ctx, eventKey)
    await ctx.db.patch(state._id, { currentEvent, updatedAt: Date.now() })
  },
})

export const adjustPhaseScore = mutation({
  args: { eventKey: v.string(), phase: v.number(), team: teamSlug, delta: v.number() },
  handler: async (ctx, { eventKey, phase, team, delta }) => {
    if (!Number.isInteger(phase) || phase < 0 || phase > 9 || !Number.isInteger(delta) || Math.abs(delta) > 100) throw new Error('Invalid phase score change')
    const state = await getState(ctx, eventKey)
    const key = String(phase)
    const current = state.phaseScores[key] ?? { meeple: 0, mayhem: 0 }
    const next = clampPoints(current[team] + delta)
    const applied = next - current[team]
    await ctx.db.patch(state._id, {
      phaseScores: { ...state.phaseScores, [key]: { ...current, [team]: next } },
      scores: { ...state.scores, [team]: clampPoints(state.scores[team] + applied) },
      updatedAt: Date.now(),
    })
  },
})

export const adjustIndividualPhaseScore = mutation({
  args: { eventKey: v.string(), phase: v.number(), playerId: v.number(), delta: v.number() },
  handler: async (ctx, { eventKey, phase, playerId, delta }) => {
    if (!Number.isInteger(phase) || phase < 0 || phase > 9 || !Number.isInteger(delta) || Math.abs(delta) > 25) throw new Error('Invalid individual score change')
    const state = await getState(ctx, eventKey)
    const phaseKey = String(phase)
    const playerKey = String(playerId)
    const currentPhase = state.individualPhaseScores[phaseKey] ?? {}
    const current = currentPhase[playerKey] ?? 0
    const next = clampPoints(current + delta)
    const applied = next - current
    const players = state.players.map(player => player.id === playerId ? { ...player, points: clampPoints(player.points + applied) } : player)
    await ctx.db.patch(state._id, {
      individualPhaseScores: { ...state.individualPhaseScores, [phaseKey]: { ...currentPhase, [playerKey]: next } },
      players,
      updatedAt: Date.now(),
    })
  },
})

export const setPlayerTeam = mutation({
  args: { eventKey: v.string(), playerId: v.number(), team: teamSlug },
  handler: async (ctx, { eventKey, playerId, team }) => {
    const rosterPlayer = initialRoster.find(player => player.id === playerId)
    if (!rosterPlayer || rosterPlayer.team !== team) throw new Error('Teams are locked for this event')
    const state = await getState(ctx, eventKey)
    const players = state.players.map(player => player.id === playerId ? { ...player, team } : player)
    await ctx.db.patch(state._id, { players, updatedAt: Date.now() })
  },
})

export const setPlayerPod = mutation({
  args: { eventKey: v.string(), playerId: v.number(), pod },
  handler: async (ctx, { eventKey, playerId, pod }) => {
    const state = await getState(ctx, eventKey)
    await ctx.db.patch(state._id, { podAssignments: { ...state.podAssignments, [String(playerId)]: pod }, updatedAt: Date.now() })
  },
})

export const setPods = mutation({
  args: { eventKey: v.string(), assignments: v.array(v.object({ playerId: v.number(), pod })) },
  handler: async (ctx, { eventKey, assignments }) => {
    const state = await getState(ctx, eventKey)
    const podAssignments = { ...state.podAssignments }
    for (const assignment of assignments) podAssignments[String(assignment.playerId)] = assignment.pod
    await ctx.db.patch(state._id, { podAssignments, updatedAt: Date.now() })
  },
})

export const recordCircuitResult = mutation({
  args: { eventKey: v.string(), phase: v.number(), slug: v.string(), result: v.optional(circuitResult) },
  handler: async (ctx, { eventKey, phase, slug, result }) => {
    if (!Number.isInteger(phase) || phase < 0 || phase > 9 || !/^[a-z0-9-]{2,64}$/.test(slug)) throw new Error('Invalid circuit result')
    const state = await getState(ctx, eventKey)
    const key = `${phase}:${slug}`
    const allocation = (value?: 'meeple' | 'mayhem' | 'split') => value === 'meeple' ? { meeple: 2, mayhem: 0 } : value === 'mayhem' ? { meeple: 0, mayhem: 2 } : value === 'split' ? { meeple: 1, mayhem: 1 } : { meeple: 0, mayhem: 0 }
    const before = allocation(state.circuitResults[key])
    const after = allocation(result)
    const delta = { meeple: after.meeple - before.meeple, mayhem: after.mayhem - before.mayhem }
    const phaseKey = String(phase)
    const phaseTotal = state.phaseScores[phaseKey] ?? { meeple: 0, mayhem: 0 }
    const circuitResults = { ...state.circuitResults }
    if (result) circuitResults[key] = result
    else delete circuitResults[key]
    await ctx.db.patch(state._id, {
      circuitResults,
      phaseScores: { ...state.phaseScores, [phaseKey]: { meeple: clampPoints(phaseTotal.meeple + delta.meeple), mayhem: clampPoints(phaseTotal.mayhem + delta.mayhem) } },
      scores: { meeple: clampPoints(state.scores.meeple + delta.meeple), mayhem: clampPoints(state.scores.mayhem + delta.mayhem) },
      updatedAt: Date.now(),
    })
  },
})

export const setCircuitGameChoice = mutation({
  args: { eventKey: v.string(), round: v.number(), choice: circuitGameChoice },
  handler: async (ctx, { eventKey, round, choice }) => {
    if (!Number.isInteger(round) || round < 1 || round > 4) throw new Error('Invalid circuit round')
    const state = await getState(ctx, eventKey)
    await ctx.db.patch(state._id, {
      circuitGameChoices: { ...(state.circuitGameChoices ?? {}), [String(round)]: choice },
      updatedAt: Date.now(),
    })
    return null
  },
})

export const setCircuitFourAssignment = mutation({
  args: { eventKey: v.string(), playerId: v.number(), pod: v.optional(pod) },
  handler: async (ctx, { eventKey, playerId, pod }) => {
    const state = await getState(ctx, eventKey)
    const player = state.players.find(item => item.id === playerId)
    if (!player) throw new Error('Choose a player from tonight’s roster')

    const lockedPod = lockedCircuitFourAssignments[String(playerId)]
    if (lockedPod && lockedPod !== pod) throw new Error(`${player.name} is locked into the game they still need to rotate through`)

    const assignments = { ...lockedCircuitFourAssignments, ...(state.circuitFourAssignments ?? {}) }
    if (pod) assignments[String(playerId)] = pod
    else delete assignments[String(playerId)]
    const teamCount = pod ? state.players.filter(item => item.team === player.team && assignments[String(item.id)] === pod).length : 0
    if (pod && teamCount > circuitFourTeamCapacities[pod]) throw new Error('That team already filled every slot at this station')

    await ctx.db.patch(state._id, { circuitFourAssignments: assignments, updatedAt: Date.now() })
    return null
  },
})

export const recordGameWinner = mutation({
  args: { eventKey: v.string(), winnerKey: v.string(), playerId: v.optional(v.number()) },
  handler: async (ctx, { eventKey, winnerKey, playerId }) => {
    if (!/^[a-z0-9-]{2,64}:[a-z0-9-]{1,64}$/.test(winnerKey)) throw new Error('Invalid game winner key')
    const gameSlug = winnerKey.slice(0, winnerKey.indexOf(':'))
    const points = gamePointValues[gameSlug]
    if (!points) throw new Error('That game is not part of tonight’s scoring')

    const state = await getState(ctx, eventKey)
    const gameWinners = { ...(state.gameWinners ?? {}) }
    const previousPlayerId = gameWinners[winnerKey]
    const previousPlayer = state.players.find(player => player.id === previousPlayerId)
    const nextPlayer = playerId === undefined ? undefined : state.players.find(player => player.id === playerId)
    if (playerId !== undefined && !nextPlayer) throw new Error('Choose a player from tonight’s roster')
    if (previousPlayerId === playerId) return null

    if (nextPlayer) gameWinners[winnerKey] = nextPlayer.id
    else delete gameWinners[winnerKey]

    const players = state.players.map(player => {
      const delta = (player.id === nextPlayer?.id ? points : 0) - (player.id === previousPlayer?.id ? points : 0)
      return delta ? { ...player, points: clampPoints(player.points + delta) } : player
    })
    const scoreDelta = { meeple: 0, mayhem: 0 }
    if (previousPlayer) scoreDelta[previousPlayer.team] -= points
    if (nextPlayer) scoreDelta[nextPlayer.team] += points

    await ctx.db.patch(state._id, {
      gameWinners,
      players,
      scores: {
        meeple: clampPoints(state.scores.meeple + scoreDelta.meeple),
        mayhem: clampPoints(state.scores.mayhem + scoreDelta.mayhem),
      },
      updatedAt: Date.now(),
    })
    return null
  },
})

export const resetPuzzleRound = mutation({
  args: { eventKey: v.string(), playerId: v.number(), claimToken: v.string(), game: puzzleGame, puzzleId: v.string() },
  handler: async (ctx, { eventKey, playerId, claimToken, game, puzzleId }) => {
    if (!Number.isInteger(playerId) || playerId < 1 || !/^[a-zA-Z0-9-]{16,128}$/.test(claimToken)) throw new Error('Invalid player claim')
    const match = game === 'wordle' ? puzzleId.match(/^wordle-pool-v1-([1-5])$/) : puzzleId.match(/^connections-nyc-([1-3])$/)
    if (!match) throw new Error('Choose a valid puzzle round')
    const state = await getState(ctx, eventKey)
    const willy = state.players.find(player => player.id === playerId && player.name === 'Willy')
    if (!willy?.checkedIn || willy.claimToken !== claimToken) throw new Error('Only the claimed Willy profile can reset puzzle rounds')

    const gameWinners = { ...(state.gameWinners ?? {}) }
    const winnerKey = `${game}:${match[1]}`
    const winner = state.players.find(player => player.id === gameWinners[winnerKey])
    delete gameWinners[winnerKey]
    const puzzleResults = await ctx.db.query('puzzleResults')
      .withIndex('by_event_key_and_game_and_puzzle_id', q => q.eq('eventKey', state.eventKey).eq('game', game).eq('puzzleId', puzzleId))
      .take(20)
    for (const result of puzzleResults) await ctx.db.delete('puzzleResults', result._id)

    await ctx.db.patch(state._id, {
      gameWinners,
      players: state.players.map(player => player.id === winner?.id ? { ...player, points: clampPoints(player.points - 3) } : player),
      scores: {
        meeple: clampPoints(state.scores.meeple - (winner?.team === 'meeple' ? 3 : 0)),
        mayhem: clampPoints(state.scores.mayhem - (winner?.team === 'mayhem' ? 3 : 0)),
      },
      updatedAt: Date.now(),
    })
    return { clearedPuzzleResults: puzzleResults.length }
  },
})

export const setDinnerOrder = mutation({
  args: { eventKey: v.string(), dinnerOrder: v.string() },
  handler: async (ctx, { eventKey, dinnerOrder }) => {
    const state = await getState(ctx, eventKey)
    await ctx.db.patch(state._id, { dinnerOrder: dinnerOrder.slice(0, 2000), updatedAt: Date.now() })
  },
})

export const addPlayer = mutation({
  args: { eventKey: v.string(), name: v.string() },
  handler: async (ctx, { eventKey, name }) => {
    const cleanName = name.trim().replace(/\s+/g, ' ').slice(0, 40)
    if (!cleanName) throw new Error('Player name is required')
    throw new Error(`${cleanName} is not on the locked event roster`)
  },
})

export const joinPlayer = mutation({
  args: { eventKey: v.string(), playerId: v.number(), claimToken: v.string() },
  handler: async (ctx, { eventKey, playerId, claimToken }) => {
    if (!Number.isInteger(playerId) || playerId < 1) throw new Error('Choose your name from the roster')
    if (!/^[a-zA-Z0-9-]{16,128}$/.test(claimToken)) throw new Error('Invalid player claim')
    const state = await getState(ctx, eventKey)
    const existing = state.players.find(player => player.id === playerId)
    if (!existing) throw new Error('That player is not on this game-night roster')
    if (existing.checkedIn && existing.claimToken !== claimToken) throw new Error(`${existing.name} is already claimed on another device`)
    const players = state.players.map(player => player.id === existing.id ? { ...player, checkedIn: true, claimToken } : player)
    await ctx.db.patch(state._id, { players, updatedAt: Date.now() })
    return existing.id
  },
})

export const releasePlayer = mutation({
  args: { eventKey: v.string(), playerId: v.number() },
  handler: async (ctx, { eventKey, playerId }) => {
    const state = await getState(ctx, eventKey)
    const players = state.players.map(player => {
      if (player.id !== playerId) return player
      return { id: player.id, name: player.name, team: player.team, points: player.points, checkedIn: false }
    })
    await ctx.db.patch(state._id, { players, updatedAt: Date.now() })
  },
})

export const toggleCheckIn = mutation({
  args: { eventKey: v.string(), playerId: v.number() },
  handler: async (ctx, { eventKey, playerId }) => {
    const state = await getState(ctx, eventKey)
    const target = state.players.find(player => player.id === playerId)
    if (!target?.checkedIn) throw new Error('Players check in by claiming their roster name')
    const players = state.players.map(player => player.id === playerId ? { id: player.id, name: player.name, team: player.team, points: player.points, checkedIn: false } : player)
    await ctx.db.patch(state._id, { players, updatedAt: Date.now() })
  },
})

export const removePlayer = mutation({
  args: { eventKey: v.string(), playerId: v.number() },
  handler: async (ctx, { eventKey, playerId }) => {
    const state = await getState(ctx, eventKey)
    const players = state.players.map(player => player.id === playerId ? { id: player.id, name: player.name, team: player.team, points: player.points, checkedIn: false } : player)
    await ctx.db.patch(state._id, { players, updatedAt: Date.now() })
  },
})

export const setTeamAssignments = mutation({
  args: { eventKey: v.string(), assignments: v.array(v.object({ playerId: v.number(), team: teamSlug })) },
  handler: async (ctx, { eventKey, assignments }) => {
    for (const assignment of assignments) {
      const rosterPlayer = initialRoster.find(player => player.id === assignment.playerId)
      if (!rosterPlayer || rosterPlayer.team !== assignment.team) throw new Error('Teams are locked for this event')
    }
    const state = await getState(ctx, eventKey)
    const byId = new Map(assignments.map(assignment => [assignment.playerId, assignment.team]))
    const players = state.players.map(player => ({ ...player, team: byId.get(player.id) ?? player.team }))
    await ctx.db.patch(state._id, { players, updatedAt: Date.now() })
  },
})

export const reset = mutation({
  args: { eventKey: v.string() },
  handler: async (ctx, { eventKey }) => {
    const state = await getState(ctx, eventKey)
    const fresh = initialState(state.eventKey)
    const puzzleResults = await ctx.db.query('puzzleResults').withIndex('by_event_key', q => q.eq('eventKey', state.eventKey)).take(100)
    for (const result of puzzleResults) await ctx.db.delete('puzzleResults', result._id)
    await ctx.db.patch(state._id, fresh)
  },
})
