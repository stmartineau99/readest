import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import ToneColoredWord from '@/components/vocab/ToneColoredWord';
import { EMPTY_FILTER, NO_LEVEL, matchesFilter } from '@/components/vocab/SavedWordsFilters';
import type { LexiconEntry } from '@/services/lexicon/lexicon';
import type { SavedWord } from '@/services/vocab/vocabStore';

const env = vi.hoisted(() => ({ appService: {}, envConfig: {} }));
const store = vi.hoisted(() => ({ listSavedWords: vi.fn() }));
const lexicon = vi.hoisted(() => ({ getLexiconEntry: vi.fn() }));
vi.mock('@/context/EnvContext', () => ({ useEnv: () => env }));
vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => (s: string, p?: Record<string, unknown>) =>
    p ? s.replace(/\{\{(\w+)\}\}/g, (_m, k: string) => String(p[k] ?? '')) : s,
}));
vi.mock('@/services/vocab/vocabStore', () => store);
vi.mock('@/services/lexicon/lexicon', () => lexicon);

const PRINCE = { bookHash: 'prince', bookTitle: '小王子' };
const CHOCOLATE = { bookHash: 'chocolate', bookTitle: '巧克力冒險工廠' };

const WORDS: SavedWord[] = [
  {
    word: '狐狸',
    createdAt: 3,
    encounters: [
      { ...PRINCE, cfi: 'c1', sentence: '就在這時候，狐狸出現了。', createdAt: 3 },
      { ...PRINCE, cfi: 'c2', sentence: '狐狸說。', createdAt: 2 },
    ],
  },
  {
    word: '驚奇',
    createdAt: 2,
    encounters: [{ ...CHOCOLATE, cfi: 'c3', sentence: '他驚奇地看著。', createdAt: 2 }],
  },
  { word: '世界', createdAt: 1, encounters: [] },
];

const entry = (fields: Partial<LexiconEntry>) =>
  ({ hsk: null, tocfl: null, ...fields }) as LexiconEntry;

const LEXICON: Record<string, LexiconEntry> = {
  狐狸: entry({ hsk: 6, tocfl: '4', pinyin: 'hú li', english: 'fox' }),
  驚奇: entry({ hsk: null, tocfl: '5', pinyin: 'jīng qí', english: 'to be amazed' }),
  世界: entry({ hsk: 3, tocfl: '2', pinyin: 'shì jiè', english: 'world' }),
};

afterEach(cleanup);

describe('matchesFilter', () => {
  const [fox, amazed, world] = WORDS as [SavedWord, SavedWord, SavedWord];
  const match = (saved: SavedWord, filter: Partial<typeof EMPTY_FILTER>) =>
    matchesFilter(saved, LEXICON[saved.word], { ...EMPTY_FILTER, ...filter });

  it('keeps every word with no filter', () => {
    expect(WORDS.every((w) => match(w, {}))).toBe(true);
  });

  it('keeps a word with any encounter in the book', () => {
    expect(match(fox, { book: '小王子' })).toBe(true);
    expect(match(amazed, { book: '小王子' })).toBe(false);
    expect(match(world, { book: '小王子' })).toBe(false);
  });

  it('keeps a word matching any of the chosen levels', () => {
    expect(match(fox, { hsk: ['3', '6'] })).toBe(true);
    expect(match(fox, { hsk: ['3'] })).toBe(false);
  });

  it('matches words without a level through NO_LEVEL', () => {
    expect(match(amazed, { hsk: [NO_LEVEL] })).toBe(true);
    expect(match(fox, { hsk: [NO_LEVEL] })).toBe(false);
    expect(matchesFilter(world, null, { ...EMPTY_FILTER, tocfl: [NO_LEVEL] })).toBe(true);
  });

  it('requires the HSK and TOCFL rows to both match', () => {
    expect(match(world, { hsk: ['3'], tocfl: ['2'] })).toBe(true);
    expect(match(world, { hsk: ['3'], tocfl: ['4'] })).toBe(false);
  });
});

describe('ToneColoredWord', () => {
  const charClasses = (container: HTMLElement) =>
    [...container.querySelectorAll('span > span')].map((el) => el.className);

  it('colors each character by its tone', () => {
    const { container } = render(<ToneColoredWord word='媽麻馬罵嗎' pinyin='mā má mǎ mà ma' />);
    const classes = charClasses(container);
    expect(classes).toHaveLength(5);
    ['red', 'green', 'blue', 'purple'].forEach((color, i) =>
      expect(classes[i]).toContain(`text-${color}-600`),
    );
    expect(classes[4]).toContain('text-base-content/60');
  });

  it('leaves a word with several readings uncolored', () => {
    const { container } = render(
      <ToneColoredWord word='行' pinyin='háng / xíng' fallbackClassName='plain' />,
    );
    expect(charClasses(container)).toHaveLength(0);
    expect(container.textContent).toBe('行');
    expect(container.firstElementChild!.className).toContain('plain');
  });

  it("leaves a word uncolored when the syllables don't line up", () => {
    const { container } = render(<ToneColoredWord word='狐狸' pinyin='hú' />);
    expect(charClasses(container)).toHaveLength(0);
  });

  it('leaves a word without pinyin uncolored', () => {
    const { container } = render(<ToneColoredWord word='狐狸' pinyin={null} />);
    expect(charClasses(container)).toHaveLength(0);
  });
});

