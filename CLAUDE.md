# CLAUDE.md

## Documentation must always be kept up to date

When any code change alters something a reader of the docs would care about, update the docs in the same change. This is not optional and not "later" work — out-of-date docs are worse than no docs.

What counts as documentation in this repo:

- `README.md` — features, architecture, install/dev/deploy, file structure, harmony spokes table, `.swatches` format notes, share-link mechanics, persistence model, keyboard shortcuts.
- `wrangler.toml` comments and the worker config description in the README.
- Inline `data-i18n` keys and the translation entries in `public/js/i18n.js` (every user-facing string must exist in both `en` and `fr`).
- This file (`CLAUDE.md`).

When a change requires a documentation update (non-exhaustive):

- Adding/removing/renaming a palette type, swatch role, harmony, or export format → update README features + relevant tables.
- Changing file layout, module responsibilities, or adding/removing a JS module → update the architecture tree.
- Adding/removing a keyboard shortcut → update the shortcuts table.
- Changing share-link, KV, or `.swatches` mechanics → update the relevant README section.
- Adding/removing/renaming a `t()` key → update both `en` and `fr` blocks of `public/js/i18n.js`, never leave a key in only one language.
- Adding/changing a Cloudflare binding, environment, or deploy command → update README + `wrangler.toml`.
- Adding/removing dependencies → reflect in README prerequisites if user-facing.
- Adding/changing user-facing default copy (palette names, role labels, mode labels, toast text) → update both i18n languages.
- Bumping `version` in `package.json` → run `npm run build:version` so `public/js/version.js` (shown in the About dialog) matches.
- Changing the brand wheel colors in `public/favicon.svg` → also update the same hex codes in `scripts/build-icons.mjs` (the `WHEEL_PATHS` array) and run `npm run build:icons`.

Process:

1. Make the code change.
2. Identify every doc surface affected (use the list above as a checklist).
3. Update each in the same commit/PR. Never split "code now, docs later".
4. If a doc claim becomes outdated and you notice it incidentally — fix it, even if it's unrelated to your task.

## Version bumps before commit

Before creating **any** commit, if there are uncommitted changes since the last commit, **you MUST** ask the user whether to increment the `version` field in `package.json`. Never assume a change is too small to warrant a bump — always ask.

When the user agrees to bump:

1. Update the `version` field in `package.json`. Suggest the appropriate level:
   - **patch** (`x.y.Z`) — bug fixes, copy tweaks, refactors with no user-visible behavior change.
   - **minor** (`x.Y.0`) — new user-facing features.
   - **major** (`X.0.0`) — breaking changes (e.g., share-URL format change that invalidates old links).
2. Run `npm run build:version` to regenerate `public/js/version.js` so the About dialog stays in sync.
3. Stage both `package.json` and `public/js/version.js` and include them in the same commit as the change.

If the user explicitly declines to bump (e.g., doc-only or tooling-only commits), proceed without changes to the version.
