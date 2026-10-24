# diagram-polish

A [Claude Code](https://claude.com/claude-code) skill that turns plain diagrams, like the Mermaid block in a README, into clean ones with a look of their own.

**Before: Mermaid's default theme**

The look GitHub shows for a Mermaid code block:

<img src="skills/architecture-diagram/examples/from-mermaid/data-pipeline-mermaid-cli10.png" alt="A data pipeline drawn by Mermaid 10's default theme: lavender boxes, yellow frames, labels in gray patches, one long flat row" width="880">

The newer look of the current Mermaid CLI:

<img src="skills/architecture-diagram/examples/from-mermaid/data-pipeline-mermaid-cli12.png" alt="The same pipeline in the newer Mermaid look: black outlines, pink and teal frames, labels in gray patches, a line crossing at the Glue box" width="880">

**After: this skill**

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="skills/architecture-diagram/examples/from-mermaid/data-pipeline-dark.png">
  <img src="skills/architecture-diagram/examples/from-mermaid/data-pipeline.png" alt="The same pipeline redrawn: seven rounded boxes, a dashed frame around the AWS parts, labels on the lines, and a scheduler in a different tone" width="860">
</picture>

Mermaid is quick to write and rarely nice to look at: the layout is whatever the engine picks, labels sit in gray patches, and no two diagrams match. Give Claude the Mermaid, a description, or just the repo, and this skill redraws it.

- **It simplifies.** Ten or fourteen nodes become five to seven boxes: pieces of one codebase are merged, duplicate arrows are joined, labels shrink to a word or two. It checks the code first, so nothing is drawn that doesn't exist.
- **It gives every diagram the same look.** Soft boxes, a dashed frame for what runs together, a different tone for services you don't run, dashed lines for scheduled or asynchronous work. Pick one of three themes, each with a dark variant. Hangul and CJK text work too.
- **It checks its own drawing.** The script stops on mistakes and warns about cut-off boxes, overlaps, lines through boxes and colliding labels. Claude then looks at the picture before handing it over.
- **Plain files in, plain files out.** The diagram is a small `diagram.json`; the script writes a standalone SVG (no dependencies) and, if you want, a 2x PNG.

## Install

```sh
cp -r skills/architecture-diagram ~/.claude/skills/         # every project
cp -r skills/architecture-diagram <project>/.claude/skills/ # one project
```

Start a new session, then ask: *"turn the Mermaid in the README into an architecture diagram."* The repo is also a plugin marketplace: `claude plugin marketplace add <owner>/diagram-polish`, then `claude plugin install diagram-polish@diagram-polish`. The manifests pass `claude plugin validate --strict`.

## Use the script alone

```sh
node skills/architecture-diagram/scripts/render.mjs diagram.json          # diagram.svg
node skills/architecture-diagram/scripts/render.mjs diagram.json --png    # + diagram.png (npm i -D @resvg/resvg-js)
node skills/architecture-diagram/scripts/render.mjs diagram.json --check  # validate, list box bounds, warnings
```

Options: `--theme sage|blue|mono`, `--dark`, `--both`, `--auto` (see Dark mode), `--out`, `--title`, `--font-dir`, `--no-system-fonts`. The rules, the JSON format and what every field does are in [`SKILL.md`](skills/architecture-diagram/SKILL.md); [`starter.json`](skills/architecture-diagram/examples/starter.json) is a minimal file and [`diagram.schema.json`](skills/architecture-diagram/diagram.schema.json) a schema for your editor.

## Themes

Three themes, light on the left and dark on the right. Pick one with `"theme"` in the JSON or `--theme` on the command line:

- `sage` (default): green and sand
- `blue`: cool blue and slate
- `mono`: graphite grays, for print or docs that already have a color scheme

<img src="docs/themes.png" alt="The same data pipeline in the three themes, each in a light and a dark version" width="880">

## Dark mode

Every theme has a dark palette. `--dark` draws it as `diagram-dark.svg`; `--both` writes the light and the dark file (with `--png`, both PNGs). Put them in a README with `<picture>`, so GitHub shows the one that matches the reader's theme:

```html
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/architecture-dark.svg">
  <img src="docs/architecture.svg" alt="Architecture">
</picture>
```

`--auto` writes one SVG that follows the OS setting through `prefers-color-scheme`; its PNG is the light one. That suits a page that opens the SVG on its own or inlines it. In an `<img>` it follows the operating system, not a site's own light/dark toggle, so on GitHub or any site with its own switch use the two files and `<picture>`. The two README images above and the examples named `*-dark` and `starter-auto.svg` show it; the hero picture is a `<picture>` itself, so it switches if your GitHub is in dark mode.

## More examples

[`examples/from-mermaid`](skills/architecture-diagram/examples/from-mermaid) has six Mermaid sources with the diagram made from each: a Korean one, a 14-node shop merged down to seven boxes, a Supabase and Next.js app, a Unity WebGL game embedded in a web app, a login flow written as a *sequence* diagram (in the blue theme), and the pipeline above. [`examples/`](skills/architecture-diagram/examples) has six more, from the author's own projects.

## Notes

- Box widths are estimated for Geist, which the PNG uses. In the PNG, Hangul and CJK text uses a system sans font (Malgun Gothic, Yu Gothic, Apple SD Gothic Neo or Noto Sans CJK) and bold may not apply to it.
- The two "before" images are `@mermaid-js/mermaid-cli` 10.9 and 12.0 with their default themes. Mermaid's look and layout change between versions and hosts; the point holds in all of them.

## License

MIT, see [LICENSE](LICENSE). The bundled Geist fonts are under the SIL Open Font License ([fonts/LICENSE.txt](skills/architecture-diagram/fonts/LICENSE.txt)).
