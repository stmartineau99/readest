/** Tone 1–4 from the syllable's diacritic, 5 = neutral (no mark). */
const TONE_MARKS: Record<string, number> = {
  '̄': 1, // macron: ā
  '́': 2, // acute: á
  '̌': 3, // caron: ǎ
  '̀': 4, // grave: à
};

export const getSyllableTone = (syllable: string): number => {
  for (const char of syllable.normalize('NFD')) {
    const tone = TONE_MARKS[char];
    if (tone) return tone;
  }
  return 5;
};

/**
 * Splits tone-marked pinyin ("jīng qí", readings joined with " / ") into
 * syllables with their tones, one list per reading. Punctuation in idioms
 * ("，") is dropped.
 */
export const getPinyinTones = (pinyin: string): { syllable: string; tone: number }[][] =>
  pinyin.split(' / ').map((reading) =>
    reading
      .split(/\s+/)
      .filter((syllable) => /\p{L}/u.test(syllable))
      .map((syllable) => ({ syllable, tone: getSyllableTone(syllable) })),
  );
