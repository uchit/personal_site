# Security headers — hellouchit.com

## The problem

`vercel.json` declared six security headers. The site does not run on Vercel — it
serves from **GitHub Pages behind Cloudflare**. Verified against production:

```
$ curl -sI https://hellouchit.com/ | grep -iE 'content-security|strict-transport|x-frame|x-content|referrer|permissions'
(no output)
```

All six were absent. GitHub Pages does not support custom response headers, and
never has: no `_headers` file (that is Netlify / Cloudflare Pages), no config
surface. So the headers have to come from **Cloudflare**, which already proxies
the domain.

## The fix — Cloudflare Transform Rule

Dashboard → your domain → **Rules** → **Transform Rules** → **Modify Response
Header** → *Create rule*.

- **Rule name:** `security-headers`
- **When incoming requests match:** *All incoming requests*
- **Then:** *Set static* — one entry per header below.

| Header | Value |
|---|---|
| `Content-Security-Policy` | see below |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `geolocation=(), microphone=(), camera=(), payment=(), usb=()` |

`Content-Security-Policy` value, as one line:

```
default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' https://www.googletagmanager.com https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://*.google-analytics.com https://analytics.google.com https://*.analytics.google.com https://*.googletagmanager.com https://stats.g.doubleclick.net https://www.google.com https://cloudflareinsights.com; upgrade-insecure-requests
```

**If a Cloudflare Transform Rule is already live with the old value, it needs
updating** — this file and `vercel.json` are the source of truth, not the
Cloudflare dashboard, and a stale rule now blocks nothing it needs to (the
inline scripts it was written for no longer exist) but is also not enforcing
the tighter policy the site is actually capable of running today.

HSTS can alternatively be enabled under **SSL/TLS → Edge Certificates → HSTS**,
which is the better home for it — enable there *or* in the rule, not both.

`X-Frame-Options` is deliberately omitted: `frame-ancestors 'none'` supersedes it
in every browser that supports CSP, and shipping both invites them to disagree.

## `script-src` no longer needs `'unsafe-inline'`

It used to: every diagnostic's `Diag.run({...})` config, every decision tree's
`window.TREE = {...})`, the GA snippet, and 8 inline event handlers
(`onclick`/`onerror`) were typed directly into the HTML. All of that has been
moved to external, deferred scripts (`js/analytics.js`, `js/pages/*.js`, and
`addEventListener` calls in `js/site.js` / `js/diagnostic.js`) — see
`scripts/migrate-inline-*.mjs` for the one-time migrations and their git
history for what changed. `script-src` above reflects that: no
`'unsafe-inline'`, no bare `'self'` gap for inline code.

## Why `'unsafe-inline'` is still in `style-src`

Roughly 30 pages keep page-scoped CSS in a `<style>` block in `<head>` (normal,
reasonable practice — it avoids bloating the shared `css/site.css` with
one-page-only rules — but still "inline" as far as CSP is concerned), and
~280 `style="..."` attributes remain for genuinely one-off decoration (the
~860 that were copy-pasted repeats became utility classes in `css/site.css`;
see its "Utilities" section).

Nonce-based CSP needs a per-request generated header, impossible on a static
host. Hash-based CSP needs one header per distinct set of inline content; this
site ships one sitewide Cloudflare Transform Rule, not per-page rules, so a
hash-based `style-src` would need every page's hash listed in every page's
header — workable in principle, brittle in practice, and it breaks silently
the moment a `<style>` block's content changes without the header being
regenerated. Closing this fully means moving each page's `<style>` block to an
external stylesheet and finishing the attribute-to-utility-class pass for the
remaining singletons. Until then, this policy is honest about what the site
actually does.

## Verifying after the rule is live

```sh
curl -sI https://hellouchit.com/ | grep -iE 'content-security|strict-transport|x-content|referrer|permissions'
```

Then load `/tools/genai-readiness.html`, answer one question, and confirm the
browser console shows no `Refused to execute inline script` errors.
