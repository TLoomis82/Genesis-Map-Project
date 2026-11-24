// Helpers for the hand-drawn look: lines that wobble like a pen stroke, and repeatable randomness
// so a drawing is the same every time it is made.

export function seeded(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export type Point = [number, number];

/**
 * A smooth path through the points, each nudged a little off true, like a line drawn by hand.
 * amp is the largest nudge in drawing units. Closed shapes join back to their start.
 */
export function handLine(points: Point[], seed: number, amp = 3, closed = false): string {
  const rand = seeded(seed);
  const p = points.map(([x, y]) => [x + (rand() - 0.5) * 2 * amp, y + (rand() - 0.5) * 2 * amp] as Point);
  if (closed) p.push(p[0]);
  let d = `M ${p[0][0].toFixed(1)} ${p[0][1].toFixed(1)}`;
  for (let i = 1; i < p.length - 1; i++) {
    const mx = (p[i][0] + p[i + 1][0]) / 2;
    const my = (p[i][1] + p[i + 1][1]) / 2;
    d += ` Q ${p[i][0].toFixed(1)} ${p[i][1].toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
  }
  const last = p[p.length - 1];
  return `${d} L ${last[0].toFixed(1)} ${last[1].toFixed(1)}${closed ? " Z" : ""}`;
}

/** Points along a rolling line from x0 to x1: a base height plus slow swells. */
export function rolling(x0: number, x1: number, y: number, swell: number, seed: number, step = 60): Point[] {
  const rand = seeded(seed);
  const a = rand() * 6;
  const b = rand() * 6;
  const out: Point[] = [];
  for (let x = x0; x <= x1; x += step) {
    out.push([x, y + Math.sin(x / 210 + a) * swell + Math.sin(x / 97 + b) * swell * 0.35]);
  }
  return out;
}

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
/** 0 before a, 1 after b, eased in between. */
export const ease = (v: number, a: number, b: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
