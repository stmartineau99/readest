import { describe, expect, it } from 'vitest';
import { getPinyinTones, getSyllableTone } from '@/services/lexicon/pinyinTones';

describe('getSyllableTone', () => {
  it('reads tones 1–4 from the diacritic', () => {
    expect(['mā', 'má', 'mǎ', 'mà'].map(getSyllableTone)).toEqual([1, 2, 3, 4]);
  });

  it('reads ü with a tone mark', () => {
    expect(getSyllableTone('lǜ')).toBe(4);
  });

  it('gives 5 to a syllable with no mark', () => {
    expect(getSyllableTone('ma')).toBe(5);
  });
});

describe('getPinyinTones', () => {
  it('splits a reading into syllables with their tones', () => {
    expect(getPinyinTones('jīng qí')).toEqual([
      [
        { syllable: 'jīng', tone: 1 },
        { syllable: 'qí', tone: 2 },
      ],
    ]);
  });

  it('returns one list per reading', () => {
    expect(getPinyinTones('háng / xíng').map((r) => r.map((s) => s.tone))).toEqual([[2], [2]]);
  });

  it('drops punctuation in idioms', () => {
    expect(getPinyinTones('yī mù liǎo rán ， yī qīng èr chǔ')[0]).toHaveLength(8);
  });
});
