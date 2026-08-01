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

Run from the repo root; all are idempotent.

```sh
node scripts/build-llms-full.mjs      # regenerate the full-text corpus
node scripts/build-json-exports.mjs   # diagnostics/decisions/anti-patterns/glossary JSON
node scripts/build-situations.mjs     # regenerate /situations/ (also link-checks routes)
node scripts/check-routes.mjs         # diagnostic result → playbook routes
node scripts/check-drafts.mjs         # no page publishes with placeholder text
```

### Generators overwrite — put sitewide edits in the generator

`build-situations.mjs` **rewrites its pages from scratch**. Any sitewide edit
applied afterwards — a link added to every `also-strip`, a step marker stamped
by `build-step-nav.mjs` — is silently reverted the next time it runs. This has
now happened three times, twice unnoticed until a live check.

The rule: if a sitewide change must survive, it goes **into the generator**, not
just into the output. `build-situations.mjs` therefore emits the step marker and
the full `also-strip` itself, and the two generators are safe to run in either
order. To confirm that after touching either:

```sh
node scripts/build-step-nav.mjs   >/dev/null && node scripts/build-situations.mjs >/dev/null
grep -l 'STEP-NAV' situations/*/index.html | wc -l   # expect 4
node scripts/build-situations.mjs >/dev/null && node scripts/build-step-nav.mjs  >/dev/null
grep -l 'STEP-NAV' situations/*/index.html | wc -l   # expect 4
```
