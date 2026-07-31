import { mutation, query, type MutationCtx } from './_generated/server'
import { v } from 'convex/values'

const game = v.union(v.literal('wordle'), v.literal('connections'))

const cleanEventKey = (eventKey: string) => {
  const key = eventKey.trim().toLowerCase()
  if (!/^[a-z0-9-]{6,64}$/.test(key)) throw new Error('Invalid event key')
  return key
}

const cleanPuzzleId = (puzzleId: string) => {
  const id = puzzleId.trim().toLowerCase()
  if (!/^[a-z0-9-]{3,64}$/.test(id)) throw new Error('Invalid puzzle ID')
  return id
}

const getNight = async (ctx: MutationCtx, eventKey: string) => {
  const night = await ctx.db.query('sharedGameNights').withIndex('by_event_key', q => q.eq('eventKey', eventKey)).unique()
  if (!night) throw new Error('Game night is not initialized')
  return night
}

export const list = query({
  args: { eventKey: v.string() },
  handler: async (ctx, { eventKey }) => {
    const key = cleanEventKey(eventKey)
    return await ctx.db.query('puzzleResults').withIndex('by_event_key', q => q.eq('eventKey', key)).take(100)
  },
})

export const submit = mutation({
  args: { eventKey: v.string(), playerId: v.number(), game, puzzleId: v.string(), metric: v.number() },
  handler: async (ctx, args) => {
    const eventKey = cleanEventKey(args.eventKey)
    const puzzleId = cleanPuzzleId(args.puzzleId)
    if (!Number.isInteger(args.playerId) || args.playerId < 1) throw new Error('Invalid player')
    if (!Number.isInteger(args.metric) || (args.game === 'wordle' ? args.metric < 1 || args.metric > 6 : args.metric < 1 || args.metric > 3600)) {
      throw new Error('Invalid puzzle result')
    }
    const night = await getNight(ctx, eventKey)
    const player = night.players.find(item => item.id === args.playerId && item.checkedIn)
    if (!player) throw new Error('Join the game night before submitting a result')
    const existing = await ctx.db.query('puzzleResults')
      .withIndex('by_event_key_and_game_and_puzzle_id_and_player_id', q => q.eq('eventKey', eventKey).eq('game', args.game).eq('puzzleId', puzzleId).eq('playerId', args.playerId))
      .unique()
    const value = {
      playerName: player.name,
      team: player.team,
      metric: existing ? Math.min(existing.metric, args.metric) : args.metric,
      updatedAt: Date.now(),
    }
    if (existing) {
      await ctx.db.patch(existing._id, value)
      return existing._id
    }
    return await ctx.db.insert('puzzleResults', { eventKey, playerId: player.id, game: args.game, puzzleId, ...value })
  },
})
