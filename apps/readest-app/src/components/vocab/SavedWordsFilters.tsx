import clsx from 'clsx';
import React from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import type { LexiconEntry } from '@/services/lexicon/lexicon';
import type { SavedWord } from '@/services/vocab/vocabStore';

/**
 * Book: one title, null = All. HSK and TOCFL: any of the chosen levels,
 * empty = All, NO_LEVEL = words without that level. Chengyu: idioms only.
 */
export interface SavedWordsFilter {
  book: string | null;
  hsk: string[];
  tocfl: string[];
  chengyu: boolean;
}

export const NO_LEVEL = 'none';
export const EMPTY_FILTER: SavedWordsFilter = { book: null, hsk: [], tocfl: [], chengyu: false };

/** Any filter the menu sets; the book comes from the dialog's view, not the menu. */
export const hasActiveFilters = (filter: SavedWordsFilter) =>
  filter.hsk.length > 0 || filter.tocfl.length > 0 || filter.chengyu;

const HSK_LEVELS = ['1', '2', '3', '4', '5', '6', '7'];
const TOCFL_LEVELS = ['N1', 'N2', '1', '2', '3', '4', '5'];

const matchesLevels = (choices: string[], level: string | null) =>
  choices.length === 0 || choices.includes(level ?? NO_LEVEL);

/** Tapping All clears the levels; tapping a level adds or removes it. */
const toggleLevel = (choices: string[], level: string | null) =>
  level === null
    ? []
    : choices.includes(level)
      ? choices.filter((l) => l !== level)
      : [...choices, level];

const isLevelSelected = (choices: string[], level: string | null) =>
  level === null ? choices.length === 0 : choices.includes(level);

export const matchesFilter = (
  saved: SavedWord,
  lexicon: LexiconEntry | null | undefined,
  filter: SavedWordsFilter,
): boolean =>
  (filter.book === null || saved.encounters.some((e) => e.bookTitle === filter.book)) &&
  matchesLevels(filter.hsk, lexicon?.hsk != null ? String(lexicon.hsk) : null) &&
  matchesLevels(filter.tocfl, lexicon?.tocfl ?? null) &&
  (!filter.chengyu || !!lexicon?.chengyu);

interface ChipRowProps {
  label: string;
  options: { value: string | null; label: string }[];
  isSelected: (value: string | null) => boolean;
  onSelect: (value: string | null) => void;
}

const ChipRow: React.FC<ChipRowProps> = ({ label, options, isSelected, onSelect }) => (
  <div className='flex flex-col gap-1.5 py-2.5 first:pt-0'>
    {label && <span className='text-base-content/65 text-xs font-medium'>{label}</span>}
    <div className='flex flex-wrap gap-1.5'>
      {options.map(({ value, label: optionLabel }) => (
        <button
          key={value ?? 'all'}
          type='button'
          onClick={() => onSelect(value)}
          aria-pressed={isSelected(value)}
          className={clsx(
            'shrink-0 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs',
            isSelected(value)
              ? 'border-base-content bg-base-content text-base-100'
              : 'border-base-300 bg-base-100 text-base-content',
          )}
        >
          {optionLabel}
        </button>
      ))}
    </div>
  </div>
);

interface SavedWordsFiltersProps {
  /** Book titles to offer; omit to hide the book row (reader tab). */
  books?: string[];
  filter: SavedWordsFilter;
  onChange: (filter: SavedWordsFilter) => void;
  /** Set by `Dropdown`, which renders this panel as its menu. */
  menuClassName?: string;
}

/** The filter menu's panel, shown by a `Dropdown`. */
const SavedWordsFilters: React.FC<SavedWordsFiltersProps> = ({
  books,
  filter,
  onChange,
  menuClassName,
}) => {
  const _ = useTranslation();
  const all = { value: null, label: _('All') };

  return (
    <div
      className={clsx(
        'dropdown-content eink-bordered bg-base-100 divide-base-300 z-20 flex w-80 max-w-[calc(100vw-2rem)] flex-col divide-y rounded-lg p-3 shadow-2xl',
        menuClassName,
      )}
      role='group'
      aria-label={_('Filter words')}
    >
      {books && (
        <ChipRow
          label={_('Book')}
          options={[all, ...books.map((book) => ({ value: book, label: book }))]}
          isSelected={(book) => filter.book === book}
          onSelect={(book) => onChange({ ...filter, book })}
        />
      )}
      <ChipRow
        label='HSK'
        options={[
          all,
          ...HSK_LEVELS.map((level) => ({ value: level, label: level === '7' ? '7–9' : level })),
        ]}
        isSelected={(level) => isLevelSelected(filter.hsk, level)}
        onSelect={(level) => onChange({ ...filter, hsk: toggleLevel(filter.hsk, level) })}
      />
      <ChipRow
        label='TOCFL'
        options={[all, ...TOCFL_LEVELS.map((level) => ({ value: level, label: level }))]}
        isSelected={(level) => isLevelSelected(filter.tocfl, level)}
        onSelect={(level) => onChange({ ...filter, tocfl: toggleLevel(filter.tocfl, level) })}
      />
      <ChipRow
        label=''
        options={[{ value: 'chengyu', label: '成語' }]}
        isSelected={() => filter.chengyu}
        onSelect={() => onChange({ ...filter, chengyu: !filter.chengyu })}
      />
      <div className='flex justify-end pt-2.5'>
        <button
          type='button'
          disabled={!hasActiveFilters(filter)}
          onClick={() => onChange({ ...EMPTY_FILTER, book: filter.book })}
          className='eink-bordered btn btn-ghost h-7 min-h-7 rounded-full px-3 text-xs font-normal'
        >
          {_('Reset')}
        </button>
      </div>
    </div>
  );
};

export default SavedWordsFilters;
