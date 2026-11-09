# Deploying hellouchit.com

## The path

`git push origin main` → GitHub Pages builds → Cloudflare proxies. Live in
roughly 30–60 seconds.

## Cloudflare caches your assets for four hours

This is the one that will waste an afternoon if you don't know it.

Cloudflare edge-caches static assets (`.js`, `.css`, images) with
`cache-control: max-age=14400`. **A push does not invalidate that cache.** For up
to four hours after a deploy, visitors — and you — keep getting the old file,
while the HTML that references it is already new.

It is deceptive in a specific way: `curl` with a cache-busting query string
(`?cb=123`) fetches a *different* URL, so it misses the cache and returns the new
file. You conclude the deploy worked. The browser requests the plain URL and gets
the stale one.

```sh
# Lies to you — different URL, so it bypasses the edge cache
curl -s https://hellouchit.com/css/site.css?cb=$RANDOM | grep something

# Tells the truth
curl -sI https://hellouchit.com/css/site.css | grep -i 'cf-cache-status\|age'
#   cf-cache-status: HIT
#   age: 445            ← being served from cache, 445s old
```

This cost real debugging time once already. A rewritten JS file was live on the
origin and confirmed by `curl`, while the browser kept executing the previous
version and throwing errors that could only come from code that no longer
existed. (That file has since been removed, but the trap is general — it applies
to every JS and CSS change.)

### After any deploy that changes JS or CSS

Cloudflare dashboard → **Caching → Configuration → Custom Purge → URL**, and list
the changed files plus the pages that reference them:

```
https://hellouchit.com/
https://hellouchit.com/index.html
https://hellouchit.com/css/site.css
https://hellouchit.com/js/enhance.js
```

Purge Everything works too and is harmless on a site this size — it just
repopulates from the origin.

Verify with `cf-cache-status: MISS` on the next request, then `HIT` after.

## Verifying a deploy properly

```sh
# 1. Is the new content on the origin at all?
curl -s "https://hellouchit.com/path?cb=$RANDOM" | grep 'something new'

# 2. Is the edge serving it, or a cached copy?
curl -sI https://hellouchit.com/path | grep -i 'cf-cache-status\|age\|last-modified'

# 3. Does the browser agree? Hard-reload; if it disagrees with (1), it's cache.
```

## Security headers are not in this repo

`vercel.json` is inert — the site is on GitHub Pages, which has no custom-header
support. The live headers come from a Cloudflare Transform Rule. See
[security-headers.md](./security-headers.md). Change both together or they drift.

## Contact

Email only — `contact@hellouchit.com`, plus the LinkedIn and profile-PDF icons in
the contact section. There is deliberately no form.

A Web3Forms form was built and then removed. If it is ever reconsidered, the
constraints that made it awkward are worth knowing up front:

- **No CORS headers.** An in-page `fetch()` fails every time regardless of key
  validity, so submission has to be a native POST that navigates away.
- **Server-side submissions are refused** on the free plan and the endpoint sits
  behind bot protection, so it cannot be smoke-tested with `curl` or an
  automated browser. The only real test is a human clicking Send.
- **Their honeypot is fragile.** An off-screen (`left:-9999px`) `botcheck`
  checkbox is a real, fillable control and password managers tick it, which
  fails their honeypot check on a legitimate submission. It needs inline
  `display:none`.

## Build scripts

Run from the repo root. No npm dependencies; Node 22+.

```sh
node scripts/build-mcp-data.mjs    # readiness JSON, MCP data, static question list (run first)
node scripts/check-mcp.mjs         # exercises the Worker's /v1/mcp handler locally
node scripts/build-agents.mjs      # /agents/ body from dataset/dataset.json -> src/pages/agents/
node scripts/build-site.mjs        # wraps every src/pages/**/*.html in the shared shell, writes sitemap.xml
node scripts/build-redirects.mjs   # redirect pages for retired URLs (only when RETIRED changes)
node scripts/check-drafts.mjs      # no page publishes with placeholder text
node scripts/check-structure.mjs   # no duplicated page skeletons
node scripts/check-links.mjs       # every internal href/src resolves
```

**Edit pages in `src/pages/`, never the built HTML.** `build-site.mjs`
overwrites the output. The header, footer and `<head>` exist once, in
`build-site.mjs`, so the nav can't drift between pages.

Local CSS and JS are linked with a content hash (`main.css?v=1a2b3c4d`), so
a changed file is a new URL and the Cloudflare cache problem above doesn't
apply to them any more. HTML pages still need a purge after a deploy.

Any element with `class="ph"` or `class="ph-block"` is a placeholder for
content the author still has to supply. `build-site.mjs` marks such a page
`noindex` automatically and leaves it out of the sitemap; `check-drafts.mjs`
fails CI if a page with placeholders isn't `noindex`. What each placeholder
needs is listed in `docs/handoff.md`.

## November 2026 rebuild

The site was cut from about 90 pages to 8: home, work, three case studies,
about, the ten agent controls and the agent readiness check. Everything else
(diagnostics, decision trees, playbooks, maturity tiers, reference
architectures, teardowns, sector pages, dataset views, writing, Ask, search)
is retired. Each retired URL is a small redirect page made by
`scripts/build-redirects.mjs`, because GitHub Pages can't send a real 301.
The full content of every retired page is in git history on `main` before the
rebuild. The design rules are in `design-notes.md`.

## The Worker (hellouchit.com/v1/*)

`worker/site/` deploys separately from the static site. GitHub Pages does not
deploy it; a merge to `main` changes nothing in Cloudflare until you run:

```sh
cd worker/site
npx wrangler deploy            # existing route hellouchit.com/v1/* stays attached
```

It serves `/v1/submit` and `/v1/stats` (benchmark tallies) and `/v1/mcp`, a
read-only MCP server for AI assistants. Rebuild its data with
`node scripts/build-mcp-data.mjs` first, then `node scripts/check-mcp.mjs`.

Recommended once in the Cloudflare dashboard: a rate-limiting rule on
`/v1/mcp` (for example 60 requests per minute per IP). The old chat lived on
`hellouchit.com/v2/*`; that route and the `RATE_LIMIT` KV namespace can be
deleted.

## Social images

Each page's preview image lives in `images/og/` and is set with `"ogImage"` in
the page header. They are rendered from `scripts/og-template.html` at
1200x630 (open it with `?t=title&f=figure&s=superscript&u=unit&c=caption`, or
`&p=/images/photo.jpg`; parameters are rendered as text only,
and screenshot the viewport). Re-render when a page's headline or number changes.
