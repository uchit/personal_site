# Chat worker

RAG Q&A over hellouchit.com's own prose (`llms-full.txt`), answered by Llama
3.1 8B on Cloudflare Workers AI. Nothing is stored — no conversation history,
no per-visitor record — except a per-IP daily request counter used purely as
an abuse backstop.

## Why lexical retrieval, not embeddings

The corpus is 41 short documents. BM25 (term-frequency + inverse-document-
frequency, length-normalized) finds the right one for an on-topic question
without needing Vectorize, an embedding model, or a build step to keep an
index in sync with the site. Verified against the real corpus before this
shipped — see the retrieval-quality reasoning in `src/index.js`'s comments.
This stops being the right call if the corpus grows by an order of magnitude;
it isn't there yet.

## Deploy

```sh
cd worker/chat
npx wrangler kv namespace create RATE_LIMIT      # paste the id into wrangler.toml
npx wrangler deploy
npx wrangler deploy --route 'hellouchit.com/v2/*'
```

Workers AI needs no separate provisioning — it's available on every Cloudflare
account, free tier included (10,000 neurons/day; Llama 3.2 1B runs roughly
50-300 neurons per request depending on length).

## Endpoint

`POST /v2/chat` — `{ messages: [{role: "user"|"assistant", content: string}] }`
(the client resends the transcript each turn; nothing is kept server-side).
Returns `{ answer: string, sources: [{title, url}] }`. Rate-limited to 20
requests/IP/day (`429` past that). CORS restricted to `https://hellouchit.com`.

## Tuning

- `MIN_SCORE` in `src/index.js` — the BM25 floor a chunk needs to clear before
  it's treated as relevant context. Too low and off-topic questions pull in
  irrelevant excerpts the model may lean on anyway; too high and legitimate
  but lightly-covered topics get an unhelpful "couldn't find anything." 4.5
  was picked empirically — re-tune if either failure mode shows up in practice.
- `RATE_LIMIT_PER_DAY` — 20 is generous for a real visitor, low enough that a
  script hammering the endpoint hits the wall fast.
