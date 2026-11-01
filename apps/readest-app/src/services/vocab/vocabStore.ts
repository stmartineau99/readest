/**
 * Saved words: `words` holds each word once, `encounters` the places in books
 * where it was saved (book, CFI, sentence). On iOS the database lives in
 * Documents so the Files app, and the Shortcuts backup to iCloud Drive, can
 * reach it. Every call opens and closes the database: close() folds the WAL
 * into the main file, so a copy of vocab.db is always complete.
 */
import { documentDir } from '@tauri-apps/api/path';
import type { DatabaseRow, DatabaseService } from '@/types/database';
import type { AppService } from '@/types/system';

const DB_SCHEMA = 'vocab';
const DB_FILE = 'vocab.db';

type VocabAppService = Pick<AppService, 'openDatabase' | 'isIOSApp'>;

export interface VocabEncounter {
  word: string;
  bookHash?: string;
  bookTitle?: string;
  cfi?: string;
  sentence?: string;
}

const openVocabDb = async (appService: VocabAppService): Promise<DatabaseService> =>
  appService.isIOSApp
    ? appService.openDatabase(DB_SCHEMA, `${await documentDir()}/${DB_FILE}`, 'None')
    : appService.openDatabase(DB_SCHEMA, DB_FILE, 'Data');

const withDb = async <T>(
  appService: VocabAppService,
  fn: (db: DatabaseService) => Promise<T>,
): Promise<T> => {
  const db = await openVocabDb(appService);
  try {
    return await fn(db);
  } finally {
    await db.close();
  }
};

export const isWordSaved = (appService: VocabAppService, word: string): Promise<boolean> =>
  withDb(appService, async (db) => {
    const rows = await db.select('SELECT 1 FROM words WHERE word = ?', [word]);
    return rows.length > 0;
  });

/** Saves the word, plus the encounter when it has a place in a book (`cfi`). */
export const saveEncounter = (appService: VocabAppService, encounter: VocabEncounter) =>
  withDb(appService, async (db) => {
    const now = Date.now();
    await db.execute('INSERT OR IGNORE INTO words (word, created_at) VALUES (?, ?)', [
      encounter.word,
      now,
    ]);
    // UNIQUE(word, cfi) treats NULLs as distinct, so a place-less save would repeat.
    if (!encounter.cfi) return;
    await db.execute(
      `INSERT OR IGNORE INTO encounters (word, book_hash, book_title, cfi, sentence, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        encounter.word,
        encounter.bookHash ?? null,
        encounter.bookTitle ?? null,
        encounter.cfi ?? null,
        encounter.sentence ?? null,
        now,
      ],
    );
  });

export interface SavedEncounter {
  bookHash: string | null;
  bookTitle: string | null;
  cfi: string;
  sentence: string | null;
  createdAt: number;
}

export interface SavedWord {
  word: string;
  createdAt: number;
  encounters: SavedEncounter[];
}

interface EncounterRow extends DatabaseRow {
  book_hash: string | null;
  book_title: string | null;
  cfi: string;
  sentence: string | null;
  created_at: number;
}

const toEncounter = (row: EncounterRow): SavedEncounter => ({
  bookHash: row.book_hash,
  bookTitle: row.book_title,
  cfi: row.cfi,
  sentence: row.sentence,
  createdAt: row.created_at,
});

/**
 * Every saved word, newest first, each with its encounters, newest first.
 * Two plain queries: the browser's wasm engine fails on a LEFT JOIN of the two tables.
 */
export const listSavedWords = (appService: VocabAppService): Promise<SavedWord[]> =>
  withDb(appService, async (db) => {
    const wordRows = await db.select<{ word: string; created_at: number }>(
      'SELECT word, created_at FROM words ORDER BY created_at DESC, word',
    );
    const encounterRows = await db.select<EncounterRow & { word: string }>(
      `SELECT word, book_hash, book_title, cfi, sentence, created_at FROM encounters
       ORDER BY created_at DESC`,
    );
    const words = new Map<string, SavedWord>(
      wordRows.map((row) => [
        row.word,
        { word: row.word, createdAt: row.created_at, encounters: [] },
      ]),
    );
    for (const row of encounterRows) words.get(row.word)?.encounters.push(toEncounter(row));
    return [...words.values()];
  });

/** One saved word with its encounters, newest first; null when it isn't saved. */
export const getSavedWord = (
  appService: VocabAppService,
  word: string,
): Promise<SavedWord | null> =>
  withDb(appService, async (db) => {
    const words = await db.select<{ created_at: number }>(
      'SELECT created_at FROM words WHERE word = ?',
      [word],
    );
    if (!words[0]) return null;
    const rows = await db.select<EncounterRow>(
      `SELECT book_hash, book_title, cfi, sentence, created_at FROM encounters
       WHERE word = ? ORDER BY created_at DESC`,
      [word],
    );
    return { word, createdAt: words[0].created_at, encounters: rows.map(toEncounter) };
  });

// A sentence ends at 。！？, optionally followed by a closing 」.
const SENTENCE_END = /[。！？]」?/g;

/** The sentence around `word`, given the text right before and after it. */
export const extractSentence = (before: string, word: string, after: string): string => {
  const ends = [...before.matchAll(SENTENCE_END)];
  const last = ends[ends.length - 1];
  const head = last ? before.slice(last.index + last[0].length) : before;
  const next = after.match(/^.*?[。！？]」?/s);
  const tail = next ? next[0] : after;
  return `${head}${word}${tail}`.trim();
};
