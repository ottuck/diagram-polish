---
name: architecture-diagram
description: Turn a project's architecture (a Mermaid block in a README, a screenshot, a description, or the code itself) into a clean, consistent diagram. Write the boxes and arrows as a small JSON file and draw it as SVG/PNG with the bundled script. Use when asked to "draw/make/redo the architecture diagram", "turn this Mermaid into a nicer diagram", or "add an architecture figure to the README". 아키텍처 구성도를 만들거나 Mermaid를 구성도로 바꿀 때도 쓴다.
---

# Architecture diagram

You describe the system as boxes and arrows in `diagram.json`; `scripts/render.mjs` computes box sizes and line routes and draws a standalone SVG (and optionally a 2x PNG). Nothing is drawn by hand and no colors are chosen: boxes only pick a `tone`.

Run the script as `node <this skill's folder>/scripts/render.mjs <diagram.json>`. The SVG needs no dependencies. `--png` needs `@resvg/resvg-js` (`npm i -D @resvg/resvg-js` where you run it); the Geist fonts in `fonts/` are used so the PNG looks the same everywhere.

## 1. Read the source

- Take the system's shape from what exists: the README's Mermaid, `docs/`, the user's description, a pasted picture. Keep *what talks to what*; drop how the old drawing happened to look.
- Check it against the code before you draw. Look at dependency files (`package.json`, `build.gradle`, `pyproject.toml`), config, and the code that stores, sends and receives data. Do not draw a component that only the old picture has. For a repo you don't have, `gh repo clone <owner>/<repo> <scratch dir> -- --depth 1` is enough; read-only, and delete the clone afterwards.

## 2. Reduce it to 5–7 boxes

| Rule | Example |
| --- | --- |
| Keep 5–7 boxes. If the source is already in range, keep its structure; if it's over, merge things that ship from one codebase first | iOS app + web app → `Expo app`, note `iPhone · web` |
| Services the project doesn't run itself get `tone: "outside"` | Firebase Auth, a push service, a third-party API |
| People and triggers get `tone: "accent"`; everything else is the default `main` | `You`, `Cron` |
| Things that run in one place go in a `groups` frame with a short title | `Sydney`, `One process`, `Your phone` |
| `title` is the name, `note` is the technology or host in one line | `Spring WebFlux` / `AWS Lightsail` |
| One arrow per pair of boxes and direction. Merge duplicates | two sign-in arrows from iOS and web → one `Sign-in` |
| `both: true` for two-way, `dashed: true` for scheduled or asynchronous | `Scheduled checks` |
| Labels are 1–3 words, never sentences | `REST · WebSocket`, `Verify tokens` |

`summary` is one sentence (two at most) that tells the flow in words. It is stored with the diagram and used as its description for screen readers. Write plainly; no marketing words.

Text in the diagram is English by default. If the project's readers use another language, use that for every `title`, `note`, `label` and the `summary`; widths are measured for Hangul/CJK too.

## 3. Write `diagram.json`

Put it where the project keeps docs (for example `docs/architecture.json`); the SVG and PNG land next to it. See `examples/*.json` for six real diagrams and `examples/*.svg` for how they come out. A starter:

```json
{
  "title": "My App",
  "width": 1000,
  "height": 380,
  "summary": "Clients talk to one API server, which keeps data in Postgres and sends mail through a provider.",
  "groups": [{ "title": "One server", "x": 330, "y": 40, "w": 380, "h": 300 }],
  "nodes": [
    { "id": "web", "x": 120, "y": 120, "title": "Web app", "note": "React" },
    { "id": "api", "x": 520, "y": 120, "title": "API", "note": "Node · Fastify" },
    { "id": "db", "x": 520, "y": 270, "title": "PostgreSQL" },
    { "id": "mail", "x": 880, "y": 120, "title": "Mail provider", "tone": "outside" }
  ],
  "edges": [
    { "from": "web", "to": "api", "label": "REST", "both": true },
    { "from": "api", "to": "db", "both": true },
    { "from": "api", "to": "mail", "label": "Send", "dashed": true }
  ]
}
```

### Canvas and boxes
- `width` is 1000–1080 and `height` 360–420 for most systems. Coordinates are SVG pixels.
- A node's `x`, `y` is the **center** of its box. Height is 68 with a `note` and 52 without. **Width is computed:** `max(120, text width) + 40`, where text width is roughly 6.6 per character for the note (12px) and 8.7 for the title (15px bold; capitals and digits are wider). A note like `Polygon · Ethereum · Avalanche` (30 characters) gives a box about 240 wide.
- Keep every box at least 20 from the canvas edge: for the right-most node, `x + width/2 <= canvas width - 20`. Raise `width` or move the node if it is cut off.
- Columns 300–400 apart and rows about 150 apart work well. Let the flow run left to right; put outside services at the top, bottom or far right.

### Groups
A group is a dashed frame. Unlike nodes, its `x`, `y` is the **top-left corner**, with `w` and `h` its size. The title is drawn at `(x + 14, y + 20)`, so keep boxes below `y + 40` and leave some room around them. Don't let a line run through the title.

### Edges
The route is chosen for you: `h` when the two boxes overlap vertically, `v` when they overlap horizontally, otherwise `hvh`. If lines cross boxes or each other, adjust:

| Field | Meaning |
| --- | --- |
| `route` | `h` straight horizontal, `v` straight vertical, `hvh` horizontal–vertical–horizontal, `vhv`, `hv` (leave sideways, arrive from above or below), `vh` |
| `offset` | Moves a straight `h` line in y, a `v` line in x |
| `fromOffset`, `toOffset` | Slide the start and end along the box side (negative is up or left). `hvh`: both y; `vhv`: both x; `hv`: from is y, to is x; `vh`: from is x, to is y. When two lines leave one side of a box, give them opposite offsets such as `-14` and `14` |
| `bend` | Where the line turns: the x of the vertical run in `hvh`, the y of the horizontal run in `vhv` |
| `labelAt` | Which segment carries the label (0 is the first). Default is the longest one |

A label is a pill as wide as its text plus 22, centered on the segment. For a two-way straight line, make sure the segment is long enough that the pill doesn't sit on an arrowhead.

## 4. Render and look

1. `node <skill>/scripts/render.mjs docs/architecture.json --png`. The script **stops on errors** (an edge to a box that doesn't exist, a bad route, missing fields) and **prints warnings** for things worth checking: a box cut off by the canvas, boxes overlapping, a box crossing a group's edge or covering its title, a line passing through a box, a label touching a box or another label.
2. **Open the PNG (or the SVG) and look at it.** Warnings don't catch everything. Check arrowheads (both ends for `both`), label positions, lines that run too close together, and whether the picture reads left to right without a legend.
3. Fix and render again until there are no warnings and the picture is clean. `--check` validates without writing files.

## 5. Hand over

Tell the user where the JSON, SVG and PNG are. If it's for a README, add `![Architecture](docs/architecture.svg)` (GitHub shows SVG in `<img>`). Don't commit or push unless the user asked.

## Don't

- Don't paste the old Mermaid or an image in place of the diagram.
- Don't set colors per box or per line; pick `tone`, or override the palette once with a top-level `"colors"` object (same keys as the script's palette) if the user wants a different look.
- Don't draw a component you haven't seen in the code or docs.
- Don't crowd more than about seven boxes into one diagram. Split it, or merge boxes.
