import { shallowRef } from 'vue'
import type { CardCatalogEntry, HoloType, SetCardJson, SetDefinition } from '@/types'
import { assetUrl } from '@/utils/assetUrl'

export const SET_REGISTRY: SetDefinition[] = [
  { id: 'sv3-5_en', label: 'MEW 151', jsonFile: 'sv3-5_en/sv3-5.en-US.json' },
  { id: 'sv8-5_en', label: 'PRE Prismatic', jsonFile: 'sv8-5_en/sv8-5.en-US.json' },
  { id: 'sv4-5_en', label: 'PAF Paldean Fates', jsonFile: 'sv4-5_en/sv-4-5.en-US.json' },
  { id: 'sv5_en', label: 'TEF Temporal Forces', jsonFile: 'sv5_en/sv5.en-US.json' },
  { id: 'sv10_en', label: 'DRI Destined Rivals', jsonFile: 'sv10_en/set.json' },
  { id: 'me2-5_en', label: 'ASC Ascended Heros', jsonFile: 'me2-5_en/set.json' },
]

/** Reactive catalog — updated on set switch. */
export const CARD_CATALOG = shallowRef<CardCatalogEntry[]>([])

/** Cache fetched JSON per set to avoid re-fetching. */
const jsonCache = new Map<string, SetCardJson[]>()

export function mapHoloType(
  designation: string,
  foilType?: string,
  foilMask?: string,
  tags?: string[],
): HoloType {
  // Master-ball holo: RAINBOW foil with ETCHED mask (common/uncommon masterball variants)
  if (foilType === 'RAINBOW' && foilMask === 'ETCHED') return 'master-ball'

  switch (designation) {
    case 'SHINY_RARE':
      return 'shiny-rare'
    case 'SHINY_ULTRA_RARE':
      return 'ultra-rare'
    case 'SPECIAL_ILLUSTRATION_RARE':
      if (tags?.includes('TERA') && tags?.includes('SHINY')) {
        return 'tera-shiny-rare'
      }
      if (tags?.includes('TERA')) {
        return 'tera-rainbow-rare'
      }
      return 'special-illustration-rare'
    case 'MEGA_ATTACK_RARE':
      return 'tera-rainbow-rare'
    case 'MEGA_HYPER_RARE':
      return 'special-illustration-rare'
    case 'ULTRA_RARE':
      return 'ultra-rare'
    case 'DOUBLE_RARE':
      if (tags?.includes('TERA')) return 'tera-rainbow-rare'
      if (tags?.includes('MEGA_EVOLUTION')) return 'tera-rainbow-rare'
      if (foilType === 'SUN_PILLAR') return 'double-rare'
      if (foilType === 'SV_ULTRA' && foilMask === 'ETCHED') return 'rainbow-rare'

    case 'ILLUSTRATION_RARE':
      return 'illustration-rare'
    case 'HYPER_RARE':
      return 'special-illustration-rare'
    case 'ACE_SPEC_RARE':
      return 'ultra-rare'
    case 'RARE':
      if (foilType === 'SV_HOLO') return 'regular-holo'
      return 'reverse-holo'
    default:
      return 'reverse-holo'
  }
}

/**
 * Extract the file variant prefix from a card's longFormID.
 * longFormID format: "Name_set_num_PREFIX_Rarity_FoilType_FoilMask"
 * e.g. "Ivysaur_sv3-5_2_ph_Uncommon_FlatSilver_Reverse" → "ph"
 */
export function extractPrefix(longFormID: string): string {
  // Split and find the prefix token (4th underscore-delimited segment after set code)
  // Format: Name_setCode_cardNum_prefix_...
  // But name can contain underscores, so parse from the set code forward
  const setMatch = longFormID.match(/_([\w][\w-]*)_(\d+)_([a-z][a-z0-9]*)_/)
  return setMatch ? setMatch[3]! : 'std'
}

/**
 * Pick the best foil entry for a card from its foil-only JSON entries.
 * Priority: RAINBOW > non-FLAT_SILVER > FLAT_SILVER.
 */
export function pickBestFoilEntry(entries: SetCardJson[]): SetCardJson {
  return (
    entries.find((e) => e.foil!.type === 'RAINBOW') ||
    entries.find((e) => e.foil!.type !== 'FLAT_SILVER') ||
    entries[0]!
  )
}

export async function loadSetCatalog(setId: string): Promise<CardCatalogEntry[]> {
  const setDef = SET_REGISTRY.find((s) => s.id === setId)
  if (!setDef) throw new Error(`Unknown set: ${setId}`)

  // Fetch JSON (cached)
  let allCards = jsonCache.get(setId)
  if (!allCards) {
    const resp = await fetch(assetUrl(setDef.jsonFile))
    allCards = (await resp.json()) as SetCardJson[]
    jsonCache.set(setId, allCards)
  }

  // Only consider entries that have a foil attribute (skip non-holo variants)
  const foilCards = allCards.filter((c) => !!c.foil)

  // Group foil entries by card number
  const byNumber = new Map<string, SetCardJson[]>()
  for (const card of foilCards) {
    const num = card.collector_number.numerator
    const group = byNumber.get(num)
    if (group) group.push(card)
    else byNumber.set(num, [card])
  }

  // Build catalog entries
  const sortedNumbers = [...byNumber.keys()].sort()

  const entries = sortedNumbers.map((cardNum) => {
    const group = byNumber.get(cardNum)!
    const best = pickBestFoilEntry(group)
    const name = best.name
    const designation = best.rarity.designation
    const foilType = best.foil!.type
    const foilMask = best.foil!.mask
    const isEtched = foilMask === 'ETCHED'
    const holoType = mapHoloType(designation, foilType, foilMask, best.tags)

    // Get the file variant prefix from the JSON metadata, then map to actual files
    const jsonPrefix = extractPrefix(best.ext.tcgl.longFormID)
    // Map JSON prefix to file prefix (sph files were deleted, use mph instead)
    const maskPrefix = jsonPrefix === 'sph' ? 'mph' : jsonPrefix
    const label = `#${cardNum} ${name}`

    // Build texture paths (prefixed with asset base URL for CDN support)
    const front = assetUrl(`${setId}/fronts/${cardNum}_front_2x.webp`)
    const mask = assetUrl(`${setId}/holo-masks/${setId}_${cardNum}_${maskPrefix}.foil_up.webp`)

    // Etch foil (only for etched types)
    const foil = isEtched
      ? assetUrl(`${setId}/etch-foils/${setId}_${cardNum}_${maskPrefix}.etch_up.webp`)
      : ''

    const entry: CardCatalogEntry = { id: cardNum, label, front, mask, foil, holoType }

    // Add iridescent textures for special-illustration-rare and ultra-rare cards
    if (
      holoType === 'special-illustration-rare' ||
      holoType === 'ultra-rare' ||
      holoType === 'rainbow-rare'
    ) {
      entry.iri7 = 'img/151/iri-7.webp'
      entry.iri8 = 'img/151/iri-8.webp'
      entry.iri9 = 'img/151/iri-9.webp'
    }

    return entry
  })

  return entries
}
