import React from 'react';
import { getPinyinTones } from '@/services/lexicon/pinyinTones';

/** Pleco's default tone colors: 1 red, 2 green, 3 blue, 4 purple, neutral gray. */
const TONE_CLASSES: Record<number, string> = {
  1: 'text-red-600 theme-dark:text-red-400',
  2: 'text-green-600 theme-dark:text-green-400',
  3: 'text-blue-600 theme-dark:text-blue-400',
  4: 'text-purple-600 theme-dark:text-purple-400',
  5: 'text-base-content/60',
};

const toneClass = (tone: number) => `${TONE_CLASSES[tone]} eink:text-base-content`;

/** One tone per character, or null when the word has several readings or they don't line up. */
const getCharTones = (word: string, pinyin: string | null | undefined): number[] | null => {
  const readings = pinyin ? getPinyinTones(pinyin) : [];
  const reading = readings.length === 1 ? readings[0]! : null;
  return reading && reading.length === [...word].length ? reading.map((s) => s.tone) : null;
};

interface ToneColoredWordProps {
  word: string;
  pinyin: string | null | undefined;
  className?: string;
  /** Used when the characters can't be tone-colored. */
  fallbackClassName?: string;
}

/** The word's characters, each in its tone color. */
const ToneColoredWord: React.FC<ToneColoredWordProps> = ({
  word,
  pinyin,
  className,
  fallbackClassName,
}) => {
  const tones = getCharTones(word, pinyin);
  if (!tones)
    return <span className={`${className ?? ''} ${fallbackClassName ?? ''}`}>{word}</span>;
  return (
    <span className={className}>
      {[...word].map((char, i) => (
        <span key={i} className={toneClass(tones[i]!)}>
          {char}
        </span>
      ))}
    </span>
  );
};

export default ToneColoredWord;
