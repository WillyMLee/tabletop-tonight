import { defineApp } from 'convex/server'
import { v } from 'convex/values'

export default defineApp({
  env: {
    JESSA_ADMIN_PIN: v.string(),
  },
})
