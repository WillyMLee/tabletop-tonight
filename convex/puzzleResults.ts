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

const winnerKeyForPuzzle = (puzzleGame: 'wordle' | 'connections', puzzleId: string) => {
  const match = puzzleGame === 'wordle' ? puzzleId.match(/^wordle-pool-v1-([1-5])$/) : puzzleId.match(/^connections-nyc-([1-3])$/)
  if (!match) throw new Error('That puzzle is not part of tonight’s lineup')
  return `${puzzleGame}:${match[1]}`
}

const clampPoints = (value: number) => Math.max(0, Math.min(9999, value))

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
  args: { eventKey: v.string(), playerId: v.number(), claimToken: v.string(), game, puzzleId: v.string(), metric: v.number(), completed: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const eventKey = cleanEventKey(args.eventKey)
    const puzzleId = cleanPuzzleId(args.puzzleId)
    const winnerKey = winnerKeyForPuzzle(args.game, puzzleId)
    if (!Number.isInteger(args.playerId) || args.playerId < 1) throw new Error('Invalid player')
    if (!Number.isInteger(args.metric) || (args.game === 'wordle' ? args.metric < 1 || args.metric > 6 : args.metric < 1 || args.metric > 3600)) {
      throw new Error('Invalid puzzle result')
    }
    const night = await getNight(ctx, eventKey)
    const player = night.players.find(item => item.id === args.playerId && item.checkedIn && item.claimToken === args.claimToken)
    if (!player) throw new Error('Join the game night before submitting a result')
    const completed = args.completed !== false
    const existing = await ctx.db.query('puzzleResults')
      .withIndex('by_event_key_and_game_and_puzzle_id_and_player_id', q => q.eq('eventKey', eventKey).eq('game', args.game).eq('puzzleId', puzzleId).eq('playerId', args.playerId))
      .unique()
    const existingCompleted = existing?.completed !== false
    const keepExistingFinish = existing && existingCompleted && !completed
    const nextMetric = keepExistingFinish ? existing.metric : existing && existingCompleted === completed && completed ? Math.min(existing.metric, args.metric) : args.metric
    const nextCompleted = keepExistingFinish ? true : completed
    const resultChanged = !existing || existing.metric !== nextMetric || existing.completed !== nextCompleted
    const value = {
      playerName: player.name,
      team: player.team,
      metric: nextMetric,
      completed: nextCompleted,
      updatedAt: existing && !resultChanged ? existing.updatedAt : Date.now(),
    }
    let resultId
    if (existing) {
      await ctx.db.patch(existing._id, value)
      resultId = existing._id
    } else {
      resultId = await ctx.db.insert('puzzleResults', { eventKey, playerId: player.id, game: args.game, puzzleId, ...value })
    }

    const roundResults = await ctx.db.query('puzzleResults')
      .withIndex('by_event_key_and_game_and_puzzle_id', q => q.eq('eventKey', eventKey).eq('game', args.game).eq('puzzleId', puzzleId))
      .take(100)
    const winner = roundResults
      .filter(result => result.completed !== false)
      .sort((a, b) => a.metric - b.metric || a.updatedAt - b.updatedAt || a.playerName.localeCompare(b.playerName))[0]
    const gameWinners = { ...(night.gameWinners ?? {}) }
    const previousWinner = night.players.find(item => item.id === gameWinners[winnerKey])
    const nextWinner = night.players.find(item => item.id === winner?.playerId)

    if (previousWinner?.id !== nextWinner?.id) {
      if (nextWinner) gameWinners[winnerKey] = nextWinner.id
      else delete gameWinners[winnerKey]
      const points = 3
      const players = night.players.map(item => {
        const delta = (item.id === nextWinner?.id ? points : 0) - (item.id === previousWinner?.id ? points : 0)
        return delta ? { ...item, points: clampPoints(item.points + delta) } : item
      })
      const teamDelta = { meeple: 0, mayhem: 0 }
      if (previousWinner) teamDelta[previousWinner.team] -= points
      if (nextWinner) teamDelta[nextWinner.team] += points
      await ctx.db.patch(night._id, {
        gameWinners,
        players,
        scores: {
          meeple: clampPoints(night.scores.meeple + teamDelta.meeple),
          mayhem: clampPoints(night.scores.mayhem + teamDelta.mayhem),
        },
        updatedAt: Date.now(),
      })
    }
    return resultId
  },
})
