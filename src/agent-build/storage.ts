/** localStorage, or null when the browser blocks it (private mode, cookies off). */
export function safeStorage(win: Window): Storage | null {
  try {
    return win.localStorage;
  } catch {
    return null;
  }
}

/** Writes a value, ignoring storage errors (full or blocked storage must never break the page). */
export function safeSet(storage: Storage | null, key: string, value: string | null): void {
  try {
    if (value === null) storage?.removeItem(key);
    else storage?.setItem(key, value);
  } catch {
    // Not worth failing over: the worst case is the intro plays again next visit.
  }
}
