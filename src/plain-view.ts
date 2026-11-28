import { VIEW_KEY } from './agent-build/gate';
import { safeSet } from './agent-build/storage';

/**
 * Plain view: a fast, scannable, printable page with no motion, for
 * recruiters who want the facts. The head gate applies the saved choice
 * before first paint; this module handles the toggle.
 */
export function isPlain(doc: Document): boolean {
  return doc.documentElement.dataset.view === 'plain';
}

export function setPlain(doc: Document, storage: Storage | null, on: boolean): void {
  if (on) doc.documentElement.dataset.view = 'plain';
  else delete doc.documentElement.dataset.view;
  safeSet(storage, VIEW_KEY, on ? 'plain' : null);
}

export function bindPlainToggle(
  button: HTMLButtonElement,
  doc: Document,
  storage: Storage | null,
  onChange?: (plain: boolean) => void,
): void {
  const sync = () => button.setAttribute('aria-pressed', String(isPlain(doc)));
  sync();
  button.addEventListener('click', () => {
    const next = !isPlain(doc);
    setPlain(doc, storage, next);
    sync();
    onChange?.(next);
  });
}
