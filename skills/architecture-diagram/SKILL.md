---
name: architecture-diagram
description: Turn a project's architecture (a Mermaid block in a README, a screenshot, a description, or the code itself) into a clean, consistent diagram. Write the boxes and arrows as a small JSON file and draw it as SVG/PNG with the bundled script. Use when asked to "draw/make/redo the architecture diagram", "turn this Mermaid into a nicer diagram", or "add an architecture figure to the README". 아키텍처 구성도를 만들거나 Mermaid를 구성도로 바꿀 때도 쓴다.
---

# Architecture diagram

You describe the system as boxes and arrows in `diagram.json`; `scripts/render.mjs` computes box sizes and line routes and draws a standalone SVG (and optionally a 2x PNG). Nothing is drawn by hand and no colors are chosen: boxes only pick a `tone`.

```
node <this skill's folder>/scripts/render.mjs <diagram.json> [--png] [--dark | --both | --auto] [--check] [--strict] [--embed-fonts] [--out <file.svg>] [--theme sage|blue|mono] [--title <name>]
```

- The SVG needs no dependencies.
- The script runs from any folder. Only `--png` cares where you are: it needs `@resvg/resvg-js`, looked up from the folder you run the command in (`npm i -D @resvg/resvg-js` there). The PNG uses the Geist fonts in `fonts/`. If the text has Hangul, kana or Han characters, it also picks a system sans font (Malgun Gothic, Yu Gothic, Apple SD Gothic Neo or Noto Sans CJK); bold may not apply to those characters. `--font-dir <dir>` adds your own `.ttf` files, and `--no-system-fonts` makes the PNG identical on every machine.
- `--dark` draws the dark palette (`<name>-dark.svg`); `--both` writes the light and the dark file; `--auto` writes one SVG that follows the OS light/dark setting (its PNG is the light one; not combinable with the other two).
- `--check` validates, prints every box's bounds (use them to place neighbors) and the warnings, and writes nothing.
- `--strict` makes the exit code 1 when there are warnings (notes don't count), so a script or CI job can stop on them. Without it the exit code is 0 even with warnings. With `--check` nothing is written; without `--check` the files are still written, so you can look at them.
- `--embed-fonts` puts the Geist fonts into the SVG as data (about 340 KB more per file), so a browser draws the text at the width the boxes were measured for even where Geist isn't installed. Use it for SVGs that go straight into a README or a page; leave it out when file size matters. The PNG never needs it.

## 1. Read the source

- Take the system's shape from what exists: the README's Mermaid, `docs/`, the user's description, a pasted picture. Keep *what talks to what*; drop how the old drawing happened to look.
- Check it against the code before you draw. Look at dependency files (`package.json`, `build.gradle`, `pyproject.toml`), config, and the code that stores, sends and receives data. Do not draw a component that only the old picture has. For a repo you don't have locally, `gh repo clone <owner>/<repo> <scratch dir> -- --depth 1` is enough; read-only, and delete the clone afterwards.
- Check the **direction** of every arrow too. Mermaid arrows are often one-way where the code talks both ways (a page posts a message, the embedded app answers), or point the wrong way.
- **If there is no code to check**, say so in the hand-over and list what you took from the source on trust, one line is enough.
- A Mermaid link without an arrowhead (`---`) still needs a direction here: use `both: true` with a short label, or a one-way arrow, whichever the code shows.
- **Sequence diagrams** are ordered in time and this format has no time axis. Keep who talks to whom, fold each request and its response into one `both: true` arrow, shorten the messages into a label of 1–3 words, and tell the user the order was dropped. A person who only starts and ends the story becomes an `accent` box.
- Look at one or two of `examples/` for style. Don't copy a diagram that merely resembles yours.

## 2. Reduce it to 5–7 boxes (up to 12 if it stays clean)

People and outside services count toward the number of boxes; group frames don't.

Merge in this order until you're in 5–7. If the source is already in 5–7, don't merge at all, even where a rule below would apply:

1. Pieces that ship from one codebase: iOS app + web app → `Expo app`, note `iPhone · web`.
2. Several services of one vendor, or things at the same stage: Kinesis + Lambda → `Event stream`, note `Kinesis · Lambda`; Auth + DB of one backend platform → one box.
3. Outside actors that use the same endpoint: Claude Code + claude.ai + ChatGPT → one `AI clients` box.
4. Sibling stores or services behind one gateway: three CRUD services → `Core services`, note `Auth · Catalog · Orders`.
5. Still over? Fold a lone person or trigger that has one arrow into a neighbor's note or into `summary` ("for analysts"). Drop details that don't change the story (health checks, a CDN).

When two arrows between the same pair would carry different labels, merge them and use a combined label (`RPC`), or keep the more important one. **Tell the user which boxes you merged or dropped.**

**Still over seven, and the next merge would join boxes with different jobs?** Stop merging and keep **8–12 boxes**, but only when all of these hold. Otherwise merge further, or draw a set (next section):

- The graph is tree-like: one hub, or one left-to-right flow with branches, and at most one more line than there are boxes. That is what lets you place every box so no line crosses another.
- `--check --strict` exits 0 and the PNG shows no crossing lines, no label pill that hides an arrowhead (give a labeled line a gap wider than its pill), and every arrowhead visible.
- `width` is at most 1280 and `height` at most 480. At that width a README scales the picture down (860px wide makes 12px notes about 8px), so go this wide only when the extra boxes are worth it.
- You tell the user the picture is above the usual range and which merge you skipped, and why.

More than 12 boxes is always a set.

| Rule | Example |
| --- | --- |
| Tone: `main` for what the project runs, including managed services in its own cloud account (S3, Kinesis, a database) | `Spring WebFlux`, `Data lake` |
| `outside` for services in someone else's account | Firebase Auth, Stripe, a SaaS warehouse, a third-party API |
| `accent` for people and triggers (schedulers, cron, a browser acting as the user) | `You`, `Airflow` |
| A `groups` frame for boxes that run in one place and can sit side by side. Groups are plain rectangles: boxes that don't belong must sit outside it, and if the layout won't allow that, drop the frame. The frame's title may carry the host and the technology | `Sydney`, `One process`, `Your phone`, `battle.example.dev · Cloudflare Pages` |
| `title` is the name, `note` is the technology or host in one line | `Spring WebFlux` / `AWS Lightsail` |
| One arrow per pair of boxes and direction | two sign-in arrows → one `Sign-in` |
| `both: true` for two-way (both ends get the same arrowhead, so it doesn't show who asks and who answers), `dashed: true` for scheduled or asynchronous | `Scheduled checks` |
| Labels are 1–3 words, never sentences | `REST · WebSocket`, `Verify tokens` |

`summary` is one sentence, two at most (about 35 words total), telling the flow in words. It is stored with the diagram and used as its description for screen readers. Write plainly; no marketing words.

**Language of the text:** English by default. If the project's README and public docs are written in another language, use that for every `title`, `note`, `label` and the `summary` (a Korean Mermaid next to an English README still means English). Box widths are measured for Hangul/CJK too.

### What this format is not for

It draws *logical* architecture: what talks to what. It does not draw infrastructure topology where containment is the point (region → VPC → availability zone → subnet, CIDR ranges, security groups) or where official cloud icons carry the meaning. If the user hands you such a picture, say so, and offer the logical view (the services and how they connect) instead of merging two availability zones into one box or faking nested subnets with frames. Draw it only if they ask for the logical view or accept that subnets and icons are lost.

### When the system is too big for one picture

Merging only works when the pieces really are alike. If getting to twelve would still join boxes with different jobs, or the graph is not tree-like enough to route by hand (a shop with 30 services, a platform with several teams' domains), don't. A 30-box picture can't be routed cleanly by hand, and a 7-box one that says `Core services` says nothing. Draw a set instead:

1. **One overview**, `docs/architecture.json`, in 5–7 boxes where each box is a *domain* (`Checkout`, `Catalog`, `Identity`, `Data platform`), not a service. Use a `groups` frame only for what runs in one place. Apply the merge rules above to the domains. Cross-domain arrows live only here.
2. **One detail diagram per domain that is worth it**, `docs/architecture-<domain>.json`, again 5–7 boxes: that domain's own services and stores as `main`, plus each neighbor it talks to as **one** `outside` box named exactly as in the overview (`Identity`, not `Auth service` and `Token store`), with the same arrow label. Apply the rules above inside the domain too.
3. **How to cut:** along ownership or deployment boundaries first, then along data flow (ingest, process, serve). Not by technology layer (all databases in one picture) unless the code is organized that way. Every service is a `main` box in exactly one detail diagram.
4. **Keep it to a handful.** At most five detail diagrams. If there are more domains, draw the five that carry the most traffic or change the most, and **ask the user which others they want**. Name what you left out.
5. Same names everywhere: a box title in the overview and in its detail diagram are identical, so a reader can follow it. In the README put the overview first and each detail under a heading with the domain's name.
6. Render each file on its own with `--check --strict` until all exit 0. In the hand-over list each diagram with the domains it covers, which services went into which, and what was dropped.

Never shrink the boxes or leave warnings in to fit more boxes into one picture. `width` goes past about 1080 only in the 8–12 box case above, and never past 1280.

## 3. Write `diagram.json`

Put it where the project keeps docs (for example `docs/architecture.json`); the SVG and PNG land next to it. `examples/` has the diagrams below, each with its SVG and PNG; `examples/from-mermaid/` keeps the Mermaid source next to the diagram made from it (a Korean one, a 14-node one that had to be merged down, a pipeline with a scheduler). A starter:

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
- `"theme"` picks the palette: `sage` (green and sand, the default), `blue` (cool blue and slate), or `mono` (graphite grays, good for print and for docs that already have a color scheme). Each has a dark variant. Keep the default unless the user asks for another look or the project's own colors point to one.
- Coordinates are SVG pixels. `width` is usually 1000–1080 (up to 1280 for 8–12 boxes); `height` 360–420, or up to about 480 for three rows.
- A node's `x`, `y` is the **center** of its box. Height is 68 with a `note` and 52 without. **Width is computed:** `max(120, widest text) + 40`, where text width is about 6.6 per character for the note (12px) and 8.7 for the title (15px bold; capitals and digits are wider). `Polygon · Ethereum · Avalanche` (30 characters) gives about 240. It's an estimate: run `--check` to read the real bounds before you place neighbors.
- Keep every box at least 20 from the canvas edge (`x + width/2 <= canvas width - 20` for the right-most). Raise `width` or move the node if it is cut off.
- Columns 300–400 apart and rows about 150 apart. Let the flow run left to right; put outside services at the top, bottom or far right.
- A box with four neighbors (an API in the middle) works best as the hub: put it in the center and the neighbors on its four sides, so each line is straight.
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
| `hv` | side facing `to` | top or bottom of `to` | `fromOffset` is the y of the line and `toOffset` the x of the arrival, both **relative to the box centers** (0 = centered) |
| `vh` | top or bottom, facing `to` | left or right side of `to` | `fromOffset` is the x of the departure and `toOffset` the y of the line, both **relative to the box centers** |

- **To go around boxes**, put `bend` beyond them: between two boxes in one row, `vhv` with a `bend` above both boxes leaves the top of one and arrives at the top of the other. A `bend` between the boxes gives the usual shape.
- **Only `bend` is an absolute canvas coordinate.** `offset`, `fromOffset` and `toOffset` are pixels relative to a box's center (negative is up or left): `0` means centered and `±14` is a small nudge.
- A box side that has an incoming and an outgoing line, or two lines, needs different offsets (for example `-14` and `14`), or the lines meet at one point and look like one.
- `labelAt` picks the segment that carries the label, counted from the `from` end (0 is the first); the default is the longest. When the long horizontal segment crosses a frame border, put the label on a vertical one. A label pill is as wide as its text plus 22. If the longest segment is shorter than that, move the label with `labelAt` or give the segment more room. Prefer labels that sit fully inside or fully outside a group frame, not across its border.

## 4. Render and look

1. `node <skill>/scripts/render.mjs docs/architecture.json --png --strict`. The script **stops on errors** (an edge to a box that doesn't exist, a bad route, missing fields) and **prints warnings**: a box cut off by the canvas, overlapping boxes, a box crossing a group's edge, covering its title or sitting less than 8 from the frame, a line running through a group's title, a line passing through a box (including its own start or end box, which means it left or arrived on the wrong side), two lines running along the same stretch (they look like one line; give one a different `route`, `bend` or `offset`), a line leaving the canvas, a label touching a box or another label. With `--strict` the exit code is 1 while any warning is left. A label across a group's border is only a *note*: it is often fine, look at it.
2. **Open the PNG (or the SVG) and look at it.** Warnings don't catch everything, and nothing checks which way an arrowhead points. Check that every arrowhead is visible and sits on a box edge (both ends for `both`), that two lines don't meet at one point, that the labels are on the right lines, and that the picture reads left to right without a legend. For Hangul/CJK text, check for empty boxes in place of letters.
3. Fix and render again until the command exits 0 with no warnings and the picture is clean.

## 5. Hand over

Tell the user where the JSON, SVG and PNG are, which boxes you merged or dropped, and anything you couldn't verify. If it's for a README, render with `--both --embed-fonts` and add a `<picture>` so GitHub shows the file that matches the reader's theme: `<picture><source media="(prefers-color-scheme: dark)" srcset="docs/architecture-dark.svg"><img src="docs/architecture.svg" alt="Architecture"></picture>`. Use `--auto` instead only when the SVG is opened on its own or inlined on a page without its own light/dark toggle (an `<img>` follows the OS, not a site's switch). If the user's site renders this JSON format, put the JSON (without `title`) where they say. Don't commit or push unless the user asked.

## Don't

- Don't paste the old Mermaid or an image in place of the diagram.
- Don't set colors per box or per line; pick `tone`. For another look use `"theme": "blue"` (or another theme), or override single palette entries once with a top-level `"colors"` object (`"colorsDark"` for the dark palette; same keys as the script's palette).
- Don't draw a component you haven't seen in the code or docs, unless you say it's from the source only.
- Don't crowd more than seven boxes into one diagram unless the 8–12 conditions in section 2 all hold, and never more than twelve. Merge boxes that are alike, or split a big system into an overview and per-domain diagrams (see "When the system is too big for one picture").
