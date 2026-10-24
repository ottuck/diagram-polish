# architecture-diagram-skill

A [Claude Code](https://claude.com/claude-code) skill that turns plain diagrams, like the Mermaid block in a README, into clean ones with a look of their own.

**Mermaid, default theme** (the look GitHub shows for a ```mermaid block, and the newer look of the current CLI)

<p>
  <img src="skills/architecture-diagram/examples/from-mermaid/data-pipeline-mermaid-cli10.png" alt="A data pipeline drawn by Mermaid 10's default theme: lavender boxes, yellow frames, labels in gray patches, one long flat row" width="420">
  <img src="skills/architecture-diagram/examples/from-mermaid/data-pipeline-mermaid-cli12.png" alt="The same pipeline in the newer Mermaid look: black outlines, pink and teal frames, labels in gray patches, a line crossing at the Glue box" width="420">
</p>

**After**

<img src="skills/architecture-diagram/examples/from-mermaid/data-pipeline.png" alt="The same pipeline redrawn: seven rounded boxes, a dashed frame around the AWS parts, labels on the lines, and a scheduler in a different tone" width="860">

Mermaid is quick to write and rarely nice to look at: the layout is whatever the engine picks, labels sit in gray patches, and no two diagrams match. Give Claude the Mermaid, a description, or just the repo, and this skill redraws it.

- **It simplifies.** Ten or fourteen nodes become five to seven boxes: pieces of one codebase are merged, duplicate arrows are joined, labels shrink to a word or two. It checks the code first, so nothing is drawn that doesn't exist.
- **It gives every diagram the same look.** Soft boxes, a dashed frame for what runs together, a different tone for services you don't run, dashed lines for scheduled or asynchronous work. Pick `sage` or `blue`. Hangul and CJK text work too.
- **It checks its own drawing.** The script stops on mistakes and warns about cut-off boxes, overlaps, lines through boxes and colliding labels. Claude then looks at the picture before handing it over.
- **Plain files in, plain files out.** The diagram is a small `diagram.json`; the script writes a standalone SVG (no dependencies) and, if you want, a 2x PNG.

## Install

```sh
cp -r skills/architecture-diagram ~/.claude/skills/         # every project
cp -r skills/architecture-diagram <project>/.claude/skills/ # one project
```

Start a new session, then ask: *"turn the Mermaid in the README into an architecture diagram."* The repo is also a plugin marketplace: `claude plugin marketplace add <owner>/architecture-diagram-skill`, then `claude plugin install architecture-diagram-skill@architecture-diagram-skill`. The manifests follow the plugin docs but have not been run through `claude plugin validate` yet.

## Use the script alone

```sh
node skills/architecture-diagram/scripts/render.mjs diagram.json          # diagram.svg
node skills/architecture-diagram/scripts/render.mjs diagram.json --png    # + diagram.png (npm i -D @resvg/resvg-js)
node skills/architecture-diagram/scripts/render.mjs diagram.json --check  # validate, list box bounds, warnings
```

Options: `--theme sage|blue`, `--out`, `--title`, `--font-dir`, `--no-system-fonts`. The rules, the JSON format and what every field does are in [`SKILL.md`](skills/architecture-diagram/SKILL.md); [`starter.json`](skills/architecture-diagram/examples/starter.json) is a minimal file and [`diagram.schema.json`](skills/architecture-diagram/diagram.schema.json) a schema for your editor.

## Themes

<p>
  <img src="skills/architecture-diagram/examples/starter.png" alt="Starter diagram, sage theme" width="420">
  <img src="skills/architecture-diagram/examples/starter-blue.png" alt="Starter diagram, blue theme" width="420">
</p>

## More examples

[`examples/from-mermaid`](skills/architecture-diagram/examples/from-mermaid) has six Mermaid sources with the diagram made from each: a Korean one, a 14-node shop merged down to seven boxes, a Supabase and Next.js app, a Unity WebGL game embedded in a web app, a login flow written as a *sequence* diagram (in the blue theme), and the pipeline above. [`examples/`](skills/architecture-diagram/examples) has six more, from the author's own projects.

## Notes

- Box widths are estimated for Geist, which the PNG uses. In the PNG, Hangul and CJK text uses a system sans font (Malgun Gothic, Yu Gothic, Apple SD Gothic Neo or Noto Sans CJK) and bold may not apply to it.
- The two "before" images are `@mermaid-js/mermaid-cli` 10.9 and 12.0 with their default themes. Mermaid's look and layout change between versions and hosts; the point holds in all of them.

## License

MIT, see [LICENSE](LICENSE). The bundled Geist fonts are under the SIL Open Font License ([fonts/LICENSE.txt](skills/architecture-diagram/fonts/LICENSE.txt)).
