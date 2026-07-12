# World Cup 2026 · Match Stories

Data-driven, scroll-told match stories. Each story page is a thin HTML entry that
renders entirely from a match JSON file via a shared engine.

## Structure

```
index.html                  Landing page — lists stories from matches/manifest.json
norway-england-story.html   Thin entry for the Norway–England quarter-final
assets/story.css            Shared styles (team colours are CSS variables set at runtime)
assets/story.js             Render engine: builds the page from JSON, wires interactions
matches/manifest.json       Story list for the landing page
matches/norway-england-qf.json  All content for the Norway–England story
```

## Running locally

The pages load their JSON with `fetch`, so serve the folder over HTTP:

```
python -m http.server
```

then open http://localhost:8000/.

## Adding a new match story

1. Copy `matches/norway-england-qf.json` to `matches/<new-match>.json` and edit the
   content: teams (name, colour, text-on-colour), score, timeline events, stat rows,
   possession/shots/radar data, squads, controversy cards, next-match info, footer.
   Fields ending in `Html` may contain inline markup (e.g. `<strong>`); all other
   fields are treated as plain text.
2. Copy `norway-england-story.html` to a new entry page, update the `<title>` and
   meta description, and point `<body data-match="...">` at the new JSON.
3. Add the story to `matches/manifest.json` so it appears on the landing page.

Event `type` values in the timeline: `neutral`, `goal-home`, `goal-away`, `var`.
Shot categories use the keys `on`, `off`, `blk`.
