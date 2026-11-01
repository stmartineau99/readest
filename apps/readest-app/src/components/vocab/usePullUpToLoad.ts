import { useEffect, useRef, useState } from 'react';

/** How far, in px, the finger must travel up before a release loads more. */
const PULL_THRESHOLD = 80;

/**
 * Calls `onLoad` when the user pulls up past the end of a list: a touch that
 * starts while `ref` (the row after the last item) is in view and travels up
 * past the threshold. Returns whether the pull is past it, for the row's label.
 */
export const usePullUpToLoad = (
  ref: React.RefObject<HTMLElement | null>,
  onLoad: () => void,
): boolean => {
  const [armed, setArmed] = useState(false);
  const onLoadRef = useRef(onLoad);
  onLoadRef.current = onLoad;

  useEffect(() => {
    let startY: number | null = null;
    let pastThreshold = false;

    const handleStart = (event: TouchEvent) => {
      const row = ref.current;
      if (!row || row.getBoundingClientRect().bottom > window.innerHeight) return;
      startY = event.touches[0]!.clientY;
      pastThreshold = false;
    };
    const handleMove = (event: TouchEvent) => {
      if (startY === null) return;
      const next = startY - event.touches[0]!.clientY > PULL_THRESHOLD;
      if (next !== pastThreshold) {
        pastThreshold = next;
        setArmed(next);
      }
    };
    const handleEnd = () => {
      if (startY === null) return;
      startY = null;
      setArmed(false);
      if (pastThreshold) onLoadRef.current();
    };

    document.addEventListener('touchstart', handleStart, { passive: true });
    document.addEventListener('touchmove', handleMove, { passive: true });
    document.addEventListener('touchend', handleEnd);
    document.addEventListener('touchcancel', handleEnd);
    return () => {
      document.removeEventListener('touchstart', handleStart);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleEnd);
      document.removeEventListener('touchcancel', handleEnd);
    };
  }, [ref]);

  return armed;
};
