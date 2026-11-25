import { useEffect, useRef, useState } from "react";
import { deviceTier, prefersReducedMotion } from "../lib/device";
import { buildKnot, renderFrame } from "./knot";
import { createWatchdog } from "./watchdog";

const INK = "#141414";
const SIGNAL = "#d4361b";

/** The live ASCII knot. Pauses off screen, adapts to weak devices, honours reduced motion. */
export function AsciiHero() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [samples, setSamples] = useState(() => (deviceTier() === "low" ? { u: 400, v: 20 } : { u: 640, v: 30 }));
  // Kept outside the effect so a quality change does not snap the knot back to its start.
  const angles = useRef({ a: 0.6, b: 0 });

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!wrap || !canvas || !ctx) return;

    const knot = buildKnot(samples.u, samples.v);
    let width = 0;
    let height = 0;
    let cols = 1;
    let rows = 1;
    let cellW = 6.6;
    let cellH = 12;
    const angle = angles.current;
    let drag: { x: number; y: number; a: number; b: number } | null = null;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = wrap.clientWidth;
      height = wrap.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const fontPx = width < 520 ? 9 : 11;
      ctx.font = `600 ${fontPx}px "JetBrains Mono Variable", ui-monospace, monospace`;
      ctx.textBaseline = "top";
      cellW = ctx.measureText("M").width || fontPx * 0.6;
      cellH = fontPx * 1.1;
      cols = Math.max(1, Math.floor(width / cellW));
      rows = Math.max(1, Math.floor(height / cellH));
    };

    const draw = () => {
      const frame = renderFrame(knot, angle.a, angle.b, cols, rows, cellH / cellW);
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = INK;
      frame.text.forEach((row, i) => ctx.fillText(row, 0, i * cellH));
      ctx.fillStyle = SIGNAL;
      frame.hot.forEach((row, i) => ctx.fillText(row, 0, i * cellH));
    };

    resize();
    const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => {
      resize();
      draw();
    });
    resizeObserver?.observe(wrap);

    if (prefersReducedMotion()) {
      draw(); // one static frame, no animation loop
      return () => resizeObserver?.disconnect();
    }

    let raf = 0;
    let visible = true;
    const watchdog = createWatchdog({
      minFps: 45,
      windowMs: 2000,
      onSlow: () => setSamples((s) => ({ u: s.u, v: Math.max(8, Math.floor(s.v / 2)) })),
    });
    const loop = (now: number) => {
      raf = 0;
      if (!visible) return;
      if (!drag) {
        angle.a += 0.011;
        angle.b += 0.006;
      }
      draw();
      watchdog.tick(now);
      raf = requestAnimationFrame(loop);
    };

    const intersection =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting;
            if (visible && !raf) raf = requestAnimationFrame(loop);
          });
    intersection?.observe(wrap);

    const onDown = (e: PointerEvent) => {
      drag = { x: e.clientX, y: e.clientY, a: angle.a, b: angle.b };
      wrap.setPointerCapture?.(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!drag) return;
      angle.b = drag.b + (e.clientX - drag.x) * 0.01;
      angle.a = drag.a + (e.clientY - drag.y) * 0.01;
    };
    const onUp = () => {
      drag = null;
    };
    wrap.addEventListener("pointerdown", onDown);
    wrap.addEventListener("pointermove", onMove);
    wrap.addEventListener("pointerup", onUp);
    wrap.addEventListener("pointercancel", onUp);

    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      intersection?.disconnect();
      resizeObserver?.disconnect();
      wrap.removeEventListener("pointerdown", onDown);
      wrap.removeEventListener("pointermove", onMove);
      wrap.removeEventListener("pointerup", onUp);
      wrap.removeEventListener("pointercancel", onUp);
    };
  }, [samples]);

  return (
    <div ref={wrapRef} className="relative h-[clamp(300px,44vw,560px)] w-full cursor-grab touch-pan-y select-none">
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        data-samples={samples.u * samples.v}
        className="absolute inset-0 h-full w-full"
      />
      <span className="sr-only">Rotating 3D knot drawn in text characters</span>
    </div>
  );
}
