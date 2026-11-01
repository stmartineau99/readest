import clsx from 'clsx';
import React, { useEffect, useRef, useState } from 'react';
import { MdChevronLeft, MdChevronRight, MdFilterList } from 'react-icons/md';
import Dialog from '@/components/Dialog';
import Dropdown from '@/components/Dropdown';
import { useEnv } from '@/context/EnvContext';
import { useTranslation } from '@/hooks/useTranslation';
import { listSavedWords, type SavedWord } from '@/services/vocab/vocabStore';
import { getLexiconEntry, type LexiconEntry } from '@/services/lexicon/lexicon';
import { BoxedList, NavigationRow } from '@/components/settings/primitives';
import { getLocale } from '@/utils/misc';
import SavedWordsFilters, {
  EMPTY_FILTER,
  hasActiveFilters,
  matchesFilter,
  type SavedWordsFilter,
} from './SavedWordsFilters';
import { MOCK_SAVED_WORDS } from './mockSavedWords';
import ToneColoredWord from './ToneColoredWord';

/** With `word`, the dialog opens on All words with that word's sentences expanded. */
export const setSavedWordsDialogVisible = (visible: boolean, word?: string) => {
  const dialog = document.getElementById('saved_words_window');
  if (dialog) {
    const event = new CustomEvent('setDialogVisibility', {
      detail: { visible, word },
    });
    dialog.dispatchEvent(event);
  }
};

/** The book list, or the words of one book (null = all words). */
type SavedWordsView = { kind: 'books' } | { kind: 'words'; book: string | null };

interface SavedWordsData {
  words: SavedWord[];
  lexicon: Map<string, LexiconEntry | null>;
}

/** The sentence with every occurrence of `word` a weight above the extralight sentence. */
const HighlightedSentence: React.FC<{ sentence: string; word: string }> = ({ sentence, word }) => {
  const parts = sentence.split(word);
  return (
    <>
      {parts.map((part, i) => (
        <React.Fragment key={i}>
          {part}
          {i < parts.length - 1 && <span className='text-base-content font-normal'>{word}</span>}
        </React.Fragment>
      ))}
    </>
  );
};

