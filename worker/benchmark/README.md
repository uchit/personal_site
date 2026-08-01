# Benchmark worker

Ingests opt-in diagnostic results and serves the aggregate distribution.

## Why it stores no records

There is no submissions table. Every write is an `UPSERT` against a counter, so
what exists on disk is tallies and nothing else — there is no row that
represents a person, and therefore nothing to leak or re-identify. No IP, user
agent, referrer or cookie is read or persisted.

The honest cost: results cannot be de-duplicated or withdrawn, because there is
nothing to withdraw. For a maturity distribution that trade is fine.

## Deploy

```sh
cd worker/benchmark
npx wrangler d1 create hellouchit-benchmark      # paste the id into wrangler.toml
npx wrangler d1 execute hellouchit-benchmark --remote --file=schema.sql
npx wrangler deploy
```

Then map a route so the browser talks to the same origin and no CSP exception
is needed:

```sh
npx wrangler deploy --route 'hellouchit.com/v1/*'
```

## Endpoints

- `POST /v1/submit` — `{diagnostic, sector, levels:[1..5]}`. Validates shape and
  capability count against a hard-coded table, then increments counters.
- `GET  /v1/stats` — aggregate distribution, CC BY 4.0. Withholds any diagnostic
  with fewer than 25 runs, because a distribution over four responses is noise
  presented as evidence.
