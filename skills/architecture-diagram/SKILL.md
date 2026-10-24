---
name: architecture-diagram
description: Turn a project's architecture (a Mermaid block in a README, a screenshot, a description, or the code itself) into a clean, consistent diagram. Write the boxes and arrows as a small JSON file and draw it as SVG/PNG with the bundled script. Use when asked to "draw/make/redo the architecture diagram", "turn this Mermaid into a nicer diagram", or "add an architecture figure to the README". 아키텍처 구성도를 만들거나 Mermaid를 구성도로 바꿀 때도 쓴다.
---

# Architecture diagram

You describe the system as boxes and arrows in `diagram.json`; `scripts/render.mjs` computes box sizes and line routes and draws a standalone SVG (and optionally a 2x PNG). Nothing is drawn by hand and no colors are chosen: boxes only pick a `tone`.

```
node <this skill's folder>/scripts/render.mjs <diagram.json> [--png] [--check] [--out <file.svg>] [--title <name>]
```

- The SVG needs no dependencies.
- `--png` needs `@resvg/resvg-js`, looked up from the folder you run the command in (`npm i -D @resvg/resvg-js` there). The PNG uses the Geist fonts in `fonts/`. If the text has Hangul, kana or Han characters, it also picks a system sans font (Malgun Gothic, Yu Gothic, Apple SD Gothic Neo or Noto Sans CJK); bold may not apply to those characters. `--font-dir <dir>` adds your own `.ttf` files, and `--no-system-fonts` makes the PNG identical on every machine.
- `--check` validates, prints every box's bounds (use them to place neighbors) and the warnings, and writes nothing.

## 1. Read the source

- Take the system's shape from what exists: the README's Mermaid, `docs/`, the user's description, a pasted picture. Keep *what talks to what*; drop how the old drawing happened to look.
- Check it against the code before you draw. Look at dependency files (`package.json`, `build.gradle`, `pyproject.toml`), config, and the code that stores, sends and receives data. Do not draw a component that only the old picture has. For a repo you don't have locally, `gh repo clone <owner>/<repo> <scratch dir> -- --depth 1` is enough; read-only, and delete the clone afterwards.
- **If there is no code to check**, say so in the hand-over and list what you took from the source on trust.
- Look at one or two of `examples/` for style. Don't copy a diagram that merely resembles yours.

## 2. Reduce it to 5–7 boxes

People and outside services count toward the 5–7; group frames don't.

Merge in this order until you're in range (if the source is already in range, keep its structure):

1. Pieces that ship from one codebase: iOS app + web app → `Expo app`, note `iPhone · web`.
2. Several services of one vendor, or things at the same stage: Kinesis + Lambda → `Event stream`, note `Kinesis · Lambda`; Auth + DB of one backend platform → one box.
3. Outside actors that use the same endpoint: Claude Code + claude.ai + ChatGPT → one `AI clients` box.
4. Sibling stores or services behind one gateway: three CRUD services → `Core services`, note `Auth · Catalog · Orders`.
5. Still over? Fold a lone person or trigger that has one arrow into a neighbor's note or into `summary` ("for analysts"). Drop details that don't change the story (health checks, a CDN).

When two arrows between the same pair would carry different labels, merge them and use a combined label (`RPC`), or keep the more important one. **Tell the user which boxes you merged or dropped.**

| Rule | Example |
| --- | --- |
| Tone: `main` for what the project runs, including managed services in its own cloud account (S3, Kinesis, a database) | `Spring WebFlux`, `Data lake` |
| `outside` for services in someone else's account | Firebase Auth, Stripe, a SaaS warehouse, a third-party API |
| `accent` for people and triggers (schedulers, cron, a browser acting as the user) | `You`, `Airflow` |
| A `groups` frame for boxes that run in one place and can sit side by side. Groups are plain rectangles: boxes that don't belong must sit outside it, and if the layout won't allow that, drop the frame | `Sydney`, `One process`, `Your phone` |
| `title` is the name, `note` is the technology or host in one line | `Spring WebFlux` / `AWS Lightsail` |
| One arrow per pair of boxes and direction | two sign-in arrows → one `Sign-in` |
| `both: true` for two-way, `dashed: true` for scheduled or asynchronous | `Scheduled checks` |
| Labels are 1–3 words, never sentences | `REST · WebSocket`, `Verify tokens` |

`summary` is one sentence, two at most (about 35 words total), telling the flow in words. It is stored with the diagram and used as its description for screen readers. Write plainly; no marketing words.

**Language of the text:** English by default. If the project's README and public docs are written in another language, use that for every `title`, `note`, `label` and the `summary` (a Korean Mermaid next to an English README still means English). Box widths are measured for Hangul/CJK too.

## 3. Write `diagram.json`

