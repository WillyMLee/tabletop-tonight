# Security policy

## Supported version

Security fixes are applied to the latest commit on the default branch.

## Important deployment model

Tabletop Tonight intentionally uses a no-password, trusted-invite model for private social events. `VITE_GAME_NIGHT_KEY` separates one event from another, but values prefixed with `VITE_` are public in the browser bundle and are not authentication secrets.

Guests can claim only a pre-listed name. Convex issues that device a private capability and rejects a second claim or puzzle submission for the same player; the capability is removed from public roster queries. Anyone who can open the deployment can still use host scoring and claim-release controls, so do not use this architecture for sensitive data, public competitions, paid events, or untrusted audiences without authenticated host roles and server-side authorization.

Use fictional or first-name-only guest data. Never store contact details, private notes, or payment information in this app.

## Reporting a vulnerability

Please report vulnerabilities privately through GitHub's **Security → Report a vulnerability** flow. Do not open a public issue containing exploit details, live event keys, or personal data.
