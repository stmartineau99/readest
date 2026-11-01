# Readest fork

Personal fork of readest (`stmartineau99/readest`): minimal UI, Chinese reading with a bundled MoeDict, a lexicon (HSK, TOCFL, frequency, chengyu) and saved words. Upstream's own instructions are in `apps/readest-app/AGENTS.md` (symlinked as `apps/readest-app/CLAUDE.md`); don't edit them.

## Scope

- Change only files under `apps/readest-app/src/`. Anything else (`package.json`, `scripts/`, `.husky/`, `src-tauri/`, `packages/`, config files, upstream docs) needs the user's explicit OK first, every time.
- Keep fork code in its own files (`src/components/vocab/`, `src/services/vocab/`, `src/services/lexicon/`) and touch upstream files as little as possible: a hook call or a one-line mount, not logic. Upstream is merged in regularly, and every changed line in an upstream file can conflict.

## Workflow

- Claude makes the changes and commits each reviewed chunk, with a short lowercase message ("add chengyu to lexicon"). Push and merge only when the user asks.
- The user runs the tests. Give the exact command, for example `micromamba run -n readest pnpm test --run src/__tests__/components/vocab` from `apps/readest-app`.
- Use the `readest` micromamba env for `node` and `pnpm`; plain `node` isn't on the PATH.
