import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";

/** A fresh client per test, no retries, so failures show up immediately. */
function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

export function renderWithQuery(ui: ReactNode) {
  return render(ui, { wrapper: makeWrapper() });
}

export function renderHookWithQuery<T>(hook: () => T) {
  return renderHook(hook, { wrapper: makeWrapper() });
}
