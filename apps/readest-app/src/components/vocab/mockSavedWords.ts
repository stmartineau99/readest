/**
 * Dev-only stand-in for vocab.db, used when NEXT_PUBLIC_VOCAB_MOCK=1 (set on
 * the dev-server command line, never in an env file). Sentences are made up.
 */
import type { SavedWord } from '@/services/vocab/vocabStore';

const CHOCOLATE = { bookHash: 'mock-chocolate', bookTitle: '巧克力冒險工廠' };
const PRINCE = { bookHash: 'mock-prince', bookTitle: '小王子' };
const day = (d: number) => Date.UTC(2026, 9, d);

export const MOCK_SAVED_WORDS: SavedWord[] = [
  {
    word: '狐狸',
    createdAt: day(31),
    encounters: [
      { ...PRINCE, cfi: 'mock-1', sentence: '就在這時候，狐狸出現了。', createdAt: day(31) },
    ],
  },
  {
    word: '馴養',
    createdAt: day(31),
    encounters: [
      { ...PRINCE, cfi: 'mock-2', sentence: '「請你馴養我吧！」狐狸說。', createdAt: day(31) },
      { ...PRINCE, cfi: 'mock-3', sentence: '你要對你馴養過的東西負責。', createdAt: day(31) },
    ],
  },
  {
    word: '驚奇',
    createdAt: day(30),
    encounters: [
      { ...CHOCOLATE, cfi: 'mock-4', sentence: '這真是一個令人驚奇的工廠。', createdAt: day(30) },
      {
        ...CHOCOLATE,
        cfi: 'mock-5',
        sentence: '孩子們看到河流的時候，都驚奇得說不出話來。',
        createdAt: day(30),
      },
      { ...PRINCE, cfi: 'mock-6', sentence: '他用驚奇的眼光看著那朵花。', createdAt: day(29) },
    ],
  },
  {
    word: '一毛不拔',
    createdAt: day(30),
    encounters: [
      {
        ...CHOCOLATE,
        cfi: 'mock-12',
        sentence: '那個老闆一毛不拔，從不送人糖果。',
        createdAt: day(30),
      },
    ],
  },
  {
    word: '一丘之貉',
    createdAt: day(30),
    encounters: [
      {
        ...PRINCE,
        cfi: 'mock-13',
        sentence: '在他看來，那些大人都是一丘之貉。',
        createdAt: day(30),
      },
    ],
  },
  {
    word: '糖果',
    createdAt: day(30),
    encounters: [
      { ...CHOCOLATE, cfi: 'mock-7', sentence: '櫥窗裡擺滿了各種糖果。', createdAt: day(30) },
    ],
  },
  {
    word: '老闆',
    createdAt: day(29),
    encounters: [
      { ...CHOCOLATE, cfi: 'mock-8', sentence: '糖果店的老闆笑著看他。', createdAt: day(29) },
    ],
  },
  {
    word: '工廠',
    createdAt: day(29),
    encounters: [
      { ...CHOCOLATE, cfi: 'mock-9', sentence: '從來沒有人看過工廠裡面。', createdAt: day(29) },
    ],
  },
  {
    word: '櫥窗',
    createdAt: day(28),
    encounters: [
      { ...CHOCOLATE, cfi: 'mock-10', sentence: '他每天都站在櫥窗前面。', createdAt: day(28) },
    ],
  },
  {
    word: '星球',
    createdAt: day(28),
    encounters: [
      { ...PRINCE, cfi: 'mock-11', sentence: '小王子住在一個很小的星球上。', createdAt: day(28) },
    ],
  },
  { word: '巧克力', createdAt: day(27), encounters: [] },
];
