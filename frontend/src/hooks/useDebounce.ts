import { createSignal, onCleanup } from 'solid-js';

/**
 * Returns a debounced version of `value` signal that only updates
 * after `delay` ms of no changes.
 */
export function useDebounce<T>(value: () => T, delay = 300): () => T {
  const [debounced, setDebounced] = createSignal<T>(value());
  let timeout: ReturnType<typeof setTimeout>;

  // Re-evaluate whenever value changes
  const update = () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => setDebounced(() => value()), delay);
  };

  // Run initially
  update();

  onCleanup(() => clearTimeout(timeout));

  return debounced;
}
