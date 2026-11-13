import React, { useEffect } from 'react';
import clsx from 'clsx';
import { create } from 'zustand';
import { useTranslation } from '@/hooks/useTranslation';
import ExampleSentences from './ExampleSentences';
import './moedict.css';

/**
 * Dictionary | Sentences tabs on the minimal-mode dictionary card, like Apple
 * Dictionary's tab row. The row sits at the top of the card header
 * (DictionaryResultsHeader) and the sentences panel in the body
 * (DictionaryResultsBody); this store connects the two.
 */
export type CardTab = 'dict' | 'sents';

export const useCardTab = create<{ tab: CardTab; setTab: (tab: CardTab) => void }>((set) => ({
  tab: 'dict',
  setTab: (tab) => set({ tab }),
}));

/** The tab row; selecting a tab only switches what the body shows. */
export const CardTabRow: React.FC = () => {
  const _ = useTranslation();
  const { tab, setTab } = useCardTab();
  const tabs: [CardTab, string][] = [
    ['dict', _('Dictionary')],
    ['sents', _('Sentences')],
  ];
  return (
    <div role='tablist' className='md-tab-row'>
      {tabs.map(([id, label]) => (
        <button
          key={id}
          type='button'
          role='tab'
          aria-selected={tab === id}
          className={clsx('md-tab', tab === id && 'md-tab-selected')}
          onClick={() => setTab(id)}
        >
          {label}
        </button>
      ))}
    </div>
  );
};

interface SentencesPanelProps {
  word: string;
  /** The card's font scale, as for the definitions. */
  fontScale: number;
}

/**
 * The body side: opens every new word on Dictionary, and while Sentences is
 * selected shows the sentences in their own scrolling panel. A rule in
 * moedict.css then hides the definitions (`[data-card-dict]`).
 */
export const SentencesPanel: React.FC<SentencesPanelProps> = ({ word, fontScale }) => {
  const { tab, setTab } = useCardTab();
  useEffect(() => setTab('dict'), [word, setTab]);
  if (tab !== 'sents') return null;
  // The reader page is select-none and the sheet inherits it; long press must select here.
  return (
    <div role='tabpanel' className='md-sents-panel min-h-0 flex-1 select-text overflow-y-auto pb-4'>
      <ExampleSentences word={word} fontScale={fontScale} />
    </div>
  );
};
