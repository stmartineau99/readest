import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import CardTitle, { getCharZhuyin } from '@/components/vocab/CardTitle';
import type { LexiconEntry } from '@/services/lexicon/lexicon';

vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => (s: string) => s,
}));

const entry = (patch: Partial<LexiconEntry>): LexiconEntry => ({
  hsk: null,
  tocfl: null,
  rank: null,
  english: null,
  zhuyin: null,
  pinyin: null,
  chengyu: false,
  ...patch,
});

afterEach(() => cleanup());

describe('getCharZhuyin', () => {
  it('gives one syllable per character', () => {
    expect(getCharZhuyin('仔細', 'ㄗˇ ㄒㄧˋ')).toEqual(['ㄗˇ', 'ㄒㄧˋ']);
  });

  it("uses MoeDict's first reading when there are several", () => {
    expect(getCharZhuyin('便宜', 'ㄅㄧㄢˋ ㄧˊ / ㄆㄧㄢˊ ˙ㄧ')).toEqual(['ㄅㄧㄢˋ', 'ㄧˊ']);
  });

  it("returns null when the syllables don't line up with the characters", () => {
    expect(getCharZhuyin('一點兒', 'ㄧ ㄉㄧㄢˇㄦ')).toBeNull();
    expect(getCharZhuyin('部落格', null)).toBeNull();
  });
});

describe('CardTitle', () => {
  it('sets each syllable beside its character, tone mark and neutral dot apart', () => {
    render(<CardTitle word='便宜' entry={entry({ zhuyin: 'ㄆㄧㄢˊ ˙ㄧ', pinyin: 'pián yi' })} />);

    const chars = screen.getByTestId('dict-card-title').querySelectorAll('.md-headword-char');
    expect(chars).toHaveLength(2);
    expect(chars[0]!.querySelector('.md-zhuyin-col')!.textContent).toBe('ㄆㄧㄢ');
    expect(chars[0]!.querySelector('.md-zhuyin')!.lastElementChild!.textContent).toBe('ˊ');
    expect(chars[1]!.querySelector('.md-zhuyin-neutral')!.textContent).toBe('˙');
    expect(chars[1]!.querySelector('.md-zhuyin-col')!.textContent).toBe('˙ㄧ');
  });

  it('shows the pinyin of every reading and the lexicon line', () => {
    render(
      <CardTitle
        word='便宜'
        entry={entry({
          hsk: 2,
          tocfl: 'N1',
          rank: 982,
          zhuyin: 'ㄅㄧㄢˋ ㄧˊ / ㄆㄧㄢˊ ˙ㄧ',
          pinyin: 'biàn yí / pián yi',
        })}
      />,
    );

    expect(screen.getByTestId('dict-pinyin').textContent).toBe('biàn yí / pián yi');
    expect(screen.getByTestId('dict-lexicon').textContent).toBe('HSK 2 · TOCFL N1 · #982');
    expect(screen.queryByTestId('dict-chengyu')).toBeNull();
  });

  it('marks an idiom', () => {
    render(<CardTitle word='一毛不拔' entry={entry({ hsk: 7, chengyu: true })} />);
    expect(screen.getByTestId('dict-chengyu').textContent).toBe('成語');
  });

  it('shows just the headword for a word outside the lexicon', () => {
    render(<CardTitle word='部落格' entry={null} />);

    expect(screen.getByTestId('dict-card-title').textContent).toBe('部落格');
    expect(screen.queryByTestId('dict-pinyin')).toBeNull();
    expect(screen.queryByTestId('dict-lexicon')).toBeNull();
  });

  it('pronounces the word from the speaker button', () => {
    const onSpeak = vi.fn();
    render(<CardTitle word='仔細' entry={null} onSpeak={onSpeak} />);

    fireEvent.click(screen.getByLabelText('Speak'));
    expect(onSpeak).toHaveBeenCalledTimes(1);
  });
});
