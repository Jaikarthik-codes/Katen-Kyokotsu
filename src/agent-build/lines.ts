import { clamp } from './math';

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Turns the client rects of a text element (one per inline fragment) into
 * one box per visual line. Rects whose vertical centre falls inside the
 * current line join it; anything else starts a new line.
 */
export function mergeLineRects(rects: readonly Box[]): Box[] {
  const sorted = rects.filter((r) => r.w > 0 && r.h > 0).sort((a, b) => a.y - b.y || a.x - b.x);
  const lines: Box[] = [];
  let left = 0;
  let top = 0;
  let right = 0;
  let bottom = 0;
  let open = false;

  for (const r of sorted) {
    const middle = r.y + r.h / 2;
    if (open && middle >= top && middle <= bottom) {
      left = Math.min(left, r.x);
      top = Math.min(top, r.y);
      right = Math.max(right, r.x + r.w);
      bottom = Math.max(bottom, r.y + r.h);
      continue;
    }
    if (open) lines.push({ x: left, y: top, w: right - left, h: bottom - top });
    left = r.x;
    top = r.y;
    right = r.x + r.w;
    bottom = r.y + r.h;
    open = true;
  }
  if (open) lines.push({ x: left, y: top, w: right - left, h: bottom - top });
  return lines;
}

/** Which line the reveal has reached, and how far into it (px). */
function locate(lines: readonly Box[], progress: number): { index: number; offset: number } {
  const total = lines.reduce((sum, line) => sum + line.w, 0);
  let remaining = clamp(progress, 0, 1) * total;
  for (let i = 0; i < lines.length; i++) {
    const width = lines[i]!.w;
    if (remaining <= width || i === lines.length - 1) {
      return { index: i, offset: Math.min(remaining, width) };
    }
    remaining -= width;
  }
  return { index: 0, offset: 0 };
}

/**
 * clip-path for a text element that is being "typed": everything above the
 * current line, plus the current line up to the reveal point. Coordinates are
 * relative to the element. Returns 'none' when nothing needs clipping.
 */
export function revealPolygon(lines: readonly Box[], progress: number, width: number): string {
  if (lines.length === 0 || progress >= 1) return 'none';
  const { index, offset } = locate(lines, progress);
  const line = lines[index]!;
  const top = Math.floor(line.y);
  const bottom = Math.ceil(line.y + line.h);
  const cut = Math.round(line.x + offset);
  const right = Math.ceil(width);
  return `polygon(0px 0px, ${right}px 0px, ${right}px ${top}px, ${cut}px ${top}px, ${cut}px ${bottom}px, 0px ${bottom}px)`;
}

/** Where the typing cursor sits: at the reveal point, centred on the current line. */
export function penPoint(lines: readonly Box[], progress: number): { x: number; y: number } {
  if (lines.length === 0) return { x: 0, y: 0 };
  const { index, offset } = locate(lines, progress);
  const line = lines[index]!;
  return { x: line.x + offset, y: line.y + line.h / 2 };
}
