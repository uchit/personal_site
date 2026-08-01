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
curl -s https://hellouchit.com/js/contact.js?cb=$RANDOM | grep something

# Tells the truth
curl -sI https://hellouchit.com/js/contact.js | grep -i 'cf-cache-status\|age'
#   cf-cache-status: HIT
#   age: 445            ← being served from cache, 445s old
```

This cost real debugging time once already: a rewritten `contact.js` was live on
the origin and confirmed by `curl`, while the browser kept executing the previous
version and throwing errors that could only come from code that no longer
existed.

### After any deploy that changes JS or CSS

Cloudflare dashboard → **Caching → Configuration → Custom Purge → URL**, and list
the changed files plus the pages that reference them:

```
https://hellouchit.com/js/contact.js
https://hellouchit.com/
https://hellouchit.com/index.html
https://hellouchit.com/css/site.css
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

## Contact form

Web3Forms, free tier. Two things worth knowing before debugging it:

- **It sends no CORS headers.** An in-page `fetch()` fails every time regardless
  of whether the key is valid. The form therefore submits natively (a real POST
  that navigates), which sidesteps CORS entirely and works with JS disabled.
  Success redirects to `/thanks/` via a hidden field.
- **It refuses server-side submissions** on the free plan, and sits behind
  Cloudflare bot protection. So the endpoint cannot be smoke-tested with `curl`
  or from an automated browser — both a valid and an invalid key return the same
  refusal, and scripted submissions hit a bot challenge. The only real test is a
  human clicking Send.

The `access_key` in `index.html` is a public submission key, not a secret: it only
permits posting to the inbox configured on the Web3Forms side.

## Build scripts

Run from the repo root; all are idempotent.

```sh
node scripts/build-llms-full.mjs      # regenerate the full-text corpus
node scripts/build-json-exports.mjs   # diagnostics/decisions/anti-patterns/glossary JSON
node scripts/build-situations.mjs     # regenerate /situations/ (also link-checks routes)
node scripts/check-routes.mjs         # diagnostic result → playbook routes
node scripts/check-drafts.mjs         # no page publishes with placeholder text
```

`build-situations.mjs` **overwrites** the generated pages, so sitewide edits (for
example adding a link to every `also-strip`) must also be made in the generator —
otherwise the next run silently reverts them. That has happened once.
