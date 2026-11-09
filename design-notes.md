# Design notes

The November 2026 rebuild replaced a dark, copper-accented site that 30 out of
30 readers judged to be AI-generated. These rules exist so it doesn't drift
back there.

## The look

- Black page, Apple dark-mode greys for tiles (`#161617`), white type.
- One accent: Apple blue (`#0071e3` buttons, `#2997ff` links and highlights).
  No other colour except what is in the photographs and book covers.
- Big numbers use one silver fill.
- System font (SF Pro on Apple devices), semibold for display type.
- Nav: full-width bar, transparent over the hero, frosted glass once
  scrolled, hides on scroll down.
- Every section answers "why should the reader care" before it shows
  anything, and shows a real thing: the portrait, book covers, the patent's
  front page, the talk recording, the tools inside device frames.

## Never

- Glow, grain, grid overlays, gradients as decoration, corner brackets.
- One word in a headline set in italic or a different colour.
- All-caps labels, tracked-out "eyebrows", numbered section markers
  (01, 02...), monospace for labels, "A · B · C" meta strings.
- Arrows appended to link text.
- Count-up stats on page load, or fade-in on every section.
- Em-dashes in copy, "not X, it's Y" sentences, slogans.
- Extra accent colours, glows or gradient washes.

## The set pieces

Each page has one or two moments that show something true about the work,
all in `js/wow.js`, and each falls back to a plain static layout without JS
or with reduced motion:

| Page | Set piece |
|---|---|
| Home | Results take over the screen one at a time; a live question from the readiness check |
| Work | Oversized result tiles |
| Archival case | 1,000 scattered squares become one platform |
| Lending case | An application runs along the five-minute line |
| Safety app case | A chat blurs away, leaving the one record that leaves the phone |
| AI agents | Dependency graph of the ten controls |
| About | Five cities, drawn as a line |
| Readiness check | The result card and score reveal |

Before adding anything, ask: does this show a fact about the work? If it's
only there to look impressive, leave it out.
