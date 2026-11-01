/**
 * Dev-only stand-in for vocab.db, used when NEXT_PUBLIC_VOCAB_MOCK=1 (set on
 * the dev-server command line, never in an env file). Sentences are made up.
 */
import type { SavedWord } from '@/services/vocab/vocabStore';

const CHOCOLATE = { bookHash: 'mock-chocolate', bookTitle: '巧克力冒險工廠' };
const PRINCE = { bookHash: 'mock-prince', bookTitle: '小王子' };
const day = (d: number) => Date.UTC(2026, 9, d);

const HAND_PICKED: SavedWord[] = [
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

// 120 common words (HSK 2–5, by Taiwan frequency), to fill the list past one page of 50.
const FILLER_WORDS = (
  '可以 因為 自己 問題 如果 就是 可能 如何 所以 使用 個人 比較 需要 這樣 已經 提供 開始 方法 ' +
  '大家 但是 其他 應該 方式 不同 一定 發現 希望 而且 一直 選擇 分享 治療 不過 進行 以及 影響 ' +
  '對於 服務 生活 許多 產品 世界 其實 不要 是否 目前 除了 建議 幫助 因此 雖然 效果 同時 之後 ' +
  '有效 相關 無法 所有 之前 能夠 一般 健康 容易 成為 網路 最近 任何 特別 為了 出現 感覺 設計 ' +
  '原因 或是 部分 主要 專業 經驗 情況 活動 注意 適合 公司 機會 造成 功能 簡單 發生 資訊 必須 ' +
  '才能 過程 了解 直接 解決 結果 完全 甚至 認為 安全 發展 內容 運動 技術 快速 當然 環境 那麼 ' +
  '研究 關係 增加 另外 由於 資料 擁有 品質 改善 處理 皮膚 未來'
).split(' ');

const FILLER: SavedWord[] = FILLER_WORDS.map((word, i) => {
  const book = i % 2 === 0 ? CHOCOLATE : PRINCE;
  const createdAt = day(26) - i * 60_000;
  return {
    word,
    createdAt,
    encounters: [{ ...book, cfi: `mock-filler-${i}`, sentence: `他說：「${word}。」`, createdAt }],
  };
});

export const MOCK_SAVED_WORDS: SavedWord[] = [...HAND_PICKED, ...FILLER];
