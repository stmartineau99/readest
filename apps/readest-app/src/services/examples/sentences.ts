/**
 * Read-only example sentences (Chinese + English) per traditional word, from Tatoeba.
 * Built outside the repo by ~/Documents/Chinese/tools/examples/build_sentences.py,
 * bundled into public/dictionaries/ by scripts/copy-dictionaries.mjs and installed
 * into Data on first use, like the lexicon. The build writes EXAMPLES_VERSION as
 * `user_version`; bump both together to replace an installed copy.
 *
 * Every source writes the same schema, so swapping the source is a change of
 * EXAMPLES_FILE.
 */
import type { DatabaseRow, DatabaseService } from '@/types/database';
import type { AppService } from '@/types/system';

const EXAMPLES_VERSION = 6;
const EXAMPLES_FILE = 'sentences_tatoeba.db';
/** OpenCC s2tw (characters only). The build matches words and `swapped` against it. */
const SHOWN_COLUMN = 'zh_s2tw';
const MAX_SENTENCES = 20;

type ExamplesAppService = Pick<
  AppService,
  'openDatabase' | 'installDatabase' | 'databaseExists' | 'deleteDatabase'
>;

/** A mainland word in the sentence and the Taiwan word for it; offsets in UTF-16 units. */
export interface MainlandWord {
  start: number;
  end: number;
  taiwan: string;
}

export interface ExampleSentence {
  zh: string;
  en: string;
  mainland: MainlandWord[];
}

interface SentenceRow extends DatabaseRow {
  zh: string;
  en: string;
  swapped: string | null;
}

let dbPromise: Promise<DatabaseService | null> | null = null;

const openInstalled = (appService: ExamplesAppService) =>
  appService.openDatabase('examples', EXAMPLES_FILE, 'Data');

const installBundled = async (appService: ExamplesAppService): Promise<boolean> => {
  const response = await fetch(`/dictionaries/${EXAMPLES_FILE}`);
  if (!response.ok) return false;
  const file = new File([await response.blob()], EXAMPLES_FILE);
  await appService.deleteDatabase(EXAMPLES_FILE, 'Data');
  await appService.installDatabase(EXAMPLES_FILE, 'Data', file);
  return true;
};

const openExamples = async (appService: ExamplesAppService): Promise<DatabaseService | null> => {
  if (await appService.databaseExists(EXAMPLES_FILE, 'Data')) {
    const db = await openInstalled(appService);
    const rows = await db.select<{ user_version: number }>('PRAGMA user_version');
    if ((rows[0]?.user_version ?? 0) >= EXAMPLES_VERSION) return db;
    await db.close();
  }
  if (!(await installBundled(appService))) return null;
  return openInstalled(appService);
};

const ensureExamples = (appService: ExamplesAppService): Promise<DatabaseService | null> => {
  if (!dbPromise) {
    dbPromise = openExamples(appService).catch((error: unknown) => {
      console.warn('[examples] failed to open', error);
      dbPromise = null;
      return null;
    });
  }
  return dbPromise;
};

/** For tests: forget the open database so the next call opens it again. */
export const resetExamplesForTests = () => {
  dbPromise = null;
};

const parseSwapped = (swapped: string | null): MainlandWord[] => {
  if (!swapped) return [];
  try {
    const spans = JSON.parse(swapped) as [number, number, string][];
    return spans.map(([start, end, taiwan]) => ({ start, end, taiwan }));
  } catch {
    return [];
  }
};

/** Up to 20 example sentences for `word`, best first; empty when there are none. */
export const getExampleSentences = async (
  appService: ExamplesAppService,
  word: string,
): Promise<ExampleSentence[]> => {
  const db = await ensureExamples(appService);
  if (!db) return [];
  const rows = await db.select<SentenceRow>(
    `SELECT s.${SHOWN_COLUMN} AS zh, s.en AS en, s.swapped AS swapped
       FROM word_examples e JOIN sentences s ON s.id = e.sentence_id
      WHERE e.word = ? ORDER BY e.ord LIMIT ?`,
    [word, MAX_SENTENCES],
  );
  return rows.map((row) => ({ zh: row.zh, en: row.en, mainland: parseSwapped(row.swapped) }));
};
