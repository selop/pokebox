import heroFront from '@/assets/hero/sv3-5_en-170-front.webp'
import heroMask from '@/assets/hero/sv3-5_en-170-mask.webp'

/** Bundled textures for hero cards — keyed by `setId:cardId`. */
export const HERO_ASSETS: Record<string, { front?: string; mask?: string }> = {
  'sv3-5_en:170': { front: heroFront, mask: heroMask },
}
