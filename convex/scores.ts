import { mutation } from './_generated/server'
import { v } from 'convex/values'

export const addTeamPoints = mutation({
  args: {
    eventId: v.id('events'),
    teamId: v.id('teams'),
    playerId: v.optional(v.id('players')),
    activityId: v.optional(v.id('activities')),
    points: v.number(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Host authentication required')

    const [event, team] = await Promise.all([ctx.db.get(args.eventId), ctx.db.get(args.teamId)])
    if (!event || event.hostSubject !== identity.subject) throw new Error('Not authorized for this event')
    if (!team || team.eventId !== event._id) throw new Error('Team does not belong to this event')
    if (!Number.isInteger(args.points) || Math.abs(args.points) > 100) throw new Error('Invalid point value')

    await ctx.db.patch(team._id, { score: Math.max(0, team.score + args.points) })
    if (args.playerId) {
      const player = await ctx.db.get(args.playerId)
      if (!player || player.eventId !== event._id) throw new Error('Player does not belong to this event')
      await ctx.db.patch(player._id, { points: Math.max(0, player.points + args.points) })
    }

    await ctx.db.insert('scoreEvents', {
      eventId: event._id,
      teamId: team._id,
      playerId: args.playerId,
      activityId: args.activityId,
      points: args.points,
      reason: args.reason.trim().slice(0, 160),
      createdAt: Date.now(),
      createdBy: identity.subject,
    })
  },
})
