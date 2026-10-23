export interface Debounced<A extends unknown[], R> {
  (...args: A): void;
  /** Runs the pending call now, if any, and returns its result. */
  flush(): R | undefined;
  /** Drops the pending call. */
  cancel(): void;
}

/** Delays `fn` until `ms` have passed without a new call; only the last arguments are used. */
export function debounce<A extends unknown[], R>(fn: (...args: A) => R, ms: number): Debounced<A, R> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending: A | undefined;

  const run = (): R | undefined => {
    clearTimeout(timer);
    timer = undefined;
    if (!pending) return undefined;
    const args = pending;
    pending = undefined;
    return fn(...args);
  };

  const debounced = (...args: A) => {
    pending = args;
    clearTimeout(timer);
    timer = setTimeout(run, ms);
  };
  debounced.flush = run;
  debounced.cancel = () => {
    clearTimeout(timer);
    timer = undefined;
    pending = undefined;
  };
  return debounced;
}
