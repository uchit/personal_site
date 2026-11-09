# What I need from you

The new site is built on the `redesign/showcase` branch. These are the gaps
only you can fill. Pages with a gap show it highlighted in yellow and are
hidden from search engines until it's filled (that happens automatically).

Send the answers in any form (a message, a voice note transcript, photos of a
whiteboard) and they'll be put in the right place.

## Must have before launch

### 1. A new photo
The current portrait is a cut-out with rough edges around the hair, which
shows on phones. The photo carries an Apple-style site more than anything
else. Best: a proper photo on a plain light-grey background, shoulders up, at
least 2000px wide. A second photo of you on stage or at a whiteboard would make
the About page.

### 2. Data archival case study (`/case-studies/data-archival.html`)
- [ ] **Total data size in petabytes.** The third big number currently shows "N PB".
- [ ] **Architecture diagram.** A whiteboard photo is fine; it will be redrawn.
- [ ] **What went wrong.** One honest paragraph: something that didn't work the first time, and what you changed.
- [ ] Confirm $50M+ a year saved and 1,000+ applications can be stated publicly.

### 3. Digital lending case study (`/case-studies/digital-lending.html`)
- [ ] **Platform diagram:** channels, Pega, Go services, FIS risk engine, AWS.
- [ ] **What went wrong.** What nearly slipped, and what you did.
- [ ] **Check the five steps** in the five-minute animation. They're my reading of the old write-up: customer applies, identity and credit checks, risk engine decides, approved, money in the account. Correct them if the real flow differs.
- [ ] Confirm "under 5 minutes", "6 months", "200+ people", "50+ AWS environments" and "zero critical incidents" can be stated publicly.

### 4. Safety app case study (`/case-studies/ai-companion-safety.html`)
- [ ] **Two screenshots:** the parent's dashboard and the teenager's view.
- [ ] Is the product public? If it has a name or App Store link, it should be on the page. Right now it's anonymous.
- [ ] The chat in the animation is invented example text, labelled as such. Swap it if you'd prefer different wording.

### 5. About page (`/about/`)
- [ ] **Two or three sentences in your own words:** what you enjoy about the work, or something about you outside work. This is the single most important line for not sounding generated. Please write it yourself.
- [ ] **Naming Accenture.** Both the About career list and the homepage "Where I've worked" strip name Accenture as your current employer (it's already in the public LinkedIn PDF). Remove it from both if you'd rather not.
- [ ] **The five-city line** (Ahmedabad, Bangalore, Pune, Singapore, Melbourne) leaves out Thailand and Indonesia. Say if you want them in.

## Please check

- [ ] **Social preview and icons.** `images/og-banner.jpg` (the card LinkedIn and Slack show) has been regenerated from the new homepage, and `images/favicon.svg` is a new plain black "UV". The older `favicon.ico` and `favicon-192/512.png` still carry the old copper design; replace them with exports of the new SVG. Re-do the preview image once you have the new photo.
- [ ] **"Australian" vs "ANZ".** The archival case study says "tier-1 Australian bank". The old site said "Tier-1 ANZ bank", meaning Australia and New Zealand, but it could be read as the bank called ANZ. Confirm which wording is safe.
- [ ] **Homepage claim:** "Building agents for banks now" (in the "Early, three times" section). True as written?
- [ ] **Homepage hero:** "Now I build AI agents that pass a bank's audit, and I still write the code." This is the positioning line. Change any word that isn't how you'd say it.
- [ ] **Talks:** the Config Management Camp 2016 slides link points to a deck called "scaling-under-pressure". It was like that on the old site. Correct if wrong.
- [ ] **Top 50 DevSecOps listing:** deliberately left off the new site. The research found these lists are mostly vendor marketing. Add it back to About if you know who compiled it and it's credible.
- [ ] **Ten controls text** lives in `dataset/dataset.json` (the "notes" and "evidence" fields). It's good material, but it still has some of the old voice (em-dashes, a few slogans). Worth a pass in your own words when you have time.
- [ ] **Readiness check questions** in `js/pages/tools-agent-readiness.js` have the same issue.

## What was removed

About 80 pages: six diagnostics, three calculators, seven decision trees,
playbooks, maturity tiers, reference architectures, teardowns, sector pages,
the dataset views, the glossary, the benchmark, "State of 2026", Ask, search,
and all eight essays. Every old URL redirects to the nearest live page, so no
link breaks. The one exception is the RSS feed (`/writing/feed.xml`): feed
readers can't follow a page redirect, so anyone subscribed will see it stop. Everything is still in git history on `main`, so any essay you
wrote yourself can come back as a single page.

## How to preview

```sh
cd personal_site
python3 -m http.server 8765
# open http://localhost:8765
```
