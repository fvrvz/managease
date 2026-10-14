import { onCleanup } from 'solid-js';

/**
 * Calls `handler` when a click/touch occurs outside the given element.
 *
 * Usage:
 *   const ref = useClickOutside<HTMLDivElement>(() => setOpen(false));
 *   return <div ref={ref}>...</div>;
 */
export function useClickOutside<T extends HTMLElement>(handler: () => void): (el: T) => void {
  return (el: T) => {
    const listener = (e: MouseEvent | TouchEvent) => {
      if (!el.contains(e.target as Node)) handler();
    };
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    onCleanup(() => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    });
  };
}
