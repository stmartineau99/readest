/**
 * Read-only lexicon of HSK 3.0 level, TOCFL level, Taiwan frequency rank,
 * English gloss, reading and chengyu flag per traditional word. Built outside the repo by
 * ~/Documents/Chinese/lexicon/build_lexicon.py, bundled into
 * public/dictionaries/ by scripts/copy-dictionaries.mjs and installed into
 * Data on first use. The build writes LEXICON_VERSION as `user_version`;
 * bump both together to replace an installed copy.
 */
import type { DatabaseRow, DatabaseService } from '@/types/database';
import type { AppService } from '@/types/system';

const LEXICON_VERSION = 4;
const LEXICON_FILE = 'lexicon.db';

type LexiconAppService = Pick<
  AppService,
  'openDatabase' | 'installDatabase' | 'databaseExists' | 'deleteDatabase'
>;

export interface LexiconEntry {
  /** HSK 3.0 level 1–6, 7 = band 7–9; null = beyond HSK. */
  hsk: number | null;
  /** TOCFL level N1, N2 (novice) or 1–5. */
  tocfl: string | null;
  /** Rank by number of Taiwanese sites using the word; null = not in twngrams. */
  rank: number | null;
  /** English gloss, as on the bundled MoeDict's EN line; null = none. */
  english: string | null;
  /** MoeDict zhuyin, several readings joined with " / ", else 成語典's; null = in neither. */
  zhuyin: string | null;
  /** Pinyin from the same source, in the same order as `zhuyin`. */
  pinyin: string | null;
  /** Idiom in the MoE 成語典 (main or non-main entry). */
  chengyu: boolean;
}

interface LexiconRow extends DatabaseRow, Omit<LexiconEntry, 'chengyu'> {
  chengyu: number | null;
}

let dbPromise: Promise<DatabaseService | null> | null = null;

const openInstalled = (appService: LexiconAppService) =>
  appService.openDatabase('lexicon', LEXICON_FILE, 'Data');

const installBundled = async (appService: LexiconAppService): Promise<boolean> => {
  const response = await fetch(`/dictionaries/${LEXICON_FILE}`);
  if (!response.ok) return false;
  const file = new File([await response.blob()], LEXICON_FILE);
  await appService.deleteDatabase(LEXICON_FILE, 'Data');
  await appService.installDatabase(LEXICON_FILE, 'Data', file);
  return true;
};

const openLexicon = async (appService: LexiconAppService): Promise<DatabaseService | null> => {
  if (await appService.databaseExists(LEXICON_FILE, 'Data')) {
    const db = await openInstalled(appService);
    const rows = await db.select<{ user_version: number }>('PRAGMA user_version');
    if ((rows[0]?.user_version ?? 0) >= LEXICON_VERSION) return db;
    await db.close();
  }
  if (!(await installBundled(appService))) return null;
  return openInstalled(appService);
};

/** Opens the lexicon once per session, installing the bundled copy when missing or outdated. */
export const ensureLexicon = (appService: LexiconAppService): Promise<DatabaseService | null> => {
  if (!dbPromise) {
    dbPromise = openLexicon(appService).catch((error: unknown) => {
      console.warn('[lexicon] failed to open', error);
      dbPromise = null;
      return null;
    });
  }
  return dbPromise;
};

export const getLexiconEntry = async (
  appService: LexiconAppService,
  word: string,
): Promise<LexiconEntry | null> => {
  const db = await ensureLexicon(appService);
  if (!db) return null;
  const rows = await db.select<LexiconRow>(
    'SELECT hsk, tocfl, rank, english, zhuyin, pinyin, chengyu FROM lexicon WHERE word = ?',
    [word],
  );
  const row = rows[0];
  return row
    ? {
        hsk: row.hsk,
        tocfl: row.tocfl,
        rank: row.rank,
        english: row.english,
        zhuyin: row.zhuyin,
        pinyin: row.pinyin,
        chengyu: row.chengyu === 1,
      }
    : null;
};

/** `HSK 3 · TOCFL 2 · #1,288`, leaving out the parts the word lacks. */
export const formatLexiconEntry = (entry: LexiconEntry | null | undefined): string => {
  if (!entry) return '';
  const parts = [
    entry.hsk !== null ? `HSK ${entry.hsk === 7 ? '7–9' : entry.hsk}` : '',
    entry.tocfl !== null ? `TOCFL ${entry.tocfl}` : '',
    entry.rank !== null ? `#${entry.rank.toLocaleString()}` : '',
  ];
  return parts.filter(Boolean).join(' · ');
};
