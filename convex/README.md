# Convex backend

`sharedState.ts` is the active party-night API. It stores the compact live event document used by the React app and exposes validated, atomic mutations for scoring, players, phases, pods, circuit outcomes, and dinner notes. The existing normalized tables remain available for a future multi-event product and audit history.

To connect a deployment:

1. Run `npm run convex:dev` and choose local development or a Convex cloud project.
2. Convex will generate `convex/_generated` and write the deployment variables to `.env.local`.
3. Set a long, unique `VITE_GAME_NIGHT_KEY` for the event.
4. The first connected client initializes the shared document; later clients subscribe to it automatically.

Until `VITE_CONVEX_URL` exists, the frontend intentionally uses browser-local demo state. This party build treats the event key as a shared edit capability. Add identity-based roles before making events public or storing sensitive data.
