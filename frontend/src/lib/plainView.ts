import { useCallback, useEffect, useState } from "react";

const KEY = "plain-view";

// Storage can throw (Safari private mode, blocked cookies): the toggle must still work.
function read(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

function write(plain: boolean) {
  try {
    localStorage.setItem(KEY, plain ? "1" : "0");
  } catch {
    // Not persisted; the choice still applies for this visit.
  }
}

/** A fast, animation-free layout for recruiters. Call once (in App) and pass it down. */
export function usePlainView(): [plain: boolean, toggle: () => void] {
  const [plain, setPlain] = useState(read);

  useEffect(() => {
    document.documentElement.dataset.view = plain ? "plain" : "full";
  }, [plain]);

  const toggle = useCallback(() => {
    setPlain((p) => {
      write(!p);
      return !p;
    });
  }, []);

  return [plain, toggle];
}
