# Status and what's left

The new site is on the `redesign/showcase` branch. All eight pages are complete
and indexable; nothing is waiting on a placeholder.

## Filled in from your sources (please skim)

- **Photos:** `~/Downloads/Uchit1.jpeg` (homepage) and `Uchit2.jpeg` (About),
  from the same studio shoot as the old cut-out. `Uchit.jpeg`, the grey
  headshot with glasses, was not used; say if it's a recent photo of you.
- **Archival case study:** 15 TB of structured and unstructured data, as you
  said. Note that your Medium article still says "multi-petabyte data estate"
  in its first lines; worth correcting there so the two match. The
  "Decisions that mattered" section and the architecture diagram come from
  the Medium article's phases and stack.
- **Lending case study:** "What I learned" is your Medium "Key Learnings",
  rewritten plainly. The diagram is drawn from the stack the article lists;
  the arrows (channels, front end, Pega and FIS, Go services) are my reading of
  how they connect. Correct it if the real flow differs, and the same for the
  five steps in the five-minute animation.
- **Medium images not used:** both case study images on Medium are
  AI-generated illustrations (one has a robot hand). Using them would bring
  back the "AI-made" look, so the site has drawn diagrams instead. The real
  ingestion diagrams in `~/Downloads` (`Data_Ingestion_*.jpg`,
  `Structured_Data + Alation.jpg`) look like internal client documents, so
  they were not used either.
- **About text:** written from your LinkedIn and CV: languages, lifting and
  writing about training after 35, building your own products. Change any
  line that doesn't sound like you.
- **Positioning:** "Lead forward deployed engineer for AI-led enterprise
  transformation". The hero, About, "What I do", meta descriptions and
  `llms.txt` all now say this, not banking only.
- **Bank wording:** "tier-1 bank in Australia and New Zealand", matching your
  Medium article's "Biggest Tier-1 Bank in ANZ" without naming the bank.

## Still open (none block launch)

- [ ] **Safety app screenshots.** The screenshot slot was removed so the page
  is complete. If you have screenshots, or the product has a public name or
  App Store link, they can go back in.
- [ ] **Naming Accenture.** The homepage "Where I've worked" strip and the
  About career list both name Accenture as your current employer. Remove it
  from both if you'd rather not.
- [ ] **Favicon PNG/ICO.** `favicon.svg` is new; `favicon.ico` and
  `favicon-192/512.png` still carry the old copper design.
- [ ] **Talks:** the Config Management Camp 2016 slides link points to a deck
  named "scaling-under-pressure" (it was like that on the old site).
- [ ] **Top 50 DevSecOps listing:** deliberately left off. Add it back to About
  if you know who compiled it and it's credible.
- [ ] **Ten controls text** in `dataset/dataset.json` and the readiness check
  questions in `js/pages/tools-agent-readiness.js` still carry some of the old
  voice (em-dashes, a few slogans). Worth a pass in your own words.
- [ ] **RSS:** `/writing/feed.xml` is gone; feed readers can't follow a page
  redirect, so anyone subscribed will see it stop.

## What was removed

About 80 pages: six diagnostics, three calculators, seven decision trees,
playbooks, maturity tiers, reference architectures, teardowns, sector pages,
the dataset views, the glossary, the benchmark, "State of 2026", Ask, search,
and all eight essays. Every old URL redirects to the nearest live page.
Everything is still in git history on `main`.

## How to preview

```sh
cd personal_site
python3 -m http.server 8765
# open http://localhost:8765
```
