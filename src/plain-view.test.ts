import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VIEW_KEY } from './agent-build/gate';
import { safeStorage } from './agent-build/storage';
import { bindPlainToggle, isPlain, setPlain } from './plain-view';

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, value),
  };
}

function throwingStorage(): Storage {
  const fail = () => {
    throw new DOMException('Quota exceeded', 'QuotaExceededError');
  };
  return { length: 0, clear: fail, getItem: fail, key: fail, removeItem: fail, setItem: fail };
}

beforeEach(() => {
  delete document.documentElement.dataset.view;
  document.body.innerHTML = '<button id="plain-toggle" aria-pressed="false">Plain view</button>';
});

describe('setPlain', () => {
  it('turns plain view on and remembers it', () => {
    const storage = memoryStorage();
    setPlain(document, storage, true);
    expect(isPlain(document)).toBe(true);
    expect(storage.getItem(VIEW_KEY)).toBe('plain');
  });

  it('turns plain view off and forgets it', () => {
    const storage = memoryStorage();
    setPlain(document, storage, true);
    setPlain(document, storage, false);
    expect(isPlain(document)).toBe(false);
    expect(storage.getItem(VIEW_KEY)).toBeNull();
  });

  it('setPlain survives throwing storage', () => {
    expect(() => setPlain(document, throwingStorage(), true)).not.toThrow();
    expect(isPlain(document)).toBe(true);
  });

  it('works with no storage at all', () => {
    setPlain(document, null, true);
    expect(isPlain(document)).toBe(true);
  });
});

describe('bindPlainToggle', () => {
  it('flips aria-pressed and reports the new state', () => {
    const button = document.getElementById('plain-toggle') as HTMLButtonElement;
    const onChange = vi.fn();
    bindPlainToggle(button, document, memoryStorage(), onChange);

    button.click();
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(isPlain(document)).toBe(true);
    expect(onChange).toHaveBeenLastCalledWith(true);

    button.click();
    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(onChange).toHaveBeenLastCalledWith(false);
  });

  it('shows plain view as pressed when the head gate already turned it on', () => {
    document.documentElement.dataset.view = 'plain';
    const button = document.getElementById('plain-toggle') as HTMLButtonElement;
    bindPlainToggle(button, document, memoryStorage());
    expect(button.getAttribute('aria-pressed')).toBe('true');
  });
});

describe('safeStorage', () => {
  it('returns null when the browser blocks storage', () => {
    const win = {} as Window;
    Object.defineProperty(win, 'localStorage', {
      get() {
        throw new DOMException('The operation is insecure.', 'SecurityError');
      },
    });
    expect(safeStorage(win)).toBeNull();
  });

  it('returns the storage when it is available', () => {
    expect(safeStorage(window)).toBe(window.localStorage);
  });
});
