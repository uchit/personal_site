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
default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://*.google-analytics.com https://analytics.google.com https://*.analytics.google.com https://*.googletagmanager.com https://stats.g.doubleclick.net https://www.google.com; upgrade-insecure-requests
```

HSTS can alternatively be enabled under **SSL/TLS → Edge Certificates → HSTS**,
which is the better home for it — enable there *or* in the rule, not both.

`X-Frame-Options` is deliberately omitted: `frame-ancestors 'none'` supersedes it
in every browser that supports CSP, and shipping both invites them to disagree.

## Why the old CSP would have caused an outage

The previous policy specified `script-src 'self'` with no `'unsafe-inline'` and
no `googletagmanager.com`. Had the site ever been deployed to Vercel with that
policy live, the browser would have blocked:

- **93 inline `<script>` blocks across 73 files** — every diagnostic's
  `Diag.run({...})` config and every decision tree's `window.TREE = {...}`.
  All six diagnostics and all seven decision trees would render an empty shell.
- **7 inline event handlers** — the portrait `onerror` fallback, the "Take it
  again" buttons.
- **The GA snippet and `googletagmanager.com`** — all analytics, silently.

The inert config was therefore not merely useless; it was a loaded gun pointed at
the interactive half of the site.

## Why `'unsafe-inline'` is still in the policy

It is required by the current architecture, and saying otherwise would mean
shipping a policy that breaks the site. Nonce-based CSP needs a per-request
generated header — impossible on any static host. Hash-based CSP would mean
maintaining 93 SHA-256 hashes that change on every content edit.

The real fix is to stop inlining: move each page's `Diag.run({...})` and
`window.TREE = {...}` payload into a sibling `.js` file (or a `.json` file the
engine fetches — which the Phase 1.3 JSON export work produces anyway), then
drop `'unsafe-inline'` from `script-src`. Until then, this policy is honest
about what the site actually does.

## Verifying after the rule is live

```sh
curl -sI https://hellouchit.com/ | grep -iE 'content-security|strict-transport|x-content|referrer|permissions'
```

Then load `/tools/genai-readiness.html`, answer one question, and confirm the
browser console shows no `Refused to execute inline script` errors.
