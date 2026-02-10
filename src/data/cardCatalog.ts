import type { CardCatalogEntry, HoloType } from '@/types'

// Gen 1 Pokédex names (001–151)
const POKEMON_NAMES: Record<string, string> = {
  '001': 'Bulbasaur',
  '002': 'Ivysaur',
  '003': 'Venusaur',
  '004': 'Charmander',
  '005': 'Charmeleon',
  '006': 'Charizard',
  '007': 'Squirtle',
  '008': 'Wartortle',
  '009': 'Blastoise',
  '010': 'Caterpie',
  '011': 'Metapod',
  '012': 'Butterfree',
  '013': 'Weedle',
  '014': 'Kakuna',
  '015': 'Beedrill',
  '016': 'Pidgey',
  '017': 'Pidgeotto',
  '018': 'Pidgeot',
  '019': 'Rattata',
  '020': 'Raticate',
  '021': 'Spearow',
  '022': 'Fearow',
  '023': 'Ekans',
  '024': 'Arbok',
  '025': 'Pikachu',
  '026': 'Raichu',
  '027': 'Sandshrew',
  '028': 'Sandslash',
  '029': 'Nidoran♀',
  '030': 'Nidorina',
  '031': 'Nidoqueen',
  '032': 'Nidoran♂',
  '033': 'Nidorino',
  '034': 'Nidoking',
  '035': 'Clefairy',
  '036': 'Clefable',
  '037': 'Vulpix',
  '038': 'Ninetales',
  '039': 'Jigglypuff',
  '040': 'Wigglytuff',
  '041': 'Zubat',
  '042': 'Golbat',
  '043': 'Oddish',
  '044': 'Gloom',
  '045': 'Vileplume',
  '046': 'Paras',
  '047': 'Parasect',
  '048': 'Venonat',
  '049': 'Venomoth',
  '050': 'Diglett',
  '051': 'Dugtrio',
  '052': 'Meowth',
  '053': 'Persian',
  '054': 'Psyduck',
  '055': 'Golduck',
  '056': 'Mankey',
  '057': 'Primeape',
  '058': 'Growlithe',
  '059': 'Arcanine',
  '060': 'Poliwag',
  '061': 'Poliwhirl',
  '062': 'Poliwrath',
  '063': 'Abra',
  '064': 'Kadabra',
  '065': 'Alakazam',
  '066': 'Machop',
  '067': 'Machoke',
  '068': 'Machamp',
  '069': 'Bellsprout',
  '070': 'Weepinbell',
  '071': 'Victreebel',
  '072': 'Tentacool',
  '073': 'Tentacruel',
  '074': 'Geodude',
  '075': 'Graveler',
  '076': 'Golem',
  '077': 'Ponyta',
  '078': 'Rapidash',
  '079': 'Slowpoke',
  '080': 'Slowbro',
  '081': 'Magnemite',
  '082': 'Magneton',
  '083': "Farfetch'd",
  '084': 'Doduo',
  '085': 'Dodrio',
  '086': 'Seel',
  '087': 'Dewgong',
  '088': 'Grimer',
  '089': 'Muk',
  '090': 'Shellder',
  '091': 'Cloyster',
  '092': 'Gastly',
  '093': 'Haunter',
  '094': 'Gengar',
  '095': 'Onix',
  '096': 'Drowzee',
  '097': 'Hypno',
  '098': 'Krabby',
  '099': 'Kingler',
  '100': 'Voltorb',
  '101': 'Electrode',
  '102': 'Exeggcute',
  '103': 'Exeggutor',
  '104': 'Cubone',
  '105': 'Marowak',
  '106': 'Hitmonlee',
  '107': 'Hitmonchan',
  '108': 'Lickitung',
  '109': 'Koffing',
  '110': 'Weezing',
  '111': 'Rhyhorn',
  '112': 'Rhydon',
  '113': 'Chansey',
  '114': 'Tangela',
  '115': 'Kangaskhan',
  '116': 'Horsea',
  '117': 'Seadra',
  '118': 'Goldeen',
  '119': 'Seaking',
  '120': 'Staryu',
  '121': 'Starmie',
  '122': 'Mr. Mime',
  '123': 'Scyther',
  '124': 'Jynx',
  '125': 'Electabuzz',
  '126': 'Magmar',
  '127': 'Pinsir',
  '128': 'Tauros',
  '129': 'Magikarp',
  '130': 'Gyarados',
  '131': 'Lapras',
  '132': 'Ditto',
  '133': 'Eevee',
  '134': 'Vaporeon',
  '135': 'Jolteon',
  '136': 'Flareon',
  '137': 'Porygon',
  '138': 'Omanyte',
  '139': 'Omastar',
  '140': 'Kabuto',
  '141': 'Kabutops',
  '142': 'Aerodactyl',
  '143': 'Snorlax',
  '144': 'Articuno',
  '145': 'Zapdos',
  '146': 'Moltres',
  '147': 'Dratini',
  '148': 'Dragonair',
  '149': 'Dragonite',
  '150': 'Mewtwo',
  '151': 'Mew',
}

