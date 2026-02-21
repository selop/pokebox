import type { CardCatalogEntry } from '@/types'
import { loadSetCatalog } from '@/data/cardCatalog'

export interface HeroCard {
  setId: string
  cardId: string
}

export interface HeroCardEntry extends CardCatalogEntry {
  setId: string
  originalCardId: string
}

export const HERO_SHOWCASE: HeroCard[] = [
  { setId: 'sv3-5_en', cardId: '170' },
  { setId: 'sv3-5_en', cardId: '188' },
  { setId: 'sv3-5_en', cardId: '199' },
  { setId: 'sv8-5_en', cardId: '018' },
  { setId: 'sv8-5_en', cardId: '153' },
  { setId: 'sv8-5_en', cardId: '161' },
  { setId: 'sv4-5_en', cardId: '232' },
  { setId: 'sv4-5_en', cardId: '234' },
  { setId: 'sv10_en', cardId: '225' },
]

export function heroCompoundId(setId: string, cardId: string): string {
  return `${setId}:${cardId}`
}

export async function loadHeroCatalog(): Promise<HeroCardEntry[]> {
  // Group hero cards by set to minimize loadSetCatalog calls
  const bySet = new Map<string, HeroCard[]>()
  for (const hero of HERO_SHOWCASE) {
    const group = bySet.get(hero.setId)
    if (group) group.push(hero)
    else bySet.set(hero.setId, [hero])
  }

  // Load all set catalogs in parallel (JSON already cached from init preload)
  const setCatalogs = new Map<string, CardCatalogEntry[]>()
  await Promise.all(
    [...bySet.keys()].map(async (setId) => {
      const catalog = await loadSetCatalog(setId)
      setCatalogs.set(setId, catalog)
    }),
  )

  // Resolve each hero card from its set catalog
  const entries: HeroCardEntry[] = []
  for (const hero of HERO_SHOWCASE) {
    const catalog = setCatalogs.get(hero.setId)
    if (!catalog) continue
    const entry = catalog.find((c) => c.id === hero.cardId)
    if (!entry) continue
    entries.push({
      ...entry,
      id: heroCompoundId(hero.setId, hero.cardId),
      setId: hero.setId,
      originalCardId: hero.cardId,
    })
  }

  return entries
}
