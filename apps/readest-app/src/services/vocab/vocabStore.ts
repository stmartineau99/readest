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

interface SavedWordRow extends DatabaseRow {
  word: string;
  word_created_at: number;
  book_hash: string | null;
  book_title: string | null;
  cfi: string | null;
  sentence: string | null;
  created_at: number | null;
}

/** Every saved word, newest first, each with its encounters, newest first. */
export const listSavedWords = (appService: VocabAppService): Promise<SavedWord[]> =>
  withDb(appService, async (db) => {
    const rows = await db.select<SavedWordRow>(
      `SELECT w.word, w.created_at AS word_created_at,
              e.book_hash, e.book_title, e.cfi, e.sentence, e.created_at
       FROM words w LEFT JOIN encounters e ON e.word = w.word
       ORDER BY w.created_at DESC, w.word, e.created_at DESC`,
    );
    const words = new Map<string, SavedWord>();
    for (const row of rows) {
      let saved = words.get(row.word);
      if (!saved) {
        saved = { word: row.word, createdAt: row.word_created_at, encounters: [] };
        words.set(row.word, saved);
      }
      if (row.cfi === null) continue;
      saved.encounters.push({
        bookHash: row.book_hash,
        bookTitle: row.book_title,
        cfi: row.cfi,
        sentence: row.sentence,
        createdAt: row.created_at!,
      });
    }
    return [...words.values()];
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
