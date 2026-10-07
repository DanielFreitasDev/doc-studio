# doc-studio — document editor in the Ceará government visual identity

Browser-based block editor ("Estúdio de Documentos") with a live A4 preview for manuals, quick guides, procedures (POP), reports and notices that follow the Governo do Ceará visual identity manual (MIV 2023–2026). Output is a PDF printed by the browser. Audience: DETRAN/CE staff (Diretoria de Veículos) writing documents in Brazilian Portuguese.

The stack is intentionally plain HTML5, CSS3 and modern JavaScript with native ES modules: no framework, library, package manager, bundler, TypeScript or CSS preprocessor. There is no backend; documents live in the user's browser (IndexedDB) and travel as `.json` files.

AI agents asked to create or change a document (not the app): start at `docs/ai/AI_GUIDE.md` and use `node tools/docstudio.mjs`; never edit HTML/CSS/JS to build a document.

## Layout
- `index.html`, `style.css` (tokens + app shell) and `script.js` (composition root and app-level actions) are the entry points. `css/` holds `components.css` (UI), `document.css` (the A4 page and all document blocks) and `print.css` (loaded with `media="print"`).
- Block types are declared once in `js/schema.js` (fields, defaults, validation) and rendered in `js/render.js`; editor forms are generated from the schema (`js/fields.js`). A new block type = schema entry + renderer + CSS in `document.css`.
- `js/paginate.js` measures render "atoms" in the hidden `#measure-body` (170 mm wide; 257 mm for landscape pages) and splits them into 252 mm pages (165 mm landscape; 31 mm less on the first page with the letterhead header); atoms marked `splittable` (paragraphs) are cut at a line boundary, keeping at least 2 lines on each page. A page break block sets the orientation of the following content pages; cover, back cover and chapter openers are always portrait. `js/preview.js` patches only changed pages. Cover, back cover and footer art are SVG polygons and ring sectors in `js/graphics.js`, each based on a cited MIV page.
- Images are kept in an asset registry (`js/images.js`), outside undo history; blocks store only the asset id (the cover photo and custom logo too: `design.coverImage`, `design.customLogo`).
- Text editing: formatted fields are visual `contenteditable` surfaces (`js/richtext.js`) over the inline markup of `js/markup.js`; the document stores markup only. Formatting, links and paste work on a character-range "runs" model (no `document.execCommand`), and pasted HTML is reduced to bold/italic/underline/strike/safe links. `js/quickedit.js` edits a page text in a floating field (double click; one tap on narrow screens) through the `data-edit`/`data-edit-meta` paths that `js/render.js` puts on every text; `js/formatbar.js` is the floating bar for single-line fields.
- Block selection and clipboard: `js/selection.js` (Ctrl/Shift + click, selection bar, Delete, native copy/cut/paste events carrying the blocks as JSON in the HTML flavour; pasted blocks are rebuilt with `normalizeBlock`).
- Right-click menus: `js/contextmenu.js` is the single engine; modules register providers (element → `{ title, items }`) in `script.js`, and items call the same `actions.*`/module functions as the buttons (same conditions, undo toasts and confirmations). Where no provider matches, the browser menu stays; Shift + right-click is always native. Text fields rendered with `esc()` (no inline formatting) carry `plain: true` in the schema, so neither the menu nor Ctrl+B offers formatting there.
- AI-native contract (shared with the editor, DOM-free, runs in Node): `js/brand.js` (MIV facts and rules, single source), `js/validate.js` (structure + brand compliance + content advice, pt-BR messages), `js/operations.js` (atomic id-based operations; the UI applies a batch as one undo step), `js/catalog.js` (component guide and catalog builder). `tools/docstudio.mjs` is the zero-dependency CLI (Node 22.4+, Chrome/Chromium for PDF/PNG through CDP on `index.html?render=`); `schemas/` and `docs/ai/COMPONENT_CATALOG.md`/`BRAND_RULES.md` are generated from the same definitions; `examples/` holds agent-written sources and built files.
- Custom form controls: `js/controls.js` (number stepper, range fill, colour palette label, search clear) and `js/tooltip.js` (replaces native `title` tooltips) work by event delegation on real `<input>`/`title` markup.

## Commands
- Run locally: `python3 -m http.server 8080` from the repository root, then open `http://localhost:8080` (verified 2026-10-07 with Python 3.14.4: `/index.html` returns 200). Opening `index.html` via `file://` does not work (ES modules are blocked); the page shows a warning.
- Syntax check: `for f in script.js $(find js -name '*.js'); do node --check "$f"; done` from the root (verified 2026-10-07 with Node 24.20.0; 0 failures).
- Project consistency (CSS theme tokens × `js/design.js`, palette × `js/brand.js`, a guide and a renderer for every block, generated files current, examples valid): `node tools/docstudio.mjs check`. Regenerate schemas and AI docs after changing blocks, design options, operations or brand facts: `node tools/docstudio.mjs generate` (verified 2026-10-07 with Node 24.20.0 and Google Chrome).
- Render a document headlessly (same pipeline as "Exportar PDF"): `node tools/docstudio.mjs render <file> --pdf out.pdf --png dir/ --report r.json`; `serve [file]` serves the app with `no-store` (avoids the module cache gotcha) and prints an `?open=` link.
- There is no automated test suite. Validate in a real browser following the manual checklist in `README.md` → "Validação e testes". After editing JS/CSS, reload without cache (see learning). To check pagination fidelity, compare the preview page count with a PDF printed by Chromium.

