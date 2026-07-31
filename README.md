# Tabletop Tonight

A mobile-first, Pac-Man-inspired game-night planner and live scoreboard for a 10–14 person party.

## What is included

- Live two-team scorekeeping and an individual leaderboard
- No-account guest check-in: enter a name, choose a ghost team, and join the shared roster
- A ten-phase run of show from check-in through the optional Secret Hitler finale
- Full-group GeoGuessr instructions for 3–5 shared rounds
- Three configurable circuit rounds with random, player-choice, and rival-choice assignments
- Three-pod assignments that can be randomized or changed player by player
- A 16-game library with setup, how-to-play, scoring, and host guidance
- Shared-screen Wordle and Connections games that award team points
- Editable attendance, team moves, check-in controls, and team shuffling
- Responsive desktop and phone layouts with persistent mobile navigation
- Cloudflare Workers Static Assets configuration, SPA fallback, caching, and security headers
- Convex subscriptions and atomic mutations for synchronized scores, teams, phases, pods, and dinner notes
- Optimistic score updates for instant feedback on the device making the change

## Run locally

```powershell
npm install
npm run dev
```

Open the local URL printed by Vite. Use `npm run build` to create the production bundle in `dist`.

Run `npm run check` before publishing to type-check the Convex backend and build the frontend together.

## Data model

When `VITE_CONVEX_URL` is configured, every screen subscribes to one shared game-night document in Convex. Score changes and circuit results update atomically, and common score controls use optimistic updates for immediate local feedback. Convex then pushes the committed state to every connected device.

Without `VITE_CONVEX_URL`, the app intentionally falls back to browser-local persistence so frontend development is not blocked. The header identifies the active mode as `LIVE SYNC`, `CONNECTING`, or local device storage.

`VITE_GAME_NIGHT_KEY` selects the shared event. Treat it as an invite-link capability: use a long, unique value and share the deployed URL only with guests. This party build intentionally has no account flow: guests with the link can join by name, select a team, and update the night. Add identity-based host roles before using the same model for public or sensitive events.

## Recommended hosting: Cloudflare Workers

Cloudflare is the best fit for this version: the site is a Vite SPA, the checked-in `wrangler.jsonc` already provides route fallback, and static-asset requests are free and unlimited. Convex provides the live transactional state while Cloudflare serves the application shell and assets.

### GitHub-connected deployment

1. Create a GitHub repository and push this project to it.
2. In Cloudflare, open **Workers & Pages**, choose **Create application**, then **Import a repository**.
3. Authorize the GitHub account, select the repository, and keep the Worker name as `tabletop-tonight` so it matches `wrangler.jsonc`.
4. Use `npm run build` as the build command and `npx wrangler deploy` as the deploy command.
5. Deploy to the generated `workers.dev` address. Add a custom domain later if desired.

Cloudflare will build and deploy again whenever the production branch is pushed. A local one-off deployment is also available after Wrangler authentication:

```powershell
npm run deploy
```

## Convex production step

Create or select a project with `npm run convex:dev`. Use a unique `VITE_GAME_NIGHT_KEY` locally and in the Cloudflare build environment. For production, build through Convex so `VITE_CONVEX_URL` points at the production deployment:

```powershell
npx convex deploy --cmd "npm run build"
```

To deploy both the Convex backend and the resulting frontend from an authenticated workstation:

```powershell
npm run deploy:live
```

Never commit `.env.local` or a Convex deploy key. The public `VITE_CONVEX_URL` is a deployment address, while authorization must still be enforced by the backend functions.
