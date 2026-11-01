import React from 'react';
import { MdKeyboardArrowDown } from 'react-icons/md';
import { useTranslation } from '@/hooks/useTranslation';

/** A small down arrow after the last shown word: tapping it shows `count` more. */
const LoadMoreRow: React.FC<{ count: number; onLoad: () => void }> = ({ count, onLoad }) => {
  const _ = useTranslation();
  return (
    <button
      type='button'
      onClick={onLoad}
      aria-label={_('Show {{count}} more', { count })}
      className='text-base-content/50 flex w-full items-center justify-center py-3 pe-4'
    >
      <MdKeyboardArrowDown size={20} aria-hidden='true' />
    </button>
  );
};

export default LoadMoreRow;