describe('SavedWordsDialog', () => {
  beforeEach(() => {
    store.listSavedWords.mockResolvedValue(WORDS);
    lexicon.getLexiconEntry.mockImplementation(
      async (_app: unknown, word: string) => LEXICON[word],
    );
  });

  const openDialog = async () => {
    const { default: SavedWordsDialog, setSavedWordsDialogVisible } = await import(
      '@/components/vocab/SavedWordsDialog'
    );
    render(<SavedWordsDialog />);
    await act(async () => setSavedWordsDialogVisible(true));
  };

  const openBook = async (title: string) => {
    fireEvent.click(await screen.findByText(title));
  };

  it('opens on the book list with word counts', async () => {
    await openDialog();
    expect((await screen.findByText('All words')).closest('button')!.textContent).toContain(
      '3 words',
    );
    expect(screen.getByText('小王子').closest('button')!.textContent).toContain('1 words');
    expect(screen.getByText('巧克力冒險工廠').closest('button')!.textContent).toContain('1 words');
  });

  it("shows only a book's words, and the back arrow returns", async () => {
    await openDialog();
    await openBook('小王子');
    expect(screen.getByText('fox')).toBeTruthy();
    expect(screen.queryByText('to be amazed')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '小王子' }));
    expect(await screen.findByText('All words')).toBeTruthy();
  });

  it('shows a word saved without a book only under All words', async () => {
    await openDialog();
    await openBook('All words');
    expect(screen.getByText('world')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'All words' }));
    await openBook('巧克力冒險工廠');
    expect(screen.queryByText('world')).toBeNull();
  });

  it('expands a row to its sentences, with the word set apart', async () => {
    await openDialog();
    await openBook('All words');
    const row = screen.getByText('fox').closest('button')!;
    expect(row.getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(row);
    expect(row.getAttribute('aria-expanded')).toBe('true');
    const sentence = screen.getByText((_t, el) => el?.textContent === '就在這時候，狐狸出現了。');
    expect(sentence.querySelector('span')!.textContent).toBe('狐狸');
    expect(screen.getByText((_t, el) => el?.textContent === '狐狸說。')).toBeTruthy();
  });

  it("can't expand a row without sentences", async () => {
    await openDialog();
    await openBook('All words');
    const row = screen.getByText('world').closest('button')!;
    expect(row.disabled).toBe(true);
    expect(row.hasAttribute('aria-expanded')).toBe(false);
  });

  it('narrows the list with the level chips', async () => {
    await openDialog();
    await openBook('All words');
    const hskRow = screen.getByText('HSK').parentElement!;
    const chip = (label: string) =>
      [...hskRow.querySelectorAll('button')].find((b) => b.textContent === label)!;

    fireEvent.click(chip('3'));
    expect(chip('3').getAttribute('aria-pressed')).toBe('true');
    expect(chip('All').getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByText('1 words')).toBeTruthy();
    expect(screen.getByText('world')).toBeTruthy();
    expect(screen.queryByText('fox')).toBeNull();

    fireEvent.click(chip('–'));
    expect(screen.getByText('2 words')).toBeTruthy();
    expect(screen.getByText('to be amazed')).toBeTruthy();

    fireEvent.click(chip('All'));
    expect(screen.getByText('3 words')).toBeTruthy();
  });

  it('says so when no word matches the filters', async () => {
    await openDialog();
    await openBook('巧克力冒險工廠');
    const hskRow = screen.getByText('HSK').parentElement!;
    fireEvent.click([...hskRow.querySelectorAll('button')].find((b) => b.textContent === '1')!);
    expect(screen.getByText('No words match the filters')).toBeTruthy();
  });

  it('shows "No English entry" for a word without one', async () => {
    lexicon.getLexiconEntry.mockImplementation(async (_app: unknown, word: string) =>
      word === '世界' ? null : LEXICON[word],
    );
    await openDialog();
    await openBook('All words');
    expect(screen.getByText('No English entry')).toBeTruthy();
  });

  it('says so when there are no saved words', async () => {
    store.listSavedWords.mockResolvedValue([]);
    await openDialog();
    expect(await screen.findByText('No saved words')).toBeTruthy();
  });

  it('says so when the saved words fail to load', async () => {
    store.listSavedWords.mockRejectedValue(new Error('locked'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await openDialog();
    expect(await screen.findByText('Failed to load saved words')).toBeTruthy();
  });
});
