import { env, query } from './_generated/server'
import { v } from 'convex/values'

export const verify = query({
  args: { eventKey: v.string(), pin: v.string() },
  handler: async (ctx, { eventKey, pin }) => {
    const key = eventKey.trim().toLowerCase()
    if (!/^[a-z0-9-]{6,64}$/.test(key) || pin.length < 8 || pin.length > 64) return false
    const night = await ctx.db.query('sharedGameNights').withIndex('by_event_key', q => q.eq('eventKey', key)).unique()
    return Boolean(night && pin === env.JESSA_ADMIN_PIN)
  },
})
