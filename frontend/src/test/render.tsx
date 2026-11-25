import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";

/** A fresh client per test, no retries, so failures show up immediately. */
function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

export function renderWithQuery(ui: ReactNode) {
  const { client, wrapper } = makeWrapper();
  return { ...render(ui, { wrapper }), client };
}

export function renderHookWithQuery<T>(hook: () => T) {
  const { client, wrapper } = makeWrapper();
  return { ...renderHook(hook, { wrapper }), client };
}
