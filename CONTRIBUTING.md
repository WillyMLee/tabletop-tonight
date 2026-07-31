# Contributing

Thanks for helping improve Tabletop Tonight.

## Development

1. Fork the repository and create a focused branch.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local`, or develop without Convex in local-only mode.
4. Make the smallest change that solves the problem.
5. Run `npm run verify:puzzles` and `npm run check`.
6. Open a pull request describing the user-facing impact and how it was tested.

## Project conventions

- Keep the four-view guest flow simple: Start, Group Games, Circuit, and Scores.
- Put reusable game content in `src/data` rather than duplicating it in components.
- Keep detailed instructions behind progressive disclosure.
- Preserve keyboard support, accessible labels, and responsive layouts.
- Never commit `.env.local`, deployment keys, guest data, or other secrets.
- Read `convex/_generated/ai/guidelines.md` before changing Convex functions.

Bug reports should include the page, device/browser, expected behavior, and reproduction steps. Please do not include real guest names or event keys.
