import React from 'react';
import { MdVolumeUp } from 'react-icons/md';
import clsx from 'clsx';
import { useTranslation } from '@/hooks/useTranslation';
import { formatLexiconEntry, type LexiconEntry } from '@/services/lexicon/lexicon';
import './moedict.css';

const TONE_MARK = /[ˊˇˋ]$/;

/** One zhuyin syllable per character from the first reading, or null when they don't line up. */
export const getCharZhuyin = (word: string, zhuyin: string | null | undefined): string[] | null => {
  const syllables = zhuyin?.split(' / ')[0]?.trim().split(/\s+/) ?? [];
  return syllables.length > 0 && syllables.length === [...word].length ? syllables : null;
};

/** A syllable set vertically to the right of its character: ˙ above, symbols, tone mark beside. */
const Zhuyin: React.FC<{ syllable: string }> = ({ syllable }) => {
  const neutral = syllable.startsWith('˙');
  const body = neutral ? syllable.slice(1) : syllable;
  const tone = body.match(TONE_MARK)?.[0];
  const symbols = tone ? body.slice(0, -1) : body;
  return (
    <span className='md-zhuyin' aria-hidden='true'>
      <span className='md-zhuyin-col'>
        {neutral ? <span className='md-zhuyin-neutral'>˙</span> : null}
        {[...symbols].map((symbol, i) => (
          <span key={i}>{symbol}</span>
        ))}
      </span>
      {tone ? <span>{tone}</span> : null}
    </span>
  );
};

interface CardTitleProps {
  word: string;
  entry: LexiconEntry | null | undefined;
  onSpeak?: () => void;
  speaking?: boolean;
}

/** Dictionary card header: headword with zhuyin, pinyin between bars, speaker, lexicon line. */
const CardTitle: React.FC<CardTitleProps> = ({ word, entry, onSpeak, speaking }) => {
  const _ = useTranslation();
  const zhuyin = getCharZhuyin(word, entry?.zhuyin);
  const lexiconText = formatLexiconEntry(entry ?? null);
  return (
    <div className='flex min-w-0 flex-col gap-1'>
      <div className='flex flex-wrap items-center gap-x-2.5 gap-y-1'>
        <span data-testid='dict-card-title' className='md-headword' lang='zh-TW'>
          {[...word].map((char, i) => (
            <span key={i} className='md-headword-char'>
              <span className='md-headword-glyph'>{char}</span>
              {zhuyin ? <Zhuyin syllable={zhuyin[i]!} /> : null}
            </span>
          ))}
        </span>
        {entry?.pinyin ? (
          <span data-testid='dict-pinyin' className='md-title-pinyin'>
            {entry.pinyin}
          </span>
        ) : null}
        {onSpeak ? (
          <button
            type='button'
            aria-label={_('Speak')}
            title={_('Speak')}
            aria-pressed={!!speaking}
            onClick={onSpeak}
            className={clsx(
              'btn btn-ghost btn-square btn-xs shrink-0',
              speaking
                ? 'text-base-content not-eink:animate-pulse'
                : 'text-base-content/60 hover:text-base-content not-eink:hover:bg-base-200/60',
            )}
          >
            <MdVolumeUp size={18} />
          </button>
        ) : null}
      </div>
      {lexiconText || entry?.chengyu ? (
        <div className='flex items-center gap-2'>
          {entry?.chengyu ? (
            <span
              data-testid='dict-chengyu'
              className='badge badge-sm badge-outline badge-primary eink:border-base-content eink:text-base-content'
            >
              成語
            </span>
          ) : null}
          {lexiconText ? (
            <span data-testid='dict-lexicon' className='not-eink:opacity-60 text-xs'>
              {lexiconText}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export default CardTitle;
