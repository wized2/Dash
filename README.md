# Endroid Dash

Web tools & games for **Project Endroid** — live at [endroid.pages.dev](https://endroid.pages.dev/).

Brand hub: [endroid.zone.id](https://endroid.zone.id/) ([Endroid](https://github.com/wized2/Endroid) repo).

## Apps (this repo)

Search · Calculator · Base64 · Clock · HTML · License · Maze · We

## Cloudflare Pages Functions

| Path | Method | Purpose |
|------|--------|---------|
| `/api/health` | GET | Service health |
| `/api/uuid` | GET | Random UUID |
| `/api/hash` | POST | SHA-256 of body / `{ "text": "..." }` |

Deploy on Cloudflare Pages with Functions enabled (default for `functions/`).

## Shared UI

`shared/endroid.css` + `shared/endroid.js` — keep in sync with the Endroid hub.
