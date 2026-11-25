/**
 * ASCII 3D renderer: samples a (2,3) torus knot, projects every surface point into a
 * character grid with a z-buffer, and shades each cell from dark to bright with RAMP.
 * Pure functions only (no DOM), so it is easy to test.
 */
export const RAMP = " .,-~:;=!*#$@";

export interface Knot {
  points: Float32Array;
  normals: Float32Array;
}

export interface Frame {
  /** Rows of characters, with the two brightest levels blanked out. */
  text: string[];
  /** Only the two brightest levels (drawn in the signal colour). */
  hot: string[];
}

const TUBE_RADIUS = 0.5;
const K2 = 9; // camera distance
const LIGHT = [-0.42, 0.62, -0.66] as const;
const EXTENT = 4.2; // knot radius incl. tube, with a little margin

function curve(t: number): [number, number, number] {
  const r = Math.cos(3 * t) + 2;
  return [r * Math.cos(2 * t), r * Math.sin(2 * t), -1.2 * Math.sin(3 * t)];
}

const normalize = (v: number[]) => {
  const len = Math.hypot(...v) || 1;
  return v.map((x) => x / len);
};

/** u samples along the knot, v around the tube. */
export function buildKnot(u: number, v: number): Knot {
  const points = new Float32Array(u * v * 3);
  const normals = new Float32Array(u * v * 3);
  for (let i = 0; i < u; i++) {
    const t = (i / u) * Math.PI * 2;
    const c = curve(t);
    const a = curve(t - 1e-3);
    const b = curve(t + 1e-3);
    const T = normalize([b[0] - a[0], b[1] - a[1], b[2] - a[2]]);
    const n = normalize([T[1], -T[0], 0]); // T x (0,0,1)
    const bn = [T[1] * n[2] - T[2] * n[1], T[2] * n[0] - T[0] * n[2], T[0] * n[1] - T[1] * n[0]];
    for (let j = 0; j < v; j++) {
      const s = (j / v) * Math.PI * 2;
      const cs = Math.cos(s);
      const sn = Math.sin(s);
      const k = (i * v + j) * 3;
      for (let q = 0; q < 3; q++) {
        const nr = n[q] * cs + bn[q] * sn;
        normals[k + q] = nr;
        points[k + q] = c[q] + nr * TUBE_RADIUS;
      }
    }
  }
  return { points, normals };
}

/** Rotate about X by `a`, then Z by `b`; cellAspect = cell height / cell width. */
export function renderFrame(knot: Knot, a: number, b: number, cols: number, rows: number, cellAspect: number): Frame {
  const { points: P, normals: N } = knot;
  const cA = Math.cos(a);
  const sA = Math.sin(a);
  const cB = Math.cos(b);
  const sB = Math.sin(b);
  const K = (Math.min(cols, rows * cellAspect) * 0.5 * K2) / EXTENT; // in cell widths
  const depth = new Float32Array(cols * rows);
  const level = new Uint8Array(cols * rows);
  const top = RAMP.length - 1;

  for (let k = 0; k < P.length; k += 3) {
    const y1 = P[k + 1] * cA - P[k + 2] * sA;
    const z1 = P[k + 1] * sA + P[k + 2] * cA;
    const x2 = P[k] * cB - y1 * sB;
    const y2 = P[k] * sB + y1 * cB;
    const ooz = 1 / (z1 + K2);
    const col = Math.floor(cols / 2 + K * x2 * ooz);
    const row = Math.floor(rows / 2 - (K * y2 * ooz) / cellAspect);
    if (col < 0 || row < 0 || col >= cols || row >= rows) continue;
    const idx = row * cols + col;
    if (ooz <= depth[idx]) continue;
    depth[idx] = ooz;
    const ny1 = N[k + 1] * cA - N[k + 2] * sA;
    const nz1 = N[k + 1] * sA + N[k + 2] * cA;
    const nx2 = N[k] * cB - ny1 * sB;
    const ny2 = N[k] * sB + ny1 * cB;
    const L = nx2 * LIGHT[0] + ny2 * LIGHT[1] + nz1 * LIGHT[2];
    level[idx] = L > 0 ? 1 + Math.min(top - 1, Math.floor(L * top)) : 1;
  }

  const text: string[] = [];
  const hot: string[] = [];
  for (let r = 0; r < rows; r++) {
    let t = "";
    let h = "";
    for (let c = 0; c < cols; c++) {
      const lv = level[r * cols + c];
      const isHot = lv >= top - 1;
      t += isHot ? " " : RAMP[lv];
      h += isHot ? RAMP[lv] : " ";
    }
    text.push(t);
    hot.push(h);
  }
  return { text, hot };
}
