// Copies the bundled MoeDict StarDict into public/dictionaries/, where
// services/dictionaries/bundledDictionary.ts fetches it on first use.
//
// The files are built outside the repo (~/Documents/Chinese/tools/moedict_stardict)
// and stay out of git. Missing source only warns, so a clone without it builds.

import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = path.resolve(appDir, '../../../tools/moedict_stardict/out');
const targetDir = path.join(appDir, 'public/dictionaries');
const files = ['moedict_zh_en.ifo', 'moedict_zh_en.idx', 'moedict_zh_en.dict.dz'];

const missing = files.filter((name) => !existsSync(path.join(sourceDir, name)));
if (missing.length > 0) {
  console.warn(`[copy-dictionaries] skipped, missing in ${sourceDir}: ${missing.join(', ')}`);
} else {
  mkdirSync(targetDir, { recursive: true });
  for (const name of files) copyFileSync(path.join(sourceDir, name), path.join(targetDir, name));
  console.log(`[copy-dictionaries] copied ${files.length} files to ${targetDir}`);
}

// HSK/TOCFL levels and frequency rank, fetched by services/lexicon/lexicon.ts.
// Built by ~/Documents/Chinese/tools/lexicon/build_lexicon.py.
const lexiconSource = path.resolve(appDir, '../../../tools/lexicon/out/lexicon.db');
if (!existsSync(lexiconSource)) {
  console.warn(`[copy-dictionaries] skipped, missing: ${lexiconSource}`);
} else {
  mkdirSync(targetDir, { recursive: true });
  copyFileSync(lexiconSource, path.join(targetDir, 'lexicon.db'));
  console.log(`[copy-dictionaries] copied lexicon.db to ${targetDir}`);
}

// Example sentences, fetched by services/examples/sentences.ts.
// Built by ~/Documents/Chinese/tools/examples/build_sentences.py.
const examplesSource = path.resolve(appDir, '../../../tools/examples/out/sentences_tatoeba.db');
if (!existsSync(examplesSource)) {
  console.warn(`[copy-dictionaries] skipped, missing: ${examplesSource}`);
} else {
  mkdirSync(targetDir, { recursive: true });
  copyFileSync(examplesSource, path.join(targetDir, 'sentences_tatoeba.db'));
  console.log(`[copy-dictionaries] copied sentences_tatoeba.db to ${targetDir}`);
}
