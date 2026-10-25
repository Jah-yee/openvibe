/**
 * Excalidraw calls onChange on every pointer move. Only a different key (scene
 * version plus viewport) is a change worth saving.
 */
export function createChangeDetector<A extends unknown[]>(keyOf: (...args: A) => string) {
  let lastKey: string | undefined;
  return (...args: A): boolean => {
    const key = keyOf(...args);
    if (key === lastKey) return false;
    lastKey = key;
    return true;
  };
}