// Mask type groupings (cards not listed default to reverse_flat_silver)
const HOLO_SUN_PILLAR = new Set([
  3,
  6,
  9,
  24,
  38,
  40,
  65,
  76,
  115,
  124,
  145,
  151,
  ...Array.from({ length: 16 }, (_, i) => 166 + i), // 166–181
])
const HOLO_SV_HOLO = new Set([
  15, 26, 34, 45, 68, 85, 94, 101, 105, 110, 113, 121, 122, 130, 132, 134, 135, 136, 139, 141, 142,
  144, 146, 149, 150,
])
// Special illustration rare: cards #198-204 with iridescent glitter textures
const SPECIAL_ILLUSTRATION_RARE = new Set([198, 199, 200, 201, 202, 203, 204, 205, 206, 207])
// Double rare: ex cards with birthday holo textures
const DOUBLE_RARE = new Set([3, 6, 9, 24, 38, 40, 65, 76, 115, 124, 145, 151])

type MaskType =
  | 'foil_holo_sun_pillar'
  | 'foil_holo_sv_holo'
  | 'foil_reverse_flat_silver'
  | 'foil_etched_sun_pillar'
  | 'foil_etched_sv_ultra'

function getMaskType(num: number): MaskType {
  if (num >= 198) return 'foil_etched_sv_ultra'
  if (num >= 182) return 'foil_etched_sun_pillar'
  if (HOLO_SUN_PILLAR.has(num)) return 'foil_holo_sun_pillar'
  if (HOLO_SV_HOLO.has(num)) return 'foil_holo_sv_holo'
  return 'foil_reverse_flat_silver'
}

function getHoloType(num: number): HoloType {
  if (num >= 182 && num <= 197) return 'ultra-rare' // Full Art cards
  if (SPECIAL_ILLUSTRATION_RARE.has(num)) return 'special-illustration-rare'
  if (DOUBLE_RARE.has(num)) return 'double-rare'
  if (HOLO_SV_HOLO.has(num)) return 'regular-holo'
  return 'illustration-rare'
}

// Helper to determine mask suffix for new file format
function getMaskSuffix(num: number): 'ph' | 'std' {
  // Cards with _std suffix in new format (based on file listing)
  const stdCards = new Set([
    3, 6, 9, 15, 24, 26, 34, 38, 40, 45, 65, 68, 76, 85, 94, 101, 105, 110, 113, 115, 121, 122, 124,
    130, 132, 134, 135, 136, 139, 141, 142, 144, 145, 146, 149, 150, 151,
    ...Array.from({ length: 42 }, (_, i) => 166 + i), // 166-207 all use std
  ])
  return stdCards.has(num) ? 'std' : 'ph'
}

function buildEntry(num: number): CardCatalogEntry {
  const id = String(num).padStart(3, '0')
  const name = POKEMON_NAMES[id]
  const label = name ? `#${id} ${name}` : `#${id}`
  const maskType = getMaskType(num)
  const isEtched = maskType.includes('etched')
  const holoType = getHoloType(num)

  // Use new file naming pattern (sv3-5_en format)
  const maskSuffix = getMaskSuffix(num)
  const maskFile = `sv3-5_en_${id}_${maskSuffix}.foil_up.webp`
  const foilFile = `sv3-5_en_${id}_std.etch_4x.webp`

  const entry: CardCatalogEntry = {
    id,
    label,
    front: `cards/fronts/${id}_front_2x.webp`,
    mask: `cards/holo-masks/${maskFile}`,
    foil: isEtched ? `cards/etch-foils/${foilFile}` : '',
    holoType,
  }

  // Add iridescent textures for special-illustration-rare and ultra-rare cards
  if (holoType === 'special-illustration-rare' || holoType === 'ultra-rare') {
    entry.iri7 = 'img/151/iri-7.webp'
    entry.iri8 = 'img/151/iri-8.webp'
    entry.iri9 = 'img/151/iri-9.webp'
  }

  return entry
}

export const CARD_CATALOG: CardCatalogEntry[] = Array.from({ length: 207 }, (_, i) =>
  buildEntry(i + 1),
)
