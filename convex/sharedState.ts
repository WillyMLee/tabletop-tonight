import { mutation, query, type MutationCtx } from './_generated/server'
import type { Doc } from './_generated/dataModel'
import { v } from 'convex/values'

const teamSlug = v.union(v.literal('meeple'), v.literal('mayhem'))
const pod = v.union(v.literal('A'), v.literal('B'), v.literal('C'), v.literal('D'))
const circuitResult = v.union(v.literal('meeple'), v.literal('mayhem'), v.literal('split'))
const pods = ['A', 'B', 'C', 'D'] as const

const defaultPlayers: Doc<'sharedGameNights'>['players'] = []

const defaultPodAssignments: Doc<'sharedGameNights'>['podAssignments'] = {}

const initialState = (eventKey: string) => ({
  eventKey,
  scores: { meeple: 0, mayhem: 0 },
  players: defaultPlayers,
  currentEvent: 0,
  phaseScores: {},
  individualPhaseScores: {},
  podAssignments: defaultPodAssignments,
  circuitResults: {},
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
    return await ctx.db.query('sharedGameNights').withIndex('by_event_key', q => q.eq('eventKey', key)).unique()
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
    const allocation = (value?: 'meeple' | 'mayhem' | 'split') => value === 'meeple' ? { meeple: 10, mayhem: 0 } : value === 'mayhem' ? { meeple: 0, mayhem: 10 } : value === 'split' ? { meeple: 5, mayhem: 5 } : { meeple: 0, mayhem: 0 }
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
    const state = await getState(ctx, eventKey)
    if (state.players.length >= 30) throw new Error('Player limit reached')
    const team = state.players.filter(player => player.team === 'meeple').length <= state.players.filter(player => player.team === 'mayhem').length ? 'meeple' : 'mayhem'
    const id = Math.max(0, ...state.players.map(player => player.id)) + 1
    await ctx.db.patch(state._id, { players: [...state.players, { id, name: cleanName, team, points: 0, checkedIn: true }], podAssignments: { ...state.podAssignments, [String(id)]: pods[(id - 1) % pods.length] }, updatedAt: Date.now() })
  },
})

export const joinPlayer = mutation({
  args: { eventKey: v.string(), name: v.string(), team: teamSlug },
  handler: async (ctx, { eventKey, name, team }) => {
    const cleanName = name.trim().replace(/\s+/g, ' ').slice(0, 40)
    if (!cleanName) throw new Error('Your name is required')
    const state = await getState(ctx, eventKey)
    const existing = state.players.find(player => player.name.toLocaleLowerCase() === cleanName.toLocaleLowerCase())
    if (existing) {
      const players = state.players.map(player => player.id === existing.id ? { ...player, name: cleanName, team, checkedIn: true } : player)
      await ctx.db.patch(state._id, { players, updatedAt: Date.now() })
      return existing.id
    }
    if (state.players.length >= 30) throw new Error('The game-night roster is full')
    const id = Math.max(0, ...state.players.map(player => player.id)) + 1
    await ctx.db.patch(state._id, {
      players: [...state.players, { id, name: cleanName, team, points: 0, checkedIn: true }],
      podAssignments: { ...state.podAssignments, [String(id)]: pods[(id - 1) % pods.length] },
      updatedAt: Date.now(),
    })
    return id
  },
})

export const toggleCheckIn = mutation({
  args: { eventKey: v.string(), playerId: v.number() },
  handler: async (ctx, { eventKey, playerId }) => {
    const state = await getState(ctx, eventKey)
    const players = state.players.map(player => player.id === playerId ? { ...player, checkedIn: !player.checkedIn } : player)
    await ctx.db.patch(state._id, { players, updatedAt: Date.now() })
  },
})

export const removePlayer = mutation({
  args: { eventKey: v.string(), playerId: v.number() },
  handler: async (ctx, { eventKey, playerId }) => {
    const state = await getState(ctx, eventKey)
    const podAssignments = { ...state.podAssignments }
    delete podAssignments[String(playerId)]
    await ctx.db.patch(state._id, { players: state.players.filter(player => player.id !== playerId), podAssignments, updatedAt: Date.now() })
  },
})

export const setTeamAssignments = mutation({
  args: { eventKey: v.string(), assignments: v.array(v.object({ playerId: v.number(), team: teamSlug })) },
  handler: async (ctx, { eventKey, assignments }) => {
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