Put it where the project keeps docs (for example `docs/architecture.json`); the SVG and PNG land next to it. `examples/*.json` has seven diagrams, with their SVG and PNG. A starter:

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
- Coordinates are SVG pixels. `width` is usually 1000–1080; `height` 360–420, or up to about 480 for three rows.
- A node's `x`, `y` is the **center** of its box. Height is 68 with a `note` and 52 without. **Width is computed:** `max(120, widest text) + 40`, where text width is about 6.6 per character for the note (12px) and 8.7 for the title (15px bold; capitals and digits are wider). `Polygon · Ethereum · Avalanche` (30 characters) gives about 240. It's an estimate: run `--check` to read the real bounds before you place neighbors.
- Keep every box at least 20 from the canvas edge (`x + width/2 <= canvas width - 20` for the right-most). Raise `width` or move the node if it is cut off.
- Columns 300–400 apart and rows about 150 apart. Let the flow run left to right; put outside services at the top, bottom or far right.
- With 6–7 boxes in a flow, don't squeeze one row: wrap it into a two-row loop (top row left to right, down the right side, bottom row right to left), and put side inputs such as a scheduler on the open row.
- When two sources both feed two targets, the lines cross unless one source sits between them. Place boxes so that no line has to cross another, even if that costs a row.

### Groups
A group's `x`, `y` is its **top-left corner** (unlike nodes), with `w` and `h` its size. The title is drawn at `(x + 14, y + 20)`, so keep boxes below `y + 40` and leave room around them. If a line has to run along the top inside the frame, start the frame about 20 higher. Don't let a line run through the title.

### Edges
The route is chosen for you: `h` when the two boxes overlap vertically, `v` when they overlap horizontally, otherwise `hvh`. If lines cross boxes or each other, set a route:

| `route` | Leaves `from` | Arrives at `to` | Tuning |
| --- | --- | --- | --- |
| `h` | side facing `to` | side facing `from` | `offset` moves the line in y |
| `v` | top or bottom, facing `to` | the opposite side | `offset` moves the line in x |
| `hvh` | left or right side, **the one facing `bend`** (default: toward `to`) | left or right side facing `bend` | `bend` is the **x** of the vertical run; `fromOffset`, `toOffset` slide the ends in y |
| `vhv` | top or bottom, **the one facing `bend`** | top or bottom facing `bend` | `bend` is the **y** of the horizontal run; the offsets slide the ends in x |
| `hv` | side facing `to` | top or bottom of `to` | `fromOffset` is y of the line, `toOffset` is x of the arrival |
| `vh` | top or bottom, facing `to` | left or right side of `to` | `fromOffset` is x of the departure, `toOffset` is y of the line |

- **To go around boxes**, put `bend` beyond them: between two boxes in one row, `vhv` with a `bend` above both boxes leaves the top of one and arrives at the top of the other. A `bend` between the boxes gives the usual shape.
- `bend` is an absolute canvas coordinate. Offsets are in pixels (negative is up or left).
- A box side that has an incoming and an outgoing line, or two lines, needs different offsets (for example `-14` and `14`), or the lines meet at one point and look like one.
- `labelAt` picks the segment that carries the label (0 is the first); the default is the longest. A label pill is as wide as its text plus 22. If the longest segment is shorter than that, move the label with `labelAt` or give the segment more room. Prefer labels that sit fully inside or fully outside a group frame, not across its border.

## 4. Render and look

1. `node <skill>/scripts/render.mjs docs/architecture.json --png`. The script **stops on errors** (an edge to a box that doesn't exist, a bad route, missing fields) and **prints warnings**: a box cut off by the canvas, overlapping boxes, a box crossing a group's edge or covering its title, a line passing through a box (including its own start or end box, which means it left or arrived on the wrong side), a label touching a box or another label.
2. **Open the PNG (or the SVG) and look at it.** Warnings don't catch everything. Check that every arrowhead is visible and sits on a box edge (both ends for `both`), that two lines don't meet at one point, that the labels are on the right lines, and that the picture reads left to right without a legend. For Hangul/CJK text, check for empty boxes in place of letters.
3. Fix and render again until there are no warnings and the picture is clean.

## 5. Hand over

Tell the user where the JSON, SVG and PNG are, which boxes you merged or dropped, and anything you couldn't verify. If it's for a README, add `![Architecture](docs/architecture.svg)` (GitHub shows SVG in `<img>`). If the user's site renders this JSON format, put the JSON (without `title`) where they say. Don't commit or push unless the user asked.

## Don't

- Don't paste the old Mermaid or an image in place of the diagram.
- Don't set colors per box or per line; pick `tone`, or override the palette once with a top-level `"colors"` object (same keys as the script's palette) if the user wants a different look.
- Don't draw a component you haven't seen in the code or docs, unless you say it's from the source only.
- Don't crowd more than about seven boxes into one diagram. Split it, or merge boxes.