const SavedWordItem: React.FC<{
  saved: SavedWord;
  lexicon: LexiconEntry | null | undefined;
  expanded: boolean;
  onToggle: () => void;
  /** Scrolled into view when the dialog opens on this word. */
  focused?: boolean;
}> = ({ saved, lexicon, expanded, onToggle, focused }) => {
  const _ = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (focused) ref.current?.scrollIntoView?.({ block: 'nearest' });
  }, [focused]);
  const { word, encounters } = saved;
  // The rank is left to the dictionary card.
  const levels = [
    lexicon?.hsk != null ? `HSK ${lexicon.hsk === 7 ? '7–9' : lexicon.hsk}` : '',
    lexicon?.tocfl != null ? `TOCFL ${lexicon.tocfl}` : '',
  ]
    .filter(Boolean)
    .join(' · ');
  const canExpand = encounters.length > 0;

  return (
    <div ref={ref}>
      <button
        type='button'
        className='flex min-h-14 w-full items-center gap-3 py-2.5 pe-4 text-start'
        onClick={canExpand ? onToggle : undefined}
        disabled={!canExpand}
        aria-expanded={canExpand ? expanded : undefined}
      >
        <div className='flex min-w-0 flex-1 flex-col gap-0.5'>
          <div className='flex items-baseline gap-2'>
            <ToneColoredWord
              word={word}
              pinyin={lexicon?.pinyin}
              className='shrink-0 text-xl'
              fallbackClassName='text-base-content'
            />
            {lexicon?.pinyin && (
              <span className='text-base-content/65 truncate text-sm'>{lexicon.pinyin}</span>
            )}
            {levels && (
              <span className='text-base-content/65 ms-auto shrink-0 whitespace-nowrap text-xs'>
                {levels}
              </span>
            )}
          </div>
          {lexicon?.english ? (
            <span className='text-base-content/70 line-clamp-1 text-sm'>{lexicon.english}</span>
          ) : (
            <span className='text-base-content/60 text-sm italic'>{_('No English entry')}</span>
          )}
        </div>
        {/* Kept, hidden, on rows that can't expand so the levels line up. */}
        <MdChevronRight
          className={clsx('text-base-content/50 ms-2 shrink-0 transition-transform', {
            'rotate-90': expanded,
            invisible: !canExpand,
          })}
          size={18}
          aria-hidden
        />
      </button>
      {expanded && (
        <ul className='bg-base-200 divide-base-300 border-base-300 -ms-4 divide-y border-t'>
          {encounters.map((encounter) => (
            <li key={encounter.cfi} className='flex flex-col gap-1 py-3 pe-4 ps-8'>
              <span className='text-base-content text-[0.95em] font-extralight leading-relaxed'>
                {encounter.sentence ? (
                  <HighlightedSentence sentence={encounter.sentence} word={word} />
                ) : (
                  word
                )}
              </span>
              <span className='text-base-content/65 text-xs'>
                {[
                  encounter.bookTitle,
                  new Date(encounter.createdAt).toLocaleDateString(getLocale(), {
                    day: 'numeric',
                    month: 'short',
                  }),
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const SavedWordsContent: React.FC<{ focusWord: string | null }> = ({ focusWord }) => {
  const _ = useTranslation();
  const { appService } = useEnv();
  const [data, setData] = useState<SavedWordsData | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(focusWord ? [focusWord] : []),
  );
  const [filter, setFilter] = useState<SavedWordsFilter>(EMPTY_FILTER);
  const [view, setView] = useState<SavedWordsView>(
    focusWord ? { kind: 'words', book: null } : { kind: 'books' },
  );

  useEffect(() => {
    if (!appService) return;
    let cancelled = false;
    const load =
      process.env['NEXT_PUBLIC_VOCAB_MOCK'] === '1'
        ? Promise.resolve(MOCK_SAVED_WORDS)
        : listSavedWords(appService);
    load
      .then(async (words) => {
        // One at a time on the shared connection; a failed lookup only drops that word's line.
        const lexicon = new Map<string, LexiconEntry | null>();
        for (const { word } of words) {
          const entry = await getLexiconEntry(appService, word).catch((err) => {
            console.warn('Failed to look up', word, err);
            return null;
          });
          lexicon.set(word, entry);
        }
        if (!cancelled) setData({ words, lexicon });
      })
      .catch((err) => {
        console.error('Failed to load saved words:', err);
        if (!cancelled) setFailed(String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [appService]);

  const toggle = (word: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (!next.delete(word)) next.add(word);
      return next;
    });

  if (failed) {
    return (
      <div className='text-base-content/70 py-10 text-center'>
        <p>{_('Failed to load saved words')}</p>
        {/* TEMP: shows the error on the phone; remove once fixed. */}
        <p className='mt-2 break-all font-mono text-xs'>{failed}</p>
      </div>
    );
  }
  if (!data) return null;
  if (data.words.length === 0) {
    return <p className='text-base-content/70 py-10 text-center'>{_('No saved words')}</p>;
  }

  const wordCount = (count: number) => _('{{count}} words', { count });

  if (view.kind === 'books') {
    const books = [
      ...new Set(data.words.flatMap((w) => w.encounters.map((e) => e.bookTitle)).filter(Boolean)),
    ] as string[];
    const inBook = (book: string) =>
      data.words.filter((w) => w.encounters.some((e) => e.bookTitle === book)).length;
    return (
      <div className='flex flex-col gap-6 pb-6'>
        <BoxedList>
          <NavigationRow
            title={_('All words')}
            status={wordCount(data.words.length)}
            onClick={() => setView({ kind: 'words', book: null })}
          />
        </BoxedList>
        {books.length > 0 && (
          <BoxedList title={_('Books')}>
            {books.map((book) => (
              <NavigationRow
                key={book}
                title={book}
                status={wordCount(inBook(book))}
                onClick={() => setView({ kind: 'words', book })}
              />
            ))}
          </BoxedList>
        )}
      </div>
    );
  }

  const shown = data.words.filter((w) =>
    matchesFilter(w, data.lexicon.get(w.word), { ...filter, book: view.book }),
  );

  return (
    <div className='flex flex-col gap-4 pb-6'>
      <div className='flex items-center justify-between'>
        <button
          type='button'
          className='text-base-content flex items-center gap-1 py-1 text-sm'
          onClick={() => setView({ kind: 'books' })}
        >
          <MdChevronLeft size={20} />
          {view.book ?? _('All words')}
        </button>
        <Dropdown
          label={_('Filter words')}
          showTooltip={false}
          className='dropdown-bottom dropdown-end'
          menuClassName='no-triangle mt-1'
          buttonClassName={clsx(
            'btn btn-ghost btn-circle h-8 min-h-8 w-8 p-0',
            hasActiveFilters(filter) && 'bg-base-300',
          )}
          toggleButton={<MdFilterList size={18} className='fill-base-content' />}
        >
          <SavedWordsFilters filter={filter} onChange={setFilter} />
        </Dropdown>
      </div>
      <BoxedList title={wordCount(shown.length)}>
        {shown.length === 0 && (
          <p className='text-base-content/70 py-4 pe-4'>{_('No words match the filters')}</p>
        )}
        {shown.map((saved) => (
          <SavedWordItem
            key={saved.word}
            saved={saved}
            lexicon={data.lexicon.get(saved.word)}
            expanded={expanded.has(saved.word)}
            onToggle={() => toggle(saved.word)}
            focused={saved.word === focusWord}
          />
        ))}
      </BoxedList>
    </div>
  );
};

export const SavedWordsDialog: React.FC = () => {
  const _ = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [focusWord, setFocusWord] = useState<string | null>(null);

  useEffect(() => {
    const handleCustomEvent = (event: CustomEvent) => {
      setFocusWord(event.detail.word ?? null);
      setIsOpen(event.detail.visible);
    };

    const el = document.getElementById('saved_words_window');
    if (el) {
      el.addEventListener('setDialogVisibility', handleCustomEvent as EventListener);
    }

    return () => {
      if (el) {
        el.removeEventListener('setDialogVisibility', handleCustomEvent as EventListener);
      }
    };
  }, []);

  return (
    <Dialog
      id='saved_words_window'
      isOpen={isOpen}
      title={_('Saved Words')}
      onClose={() => setIsOpen(false)}
      useOverlayScroll
      boxClassName='sm:h-[85%]! sm:w-[560px]! sm:max-w-(--breakpoint-sm)!'
      contentClassName='px-4! sm:px-6! font-light'
    >
      {isOpen && <SavedWordsContent focusWord={focusWord} />}
    </Dialog>
  );
};

export default SavedWordsDialog;
