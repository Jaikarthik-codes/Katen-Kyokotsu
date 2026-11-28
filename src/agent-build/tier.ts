import { CONFIG } from './config';
import { clamp } from './math';

export interface Tier {
  name: 'desktop' | 'touch';
  agentsMin: number;
  agentsMax: number;
  /** report: intended intro length at the reference layer count. */
  targetSeconds: number;
  minSeconds: number;
  /** Guides and the build log: desktop only. */
  extras: boolean;
}

export const DESKTOP: Tier = Object.freeze({
  name: 'desktop',
  agentsMin: 18,
  agentsMax: 30,
  targetSeconds: 44,
  minSeconds: 12,
  extras: true,
});

export const TOUCH: Tier = Object.freeze({
  name: 'touch',
  agentsMin: 8,
  agentsMax: 14,
  targetSeconds: 26,
  minSeconds: 8,
  extras: false,
});

export function pickTier(finePointer: boolean, canHover: boolean): Tier {
  return finePointer && canHover ? DESKTOP : TOUCH;
}

/** report: the agent count grows in a straight line with build progress. */
export function agentsFor(tier: Tier, progress: number): number {
  return Math.round(tier.agentsMin + (tier.agentsMax - tier.agentsMin) * clamp(progress, 0, 1));
}

/** Keeps the reference pace per layer, so a smaller page gets a shorter intro. */
export function targetSecondsFor(tier: Tier, layers: number): number {
  const scaled = (layers * tier.targetSeconds) / CONFIG.referenceLayers;
  return clamp(scaled, tier.minSeconds, tier.targetSeconds);
}

/** Only a width change moves the layout; height-only changes are a phone's address bar. */
export function isLayoutResize(prevWidth: number, nextWidth: number): boolean {
  return Math.abs(nextWidth - prevWidth) > 1;
}
