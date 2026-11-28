import { CONFIG } from './config';
import { clamp, easeOutCubic } from './math';

export type LayerKind = 'text' | 'box' | 'media' | 'icon';

/** How long one job takes at 1× speed, in seconds. */
export function jobSeconds(kind: LayerKind, chars: number, w: number, h: number): number {
  switch (kind) {
    case 'text':
      return clamp(CONFIG.textBase + CONFIG.textPerChar * chars, CONFIG.textMin, CONFIG.textMax);
    case 'icon':
      return CONFIG.iconSeconds;
    case 'box':
    case 'media':
      return clamp(CONFIG.boxBase + (w + h) * CONFIG.boxPerPx, CONFIG.boxMin, CONFIG.boxMax);
  }
}

/** Size of a frame being dragged out from its top-left corner. */
export function frameAt(progress: number, w: number, h: number): { w: number; h: number } {
  const eased = easeOutCubic(progress);
  return { w: w * eased, h: h * eased };
}
