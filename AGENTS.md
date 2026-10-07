# doc-studio — document editor in the Ceará government visual identity

Browser-based block editor ("Estúdio de Documentos") with a live A4 preview for manuals, quick guides, procedures (POP), reports and notices that follow the Governo do Ceará visual identity manual (MIV 2023–2026). Output is a PDF printed by the browser. Audience: DETRAN/CE staff (Diretoria de Veículos) writing documents in Brazilian Portuguese.

The stack is intentionally plain HTML5, CSS3 and modern JavaScript with native ES modules: no framework, library, package manager, bundler, TypeScript or CSS preprocessor. There is no backend; documents live in the user's browser (IndexedDB) and travel as `.json` files.

## Layout
- `index.html`, `style.css` (tokens + app shell) and `script.js` (composition root and app-level actions) are the entry points. `css/` holds `components.css` (UI), `document.css` (the A4 page and all document blocks) and `print.css` (loaded with `media="print"`).
- Block types are declared once in `js/schema.js` (fields, defaults, validation) and rendered in `js/render.js`; editor forms are generated from the schema (`js/fields.js`). A new block type = schema entry + renderer + CSS in `document.css`.
- `js/paginate.js` measures render "atoms" in the hidden `#measure-body` (170 mm wide) and splits them into 252 mm pages (227 mm on the first page with the letterhead header); `js/preview.js` patches only changed pages. Cover, back cover and footer art are SVG polygons and ring sectors in `js/graphics.js`, each based on a cited MIV page.
- Images are kept in an asset registry (`js/images.js`), outside undo history; blocks store only the asset id.

## Commands
- Run locally: `python3 -m http.server 8080` from the repository root, then open `http://localhost:8080` (verified 2026-10-07 with Python 3.14.4: `/index.html` returns 200). Opening `index.html` via `file://` does not work (ES modules are blocked); the page shows a warning.
- Syntax check: `for f in script.js $(find js -name '*.js'); do node --check "$f"; done` from the root (verified 2026-10-07 with Node 24.20.0; 0 failures).
- There is no automated test suite. Validate in a real browser following the manual checklist in `README.md` → "Validação e testes". After editing JS/CSS, reload without cache (see learning). To check pagination fidelity, compare the preview page count with a PDF printed by Chromium.

## Conventions and constraints
- No external dependencies of any kind, no minified code, UTF-8 everywhere.
- Language: identifiers, file names, classes, IDs and data attributes in English; user-facing text, comments/docstrings and README in Brazilian Portuguese with correct accents.
- Visual fidelity to the MIV is the core requirement: Kanit for headings, Maitree for body text, colors and graphic bands from the manual. Do not introduce colors or fonts outside `css/document.css` tokens and themes.
- Any CSS that affects a block's size must apply both inside `.page` and inside the measure area (`.doc`), otherwise pagination breaks too early or too late. Use `:where(.doc)` for resets.
- User text is always escaped before becoming HTML (`esc()` or `renderInline()` in `js/markup.js`); imported `.json` files are rebuilt field by field (`normalizeDocument`, `normalizeBlock`, `normalizeDesign`). Keep it that way.
- Typing must not re-render the editor (cursor stability): text edits emit `kind: 'content'`; only structural changes re-render cards.
- The app UI defaults to the light theme (user requirement); dark and automatic are opt-in. The document is always white paper. PWA/offline is not a selected capability.
- Signatures follow the MIV rules (p. 15–22): partner logo left, Governo right, no separator, gap = shield width, minimum widths (≥ 40 mm with secretaria, ≥ 30 mm without). Logo files live in `assets/img/`; `js/render.js` `brandHtml()` picks the version.
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
