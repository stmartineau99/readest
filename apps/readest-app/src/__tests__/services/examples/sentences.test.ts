import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getExampleSentences, resetExamplesForTests } from '@/services/examples/sentences';
import type { DatabaseService } from '@/types/database';

const makeDb = (userVersion: number, rows: unknown[]) => ({
  select: vi.fn(async (sql: string, _params?: unknown[]) =>
    sql.startsWith('PRAGMA') ? [{ user_version: userVersion }] : rows,
  ),
  close: vi.fn(async () => {}),
});

const makeAppService = (exists: boolean, ...dbs: ReturnType<typeof makeDb>[]) => {
  const queue = [...dbs];
  return {
    databaseExists: vi.fn(async () => exists),
    openDatabase: vi.fn(async () => queue.shift() as unknown as DatabaseService),
    installDatabase: vi.fn(async () => {}),
    deleteDatabase: vi.fn(async () => {}),
  };
};

const rows = [
  { zh: '自行車當然會磨損。', en: 'Bicycles wear out.', swapped: '[[0, 3, "腳踏車"]]' },
  { zh: '這輛車保養起來很貴。', en: 'It is expensive running this car.', swapped: null },
];

beforeEach(() => {
  resetExamplesForTests();
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, blob: async () => new Blob(['db']) })),
  );
});

afterEach(() => vi.unstubAllGlobals());

describe('getExampleSentences', () => {
  it('returns the sentences in order with their mainland words', async () => {
    const appService = makeAppService(true, makeDb(6, rows));

    const found = await getExampleSentences(appService, '保養');

    expect(found).toEqual([
      {
        zh: '自行車當然會磨損。',
        en: 'Bicycles wear out.',
        mainland: [{ start: 0, end: 3, taiwan: '腳踏車' }],
      },
      { zh: '這輛車保養起來很貴。', en: 'It is expensive running this car.', mainland: [] },
    ]);
    expect(appService.installDatabase).not.toHaveBeenCalled();
  });

  it('reads the characters-only column, best first, at most 20', async () => {
    const db = makeDb(6, []);
    await getExampleSentences(makeAppService(true, db), '保養');

    const [sql, params] = db.select.mock.calls[1]!;
    expect(sql).toContain('s.zh_s2tw AS zh');
    expect(sql).toContain('ORDER BY e.ord');
    expect(params).toEqual(['保養', 20]);
  });

  it('replaces an installed copy older than the bundled one', async () => {
    const old = makeDb(5, []);
    const fresh = makeDb(6, rows);
    const appService = makeAppService(true, old, fresh);

    const found = await getExampleSentences(appService, '保養');

    expect(old.close).toHaveBeenCalled();
    expect(appService.deleteDatabase).toHaveBeenCalledWith('sentences_tatoeba.db', 'Data');
    expect(appService.installDatabase).toHaveBeenCalled();
    expect(found).toHaveLength(2);
  });

  it('returns nothing when the bundled file is missing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false })),
    );
    const appService = makeAppService(false);

    expect(await getExampleSentences(appService, '保養')).toEqual([]);
    expect(appService.openDatabase).not.toHaveBeenCalled();
  });
});
