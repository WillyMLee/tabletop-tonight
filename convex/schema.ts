import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

const teamSlug = v.union(v.literal('meeple'), v.literal('mayhem'))
const teamScores = v.object({ meeple: v.number(), mayhem: v.number() })
const player = v.object({
  id: v.number(),
  name: v.string(),
  team: teamSlug,
  points: v.number(),
  checkedIn: v.boolean(),
})

export default defineSchema({
  events: defineTable({
    title: v.string(),
    eventDate: v.string(),
    startTime: v.string(),
    inviteCode: v.string(),
    hostSubject: v.string(),
    status: v.union(v.literal('draft'), v.literal('live'), v.literal('complete')),
    currentActivityOrder: v.number(),
    updatedAt: v.number(),
  }).index('by_invite_code', ['inviteCode']),

  teams: defineTable({
    eventId: v.id('events'),
    name: v.string(),
    slug: v.string(),
    color: v.string(),
    score: v.number(),
  }).index('by_event', ['eventId']),

  players: defineTable({
    eventId: v.id('events'),
    teamId: v.optional(v.id('teams')),
    name: v.string(),
    points: v.number(),
    checkedIn: v.boolean(),
    createdAt: v.number(),
  })
    .index('by_event', ['eventId'])
    .index('by_team', ['teamId']),

  games: defineTable({
    slug: v.string(),
    name: v.string(),
    icon: v.string(),
    category: v.string(),
    format: v.string(),
    players: v.string(),
    duration: v.string(),
    difficulty: v.string(),
    summary: v.string(),
    why: v.string(),
    setup: v.array(v.string()),
    rules: v.array(v.string()),
    scoring: v.string(),
    hostTip: v.string(),
    playable: v.optional(v.string()),
  }).index('by_slug', ['slug']),

  activities: defineTable({
    eventId: v.id('events'),
    gameId: v.optional(v.id('games')),
    title: v.string(),
    startTime: v.string(),
    durationMinutes: v.optional(v.number()),
    order: v.number(),
    status: v.union(v.literal('upcoming'), v.literal('live'), v.literal('complete')),
    maxPoints: v.optional(v.number()),
  })
    .index('by_event', ['eventId'])
    .index('by_event_and_order', ['eventId', 'order']),

  scoreEvents: defineTable({
    eventId: v.id('events'),
    teamId: v.id('teams'),
    playerId: v.optional(v.id('players')),
    activityId: v.optional(v.id('activities')),
    points: v.number(),
    reason: v.string(),
    createdAt: v.number(),
    createdBy: v.string(),
  })
    .index('by_event', ['eventId'])
    .index('by_team', ['teamId']),

  sharedGameNights: defineTable({
    eventKey: v.string(),
    scores: teamScores,
    players: v.array(player),
    currentEvent: v.number(),
    phaseScores: v.record(v.string(), teamScores),
    individualPhaseScores: v.record(v.string(), v.record(v.string(), v.number())),
    podAssignments: v.record(v.string(), v.union(v.literal('A'), v.literal('B'), v.literal('C'))),
    circuitResults: v.record(v.string(), v.union(v.literal('meeple'), v.literal('mayhem'), v.literal('split'))),
    dinnerOrder: v.string(),
    updatedAt: v.number(),
  }).index('by_event_key', ['eventKey']),
})
