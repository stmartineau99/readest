import React, { useEffect, useState } from 'react';
import { MdExpandMore } from 'react-icons/md';
import clsx from 'clsx';
import { useEnv } from '@/context/EnvContext';
import { useTranslation } from '@/hooks/useTranslation';
import {
  getExampleSentences,
  type ExampleSentence,
  type MainlandWord,
} from '@/services/examples/sentences';
import './moedict.css';

/** Sentences shown before "More examples". */
const FIRST = 3;

interface Piece {
  text: string;
  /** Part of the looked-up word. */
  word: boolean;
  /** Part of a mainland word. */
  mainland: boolean;
  /** Set on the last piece of a mainland word: the Taiwan word shown after it. */
  taiwan?: string;
}

/**
 * Splits a sentence at the looked-up word and the mainland words, so each piece
 * can be styled. The word is found by text search, so 將 is also set apart
 * inside 將來 when both are in the sentence.
 */
export const splitSentence = (zh: string, word: string, mainland: MainlandWord[]): Piece[] => {
  const words: [number, number][] = [];
  for (let i = word ? zh.indexOf(word) : -1; i >= 0; i = zh.indexOf(word, i + word.length)) {
    words.push([i, i + word.length]);
  }
  const cuts = new Set([0, zh.length]);
  for (const [a, b] of words) cuts.add(a).add(b);
  for (const m of mainland) cuts.add(m.start).add(m.end);
  const sorted = [...cuts].filter((n) => n >= 0 && n <= zh.length).sort((x, y) => x - y);

  const pieces: Piece[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i]!;
    const b = sorted[i + 1]!;
    const span = mainland.find((m) => m.start <= a && b <= m.end);
    pieces.push({
      text: zh.slice(a, b),
      word: words.some(([s, e]) => s <= a && b <= e),
      mainland: !!span,
      taiwan: span && span.end === b ? span.taiwan : undefined,
    });
  }
  return pieces;
};

interface ExampleSentencesProps {
  word: string;
  /** The card's font scale, as for the definitions. */
  fontScale: number;
}

/** Example sentences under the dictionary card's definitions; renders nothing without any. */
const ExampleSentences: React.FC<ExampleSentencesProps> = ({ word, fontScale }) => {
  const _ = useTranslation();
  const { appService } = useEnv();
  const [sentences, setSentences] = useState<ExampleSentence[]>([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setSentences([]);
    setExpanded(false);
    if (!appService || !word) return;
    let cancelled = false;
    void getExampleSentences(appService, word).then((found) => {
      if (!cancelled) setSentences(found);
    });
    return () => {
      cancelled = true;
    };
  }, [appService, word]);

  if (sentences.length === 0) return null;
  const rest = sentences.length - FIRST;
  const shown = expanded ? sentences : sentences.slice(0, FIRST);

  return (
    <section
      data-testid='dict-examples'
      data-dict-content=''
      className='md-examples px-4 pt-4'
      style={{ '--dict-font-scale': fontScale } as React.CSSProperties}
    >
      <ul className='md-ex-list'>
        {shown.map((s, i) => (
          <li key={i} className='md-ex-item'>
            <p className='md-ex-zh' lang='zh-Hant'>
              {splitSentence(s.zh, word, s.mainland).map((p, j) => (
                <React.Fragment key={j}>
                  <span className={clsx(p.word && 'md-ex-word', p.mainland && 'md-ex-mainland')}>
                    {p.text}
                  </span>
                  {p.taiwan && <span className='md-ex-taiwan'>（台：{p.taiwan}）</span>}
                </React.Fragment>
              ))}
            </p>
            <p className='md-ex-en' lang='en'>
              {s.en}
            </p>
          </li>
        ))}
      </ul>
      {rest > 0 && (
        <button
          type='button'
          className='md-ex-more'
          aria-expanded={expanded}
          onClick={() => setExpanded((e) => !e)}
        >
          {expanded ? _('Fewer examples') : _('More examples ({{n}})', { n: rest })}
          <MdExpandMore aria-hidden='true' size={16} className={clsx(expanded && 'rotate-180')} />
        </button>
      )}
    </section>
  );
};

export default ExampleSentences;
