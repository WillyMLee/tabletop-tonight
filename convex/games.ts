import { query } from './_generated/server'
import { v } from 'convex/values'

export const list = query({
  args: {},
  handler: async ctx => ctx.db.query('games').take(100),
})

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) =>
    ctx.db.query('games').withIndex('by_slug', query => query.eq('slug', slug)).unique(),
})
