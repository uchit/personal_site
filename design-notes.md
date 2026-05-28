# Design Foundation — hellouchit.com (redesign)

> Working as head of design (Apple lens). Every choice is a refusal of something else.
> Reviewed against the six principles below before any section ships.

## Refusals (locked)

1. **No template look.** No Bootstrap grid, no Owl carousel, no jQuery, no icon-font glyphs, no `default.css` + `style.css` + `custom-style.css` + `theme-override.css` stack.
2. **Different signature than Aditi.** Aditi = gold on near-black, Fraunces + Plex. Uchit = graphite + warm copper, Cormorant + Inter + JetBrains Mono.
3. **No ornament without information.** Every line, dot, eyebrow, italic earns its place by labelling, separating, or signalling state.

## Design tokens

```
--bg:           #0c0d10   /* near-black, faint blue cast */
--surface:      #13151a   /* cards only */
--ink:          #ecedf0   /* ~92% contrast */
--muted:        #9097a3   /* body */
--faint:        #5a6170   /* mono meta */
--line:         rgba(255,255,255,.07)
--accent:       #d99757   /* warm copper — one word per section, eyebrow rule */
--accent-soft:  rgba(217,151,87,.10)
--signal:       #43d39e   /* available dot only */
--maxw:         1180px
--ease:         cubic-bezier(.22,.61,.36,1)
```

## Typography

- **Display** — Cormorant Garamond 500 / italic 500 — H1/H2 only. Tight `-0.02em`. Max 18ch on H1.
- **UI/body** — Inter 400/500/600, `font-feature-settings: "ss01","cv11"`. 16/1.7.
- **Mono** — JetBrains Mono 400/500 — eyebrows, meta strips, indices. Never decorative.

Three families. Nothing else.

## Voice

Apple HIG, adapted. One idea per sentence. Verbs over adjectives. No "leveraging," "transformative," "passionate about." The writing proves authority — never claims it.

## Six principles (review gate)

1. **One idea per section.** Two answers → two sections.
2. **Hairlines, not boxes.** 1px line + breathing room, not fills.
3. **Italic = emphasis. Copper = signal.** Sparingly enough that one occurrence draws the eye.
4. **The grid breathes.** Section padding `clamp(80px, 11vw, 144px)`.
5. **Motion serves orientation.** Scroll-blur on nav, pulse on available dot, hover-lift on CTAs. Nothing autoplays.
6. **Honest performance.** One CSS file, one small JS file, `display: swap` fonts. LCP target < 1.2s.

## Section order (locked)

01 — Hero
02 — About (one paragraph, restraint)
03 — Expertise (6-cell quiet grid)
04 — Case studies (5 editorial cards → detail stubs)
05 — Writing (3 cornerstone teasers → /writing/)
06 — Books (quiet row of 5)
07 — Speaking (select 6-row list)
08 — Contact (one calm card)

## Phasing

- **Phase 0** — this file. ✅
- **Phase 1** — shell + hero + nav + atmosphere.
- **Phase 2** — about + expertise.
- **Phase 3** — case studies + books + talks.
- **Phase 4** — writing teaser + contact + JSON-LD + headers cleanup.

Old `index.html` preserved at `index.legacy.html` until phase 4 ships and is reviewed.
