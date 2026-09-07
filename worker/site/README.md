# Site worker

hellouchit.com's one backend service: the opt-in diagnostic benchmark
(`/v1/submit`, `/v1/stats`) and the "Ask this site" RAG chat (`/v2/chat`).
Replaces two separately-deployed Workers — `hellouchit-benchmark` and
`hellouchit-chat` — consolidated because one person operating two live
services for a personal site's backend was infra for its own sake, not for
the traffic it actually gets.

## Migrating from the two-Worker setup

This reuses the **same D1 database** and **same KV namespace** the old
Workers already had — nothing about the underlying data changes, only how
many Worker scripts route to it. If you're moving from the two-Worker setup:

```sh
cd worker/site
npx wrangler deploy
npx wrangler deploy --route 'hellouchit.com/v1/*'
npx wrangler deploy --route 'hellouchit.com/v2/*'
```

Then verify both endpoints actually work against `hellouchit-site` (see
"Endpoints" below) **before** deleting the old ones. Once confirmed:

```sh
npx wrangler delete --name hellouchit-benchmark
npx wrangler delete --name hellouchit-chat
```

Deleting a Worker does not touch its bound resources (the D1 database, the
KV namespace) — only the script and its routes. Confirm the new Worker's
routes are live first regardless; a route can only point at one Worker at a
time, so once `hellouchit-site` claims `/v1/*` and `/v2/*`, the old Workers
stop receiving traffic even before you delete them.

## Fresh setup (no prior Workers)

```sh
cd worker/site
npx wrangler d1 create hellouchit-benchmark      # paste the id into wrangler.toml
npx wrangler d1 execute hellouchit-benchmark --remote --file=schema.sql
npx wrangler kv namespace create RATE_LIMIT      # paste the id into wrangler.toml
npx wrangler deploy
npx wrangler deploy --route 'hellouchit.com/v1/*'
npx wrangler deploy --route 'hellouchit.com/v2/*'
```

Workers AI needs no separate provisioning — it's available on every
Cloudflare account, free tier included (10,000 neurons/day).

## Endpoints

- `POST /v1/submit` — `{diagnostic, sector, levels:[1..5]}`. Validates shape
  and capability count against a hard-coded table, then increments D1
  counters. No per-submission record — see the file header for why.
- `GET  /v1/stats` — aggregate distribution, CC BY 4.0. Withholds any
  diagnostic with fewer than 25 runs.
- `POST /v2/chat` — `{messages: [{role, content}]}`. Returns
  `{answer, sources}`. Rate-limited to 20 requests/IP/day via KV. See the
  file header for the retrieval approach (lexical BM25 over the site's own
  prose, not embeddings) and why.

## Why one file, two feature areas

The two features share nothing at the data layer (D1 tallies vs. KV rate-limit
counters vs. Workers AI) and share everything at the routing/ops layer (same
origin, same CORS policy, same deploy target). Splitting them into separate
modules inside `src/` was considered and rejected — at this size (under 400
lines total) the indirection would cost more than it saves; the file is
divided into two clearly-bannered sections instead.
