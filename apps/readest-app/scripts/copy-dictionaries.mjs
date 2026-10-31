// Copies the bundled MoeDict StarDict into public/dictionaries/, where
// services/dictionaries/bundledDictionary.ts fetches it on first use.
//
// The files are built outside the repo (~/Documents/Chinese/moedict_stardict)
// and stay out of git. Missing source only warns, so a clone without it builds.

import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = path.resolve(appDir, '../../../moedict_stardict/out');
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
