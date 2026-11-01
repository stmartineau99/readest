import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { NodeDatabaseService } from '@/services/database/nodeDatabaseService';
import { migrate } from '@/services/database/migrate';
import { getMigrations } from '@/services/database/migrations';
import {
  extractSentence,
  isWordSaved,
  listSavedWords,
  saveEncounter,
} from '@/services/vocab/vocabStore';
import type { DatabaseService } from '@/types/database';
import type { AppService } from '@/types/system';

vi.mock('@tauri-apps/api/path', () => ({
  documentDir: vi.fn(async () => '/docs'),
}));

describe('extractSentence', () => {
  test('cuts at the sentence ends on either side', () => {
    expect(extractSentence('他走了。「你好！」他說，', '老闆', '來了嗎？我不知道。')).toBe(
      '他說，老闆來了嗎？',
    );
  });

  test('keeps a closing quote after the sentence end', () => {
    expect(extractSentence('前一句。', '老闆', '笑了。」後一句。')).toBe('老闆笑了。」');
  });

  test('keeps the whole context when there is no sentence end', () => {
    expect(extractSentence('開頭', '老闆', '結尾')).toBe('開頭老闆結尾');
  });
});

describe('vocabStore', () => {
  let db: DatabaseService;
  let appService: AppService;

  beforeEach(async () => {
    db = await NodeDatabaseService.open(':memory:');
    await migrate(db, getMigrations('vocab'));
    // withDb closes after every call; keep the in-memory database alive.
    const handle = { ...db, select: db.select.bind(db), execute: db.execute.bind(db) };
    appService = {
      isIOSApp: false,
      openDatabase: vi.fn(async () => ({ ...handle, close: vi.fn(async () => {}) })),
    } as unknown as AppService;
  });

  afterEach(async () => {
    await db.close();
  });

  const encounters = () =>
    db.select<{ word: string; cfi: string; sentence: string }>(
      'SELECT word, cfi, sentence FROM encounters ORDER BY id',
    );

  test('a saved word is reported as saved', async () => {
    expect(await isWordSaved(appService, '老闆')).toBe(false);
    await saveEncounter(appService, { word: '老闆', cfi: 'epubcfi(/6/4!/4/2)', sentence: 's' });
    expect(await isWordSaved(appService, '老闆')).toBe(true);
  });

  test('stores the book, place and sentence of an encounter', async () => {
    await saveEncounter(appService, {
      word: '老闆',
      bookHash: 'abc',
      bookTitle: '巧克力冒險工廠',
      cfi: 'epubcfi(/6/4!/4/2)',
      sentence: '老闆笑了。',
    });
    const rows = await db.select('SELECT * FROM encounters');
    expect(rows).toEqual([
      expect.objectContaining({
        word: '老闆',
        book_hash: 'abc',
        book_title: '巧克力冒險工廠',
        cfi: 'epubcfi(/6/4!/4/2)',
        sentence: '老闆笑了。',
      }),
    ]);
  });

  test('the same place is stored once, a new place adds an encounter', async () => {
    await saveEncounter(appService, { word: '老闆', cfi: 'epubcfi(/6/4!/4/2)' });
    await saveEncounter(appService, { word: '老闆', cfi: 'epubcfi(/6/4!/4/2)' });
    await saveEncounter(appService, { word: '老闆', cfi: 'epubcfi(/6/8!/4/6)' });
    expect((await encounters()).map((row) => row.cfi)).toEqual([
      'epubcfi(/6/4!/4/2)',
      'epubcfi(/6/8!/4/6)',
    ]);
    expect(await db.select('SELECT word FROM words')).toEqual([{ word: '老闆' }]);
  });

  test('a word without a place is saved without an encounter', async () => {
    await saveEncounter(appService, { word: '郊區' });
    await saveEncounter(appService, { word: '郊區' });
    expect(await isWordSaved(appService, '郊區')).toBe(true);
    expect(await encounters()).toEqual([]);
  });

  describe('listSavedWords', () => {
    // created_at comes from Date.now(); step the clock so the order is fixed.
    const saveAt = async (time: number, encounter: Parameters<typeof saveEncounter>[1]) => {
      vi.setSystemTime(time);
      await saveEncounter(appService, encounter);
    };

    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    test('lists words newest first, each with its encounters newest first', async () => {
      await saveAt(1000, {
        word: '老闆',
        bookHash: 'h1',
        bookTitle: '巧克力冒險工廠',
        cfi: 'epubcfi(/6/4!/4/2)',
        sentence: '老闆來了。',
      });
      await saveAt(2000, { word: '櫥窗', bookHash: 'h1', bookTitle: '巧克力冒險工廠', cfi: 'c2' });
      await saveAt(3000, {
        word: '老闆',
        bookHash: 'h2',
        bookTitle: '另一本書',
        cfi: 'epubcfi(/6/8!/4/6)',
        sentence: '老闆笑了。',
      });

      expect(await listSavedWords(appService)).toEqual([
        {
          word: '櫥窗',
          createdAt: 2000,
          encounters: [
            {
              bookHash: 'h1',
              bookTitle: '巧克力冒險工廠',
              cfi: 'c2',
              sentence: null,
              createdAt: 2000,
            },
          ],
        },
        {
          word: '老闆',
          createdAt: 1000,
          encounters: [
            {
              bookHash: 'h2',
              bookTitle: '另一本書',
              cfi: 'epubcfi(/6/8!/4/6)',
              sentence: '老闆笑了。',
              createdAt: 3000,
            },
            {
              bookHash: 'h1',
              bookTitle: '巧克力冒險工廠',
              cfi: 'epubcfi(/6/4!/4/2)',
              sentence: '老闆來了。',
              createdAt: 1000,
            },
          ],
        },
      ]);
    });

    test('lists a word without a place with no encounters', async () => {
      await saveAt(1000, { word: '郊區' });
      expect(await listSavedWords(appService)).toEqual([
        { word: '郊區', createdAt: 1000, encounters: [] },
      ]);
    });
  });

  test('opens vocab.db in Documents on iOS and in Data elsewhere', async () => {
    await isWordSaved(appService, '老闆');
    expect(appService.openDatabase).toHaveBeenLastCalledWith('vocab', 'vocab.db', 'Data');

    (appService as { isIOSApp: boolean }).isIOSApp = true;
    await isWordSaved(appService, '老闆');
    expect(appService.openDatabase).toHaveBeenLastCalledWith('vocab', '/docs/vocab.db', 'None');
  });
});
