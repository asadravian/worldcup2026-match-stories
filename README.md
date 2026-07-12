# World Cup 2026 · Match Stories

Interactive, scroll-told stories of FIFA World Cup 2026 matches — every match told
minute by minute through data. Read the first one, Norway 1–2 England (quarter-final,
AET), live at:

**https://asadravian.github.io/worldcup2026-match-stories/**

Each story plays the match back as you scroll: a sticky match clock driven by scroll
position, a minute-by-minute timeline of the moments that decided the game, animated
head-to-head stat bars, a possession donut, shot-outcome slice bars, a six-axis radar
comparing the teams, filterable squad tables, and the calls everyone argued about
afterwards.

## JSON-driven architecture

The design and the content are fully separated. A story page is a ~15-line HTML shell
that points at a JSON file; a shared engine does the rest.

```
index.html                       Landing page — lists stories from matches/manifest.json
norway-england-story.html        Thin entry: <body data-match="matches/norway-england-qf.json">
assets/story.js                  Render engine — fetches the JSON, builds the whole page,
                                 wires every interaction
assets/story.css                 Shared styles — team colours are CSS custom properties
                                 (--home / --away + derived tints) set from the JSON at runtime
matches/norway-england-qf.json   All content for the Norway–England story
matches/manifest.json            Story list for the landing page
.github/workflows/deploy.yml     GitHub Pages deployment (static, via Actions)
```

Everything editorial lives in the match JSON: teams (names, colours), score, hero copy,
timeline events, stat rows, chart data (possession, shots by outcome, radar axes), both
squads, controversy cards, next-match probabilities and footer credits. Fields ending in
`Html` may carry inline markup like `<strong>`; every other field is escaped on render.

### Adding a new match story

1. Copy `matches/norway-england-qf.json`, edit the content. Timeline event `type` values:
   `neutral`, `goal-home`, `goal-away`, `var`. Shot categories use keys `on`, `off`, `blk`.
2. Copy `norway-england-story.html`, update the `<title>`/description and the
   `data-match` attribute.
3. Add an entry to `matches/manifest.json` so it appears on the landing page.

No build step. The new story is live as soon as the three files are pushed.

## Zero JS libraries

There are no dependencies, no frameworks and no build tooling — no chart library
either. The donut is two stroked SVG circles with computed dash arrays, the radar is
generated SVG geometry, the stat bars and shot slices are flex-sized divs, and the
scroll clock, reveal animations and tooltips use plain `IntersectionObserver`, scroll
events and CSS transitions. The entire runtime is one vanilla ES5 script and one
stylesheet. It respects `prefers-reduced-motion` and keeps charts keyboard-accessible
(tab to any segment, dot or slice for its value).

## Running locally

The pages load their JSON with `fetch`, so serve the folder over HTTP:

```
python -m http.server
```

then open http://localhost:8000/.

## Credits

[Claude Code](https://claude.com/claude-code) and Muhammad Asadullah (Asad) ([LinkedIn](https://www.linkedin.com/in/masad1))  — from the
original one-off page through the JSON-driven refactor, the landing page and the GitHub Pages deployment.
