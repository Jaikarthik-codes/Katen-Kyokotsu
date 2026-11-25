let fillTextCalls = 0;

/** jsdom has no 2D canvas: record fillText calls instead of drawing. */
export function stubCanvas() {
  fillTextCalls = 0;
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
    () =>
      ({
        setTransform() {},
        clearRect() {},
        fillText() {
          fillTextCalls++;
        },
        measureText: () => ({ width: 6.6 }),
        font: "",
        textBaseline: "",
        fillStyle: "",
      }) as unknown as CanvasRenderingContext2D,
  );
}

export const canvasFillTextCalls = () => fillTextCalls;

export function mockMatchMedia(matches: Record<string, boolean>) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: Boolean(matches[query]),
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  }));
}
