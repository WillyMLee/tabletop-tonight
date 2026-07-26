import { query } from './_generated/server'
import { v } from 'convex/values'

export const getDashboard = query({
  args: { inviteCode: v.string() },
  handler: async (ctx, { inviteCode }) => {
    const event = await ctx.db
      .query('events')
      .withIndex('by_invite_code', query => query.eq('inviteCode', inviteCode))
      .unique()

    if (!event) return null

    const [teams, players, activities] = await Promise.all([
      ctx.db.query('teams').withIndex('by_event', query => query.eq('eventId', event._id)).take(10),
      ctx.db.query('players').withIndex('by_event', query => query.eq('eventId', event._id)).take(50),
      ctx.db.query('activities').withIndex('by_event_and_order', query => query.eq('eventId', event._id)).take(50),
    ])

    return { event, teams, players, activities }
  },
})
