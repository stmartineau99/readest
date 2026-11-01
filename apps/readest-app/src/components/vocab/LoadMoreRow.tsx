import React, { useRef } from 'react';
import { MdArrowUpward } from 'react-icons/md';
import { useTranslation } from '@/hooks/useTranslation';
import { usePullUpToLoad } from './usePullUpToLoad';

/** The row after the last shown word: pull up past it, or tap it, to show `count` more. */
const LoadMoreRow: React.FC<{ count: number; onLoad: () => void }> = ({ count, onLoad }) => {
  const _ = useTranslation();
  const ref = useRef<HTMLButtonElement>(null);
  const armed = usePullUpToLoad(ref, onLoad);

  return (
    <button
      ref={ref}
      type='button'
      onClick={onLoad}
      className='text-base-content/70 flex w-full items-center justify-center gap-1.5 py-4 pe-4 text-sm'
    >
      <MdArrowUpward
        size={16}
        className={armed ? 'rotate-180 transition-transform' : 'transition-transform'}
      />
      {armed
        ? _('Release to load {{count}} more', { count })
        : _('Pull up for {{count}} more', { count })}
    </button>
  );
};

export default LoadMoreRow;
