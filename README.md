# Tabletop Tonight

[![Live demo](https://img.shields.io/badge/demo-live-FFE600?style=for-the-badge&logo=cloudflare&logoColor=111111)](https://tabletop-tonight.willymlee.workers.dev/)
[![CI](https://img.shields.io/github/actions/workflow/status/WillyMLee/tabletop-tonight/ci.yml?style=for-the-badge&label=checks)](https://github.com/WillyMLee/tabletop-tonight/actions)
[![License: MIT](https://img.shields.io/badge/license-MIT-21DDEB?style=for-the-badge)](LICENSE)

A mobile-first, arcade-inspired game-night hub for preset teams, live scoring, party puzzles, head-to-head matches, and exact circuit assignments. Built for a 14-person night, but designed so another host can fork it and make it their own.

**[Open the live app →](https://tabletop-tonight.willymlee.workers.dev/)**

## Why this project exists

Game nights usually split information across a group chat, a notes app, handwritten scores, and one person repeatedly explaining where everyone should go. Tabletop Tonight turns that into four focused views:

- **Start** — claim one pre-listed roster name, see the locked teams, and release mistaken claims.
- **Group Games** — run GeoGuessr, Wordle, Connections, and seven four-minute Jenga matches in a clear order.
- **Circuit** — show exact Blokus, Mario Strikers, and Flip 7 assignments for four rounds.
- **Scores** — separate the team championship from individual standings.

The interface uses progressive disclosure: guests see the next action first, while visual rules and scoring details stay collapsed until needed.

## Highlights

- Real-time multi-device updates through Convex subscriptions
- No-password guest check-in with atomic, one-device-per-name claims
- Two-step claim release to recover from a wrong name or changed device
- Four balanced circuit rounds with exact player assignments
- Atomic winner selection that updates both individual and team scores
- Five Wordle rounds with dictionary validation, keyboard feedback, DNF tracking, and solution reveals
- Three original New York-themed Connections rounds with live solve-time leaderboards
- Responsive, diagram-based game guides for every scheduled activity, including Flip 7 special-card rules
- Optimistic score updates for immediate feedback
- Cloudflare Workers Static Assets deployment with SPA fallback and security headers
- Browser-local fallback when Convex is not configured

## Tech stack

| Layer | Technology | Role |
| --- | --- | --- |
| UI | React 19 + Vite | Responsive single-page application |
| Realtime backend | Convex | Shared roster claims, scores, circuit results, and puzzle leaderboards |
| Hosting | Cloudflare Workers | Global static asset delivery and SPA routing |
| Icons | Lucide React | Accessible interface icons |
| Validation | TypeScript + production build scripts | Backend type checks and deploy verification |

## Quick start

Requirements: Node.js 20+ and npm.

```bash
git clone https://github.com/WillyMLee/tabletop-tonight.git
cd tabletop-tonight
npm install
cp .env.example .env.local
npm run dev
```

Without a `VITE_CONVEX_URL`, the app runs in local-only mode and stores state in the browser. That makes visual customization possible before creating any cloud resources.

## Add live sync

Create or connect a Convex project:

```bash
npm run convex:dev
```

Convex writes the deployment values to `.env.local`. Set a unique event key as well:

```dotenv
VITE_GAME_NIGHT_KEY=my-private-game-night-2026
```

The key is an invite capability, not authentication. Anyone with the deployed app and event key can change the shared night. Use a long, unique value and see [SECURITY.md](SECURITY.md) before adapting this for sensitive or public events.

## Customize your night

- Edit the game catalog and rule text in [`src/data/games.js`](src/data/games.js).
- Replace the Wordle word pool and Connections boards in [`src/data/puzzles.js`](src/data/puzzles.js). Five no-repeat Wordles are deterministically shuffled from the pool using `VITE_GAME_NIGHT_KEY`, so every guest sees the same stable rounds.
- Replace the roster, Jenga pairings, circuit assignments, timeline, scoring rules, and envelope labels in [`convex/eventConfig.ts`](convex/eventConfig.ts).
- Update the group lineup, stations, and rotations near the top of [`src/App.jsx`](src/App.jsx).
- Adjust the Pac-Man-inspired theme in [`src/styles.css`](src/styles.css).
- Change the Worker name and compatibility date in [`wrangler.jsonc`](wrangler.jsonc).

Keep puzzle IDs stable after guests begin playing; changing an ID intentionally creates a fresh leaderboard.

## Quality checks

```bash
npm run verify:puzzles  # validates all puzzle content
npm run check           # Convex TypeScript + production frontend build
npm run verify:join     # optional live guest-flow check
npm run verify:winners  # verifies atomic player + team winner scoring
npm run verify:live -- https://your-deployment.convex.cloud
```

GitHub Actions runs the deterministic checks on every push and pull request.

## Deploy

### Convex + Cloudflare from the command line

Authenticate both CLIs, then run:

```bash
npm run deploy:live
```

This deploys the Convex functions, builds the frontend with the production Convex URL, and publishes the static app through Wrangler.

### Git-connected Cloudflare deployment

1. Fork this repository and connect it in **Cloudflare Workers & Pages**.
2. Use `npm run build` as the build command.
3. Add `VITE_CONVEX_URL` and `VITE_GAME_NIGHT_KEY` as build variables.
4. Deploy with `npx wrangler deploy`.

## Architecture notes

The current party-sized implementation keeps one bounded shared-night document for low-latency subscriptions and atomic score updates. A private device claim is stored in Convex but removed from public roster responses; that same claim is required for puzzle submissions. Puzzle results use a separate indexed table because they grow independently. Larger multi-event products should move roster and scoring entities into dedicated tables with authenticated host roles.

## Project status

This repository is both a working event app and a portfolio project by [William Lee](https://github.com/WillyMLee). Contributions, adaptations, and ideas are welcome—see [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE) — use it, remix it, and host your own game night.