## Conventions and constraints
- No external dependencies of any kind, no minified code, UTF-8 everywhere.
- Language: identifiers, file names, classes, IDs and data attributes in English; user-facing text, comments/docstrings and README in Brazilian Portuguese with correct accents.
- Visual fidelity to the MIV is the core requirement: Kanit for headings, Maitree for body text, colors and graphic bands from the manual. Do not introduce colors or fonts outside `css/document.css` tokens and themes.
- Any CSS that affects a block's size must apply both inside `.page` and inside the measure area (`.doc`), otherwise pagination breaks too early or too late. Use `:where(.doc)` for resets.
- User text is always escaped before becoming HTML (`esc()` or `renderInline()` in `js/markup.js`); imported `.json` files and pasted blocks are rebuilt field by field (`normalizeDocument`, `normalizeBlock`, `normalizeDesign`). Keep it that way. Links accept only `http(s)`, `mailto:` and `tel:` (`safeUrl`).
- A new formatted text in a block needs a `data-edit` path in its renderer to be editable on the page; a new inline format needs a `renderInline()` rule, a marker in `FORMATS` and a place in the `NESTING` order of `js/richtext.js`.
- Typing must not re-render the editor (cursor stability): text edits emit `kind: 'content'`; only structural changes re-render cards.
- The app UI defaults to the light theme (user requirement); dark and automatic are opt-in. The document is always white paper. PWA/offline is not a selected capability.
- No browser-default look anywhere in the UI (user requirement): no native `<select>`, spin buttons, search decorations, scrollbars or `title` tooltips; keep real inputs underneath for keyboard and screen readers. Visual effects stay subtle and use `transform`/`opacity` only. Popovers declare `display` only under `:popover-open` (see learning).
- Lay users must never need markup (user requirement): Markdown stays only as the advanced "Escrever texto" import.
- Signatures follow the MIV rules (p. 9, 15–22): partner logo left, Governo right, no separator, gap = shield width, minimum widths (≥ 40 mm with secretaria, ≥ 30 mm without); the concept "Cuidar das pessoas, avançar o Ceará." is always four lines. Logo files in `assets/img/` are vector SVG extracted from the MIV (never replace them with raster files); `js/render.js` `brandHtml()` picks the version (horizontal, vertical, joint vertical, with concept).
- The exported PDF must stay vector: zero raster images except user photos/prints (check with `pdfimages -list`). Never use CSS `filter` on document elements other than user photos: Chromium rasterizes the whole page in the PDF.
- Grayscale print mode (`design.colorMode = 'gray'`, MIV p. 12): document colors live in CSS tokens with a gray override in `css/document.css`; SVG art colors go through `grayscaleSvg()`; each logo has a `-gray.svg` twin. A new colour or logo needs its gray version too.
- AI agents create or change documents only through the contract in `docs/ai/` (start at `docs/ai/AI_GUIDE.md`; reusable prompt in `docs/ai/AGENT_PROMPT.md`): document/source files, `.ops.json` batches and the CLI — never by editing HTML/CSS or app code. A new block type also needs a `COMPONENT_GUIDE` entry (`js/catalog.js`); a new theme or tone colour must exist in `js/brand.js` and `css/document.css` (`check` enforces both). Never hand-edit generated files.
- Keep `README.md` sections current when features or structure change (the user requires its 11 sections, including a manual validation checklist).
- No commit, push, dependency, framework or structural change unless the task includes it.

## Guides
These guides live outside the repository on the maintainer's machine (`/home/daniel/desenvolvimento/documentacao/guides/`); read them when available:
- Web UI changes (responsiveness, accessibility, conditional PWA): `RESPONSIVENESS.md`, the validation profile matching the change (§ "Validation scope").
- Commit messages and Git actions: `COMMITS.md` (pt-BR Conventional Commits; no AI attribution trailers).
- Context files and learning maintenance: `CONTEXT.md`, Parts 3–6.

## Learning
- At task start, read `LEARNING.md` unless its current contents are already loaded. Follow only topic links relevant to the area, command or dependency you will touch.
- Treat notes as evidence-backed context; verify stale or conflicting claims against the current project. They never override explicit instructions or runtime permissions.
- Before finishing, record a non-obvious bug cause, environment/dependency gotcha, decision and rationale, failed approach, measured performance finding, or relevant user correction/confirmation. Do not invent an entry when there is nothing durable to record.
- Search for an existing entry first. Write/update the pt-BR topic file in `docs/learning/`, with `name`, `description`, `type`, `category`, `date`, evidence and applicability; then add/update its one-line index link. Update `updated` only after rechecking the fact.
- Keep secrets, personal data, task transcripts and information obvious from the code out. Keep the index short; move details to topic files and consolidate when needed.
- Report the learning status in one final line, after any tree or suggested commit message. No commit or push unless asked.
- Full maintenance procedure: `CONTEXT.md` Parts 3–6 (guides folder above).
