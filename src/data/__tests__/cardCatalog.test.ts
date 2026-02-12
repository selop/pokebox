import { describe, it, expect } from 'vitest'
import { mapHoloType, extractPrefix, pickBestFoilEntry } from '../cardCatalog'
import type { SetCardJson } from '@/types'

// ---------------------------------------------------------------------------
// mapHoloType
// ---------------------------------------------------------------------------
describe('mapHoloType', () => {
  it('returns master-ball for RAINBOW + ETCHED', () => {
    expect(mapHoloType('COMMON', 'RAINBOW', 'ETCHED')).toBe('master-ball')
    expect(mapHoloType('UNCOMMON', 'RAINBOW', 'ETCHED')).toBe('master-ball')
  })

  it('returns special-illustration-rare for SPECIAL_ILLUSTRATION_RARE', () => {
    expect(mapHoloType('SPECIAL_ILLUSTRATION_RARE', 'SV_ULTRA', 'HOLO')).toBe(
      'special-illustration-rare',
    )
  })

  it('returns special-illustration-rare for HYPER_RARE', () => {
    expect(mapHoloType('HYPER_RARE', 'SV_ULTRA', 'HOLO')).toBe('special-illustration-rare')
  })

  it('returns ultra-rare for ULTRA_RARE', () => {
    expect(mapHoloType('ULTRA_RARE', 'SV_ULTRA', 'HOLO')).toBe('ultra-rare')
  })

  it('returns ultra-rare for ACE_SPEC_RARE', () => {
    expect(mapHoloType('ACE_SPEC_RARE', 'SV_ULTRA', 'HOLO')).toBe('ultra-rare')
  })

  it('returns double-rare for DOUBLE_RARE + SUN_PILLAR', () => {
    expect(mapHoloType('DOUBLE_RARE', 'SUN_PILLAR', 'HOLO')).toBe('double-rare')
  })

  it('returns illustration-rare for DOUBLE_RARE + non-SUN_PILLAR', () => {
    expect(mapHoloType('DOUBLE_RARE', 'SV_HOLO', 'HOLO')).toBe('illustration-rare')
    expect(mapHoloType('DOUBLE_RARE', 'FLAT_SILVER', 'REVERSE')).toBe('illustration-rare')
  })

  it('returns illustration-rare for ILLUSTRATION_RARE', () => {
    expect(mapHoloType('ILLUSTRATION_RARE', 'SUN_PILLAR', 'HOLO')).toBe('illustration-rare')
  })

  it('returns regular-holo for RARE + SV_HOLO', () => {
    expect(mapHoloType('RARE', 'SV_HOLO', 'HOLO')).toBe('regular-holo')
  })

  it('returns reverse-holo for RARE + non-SV_HOLO', () => {
    expect(mapHoloType('RARE', 'FLAT_SILVER', 'REVERSE')).toBe('reverse-holo')
  })

  it('returns reverse-holo for COMMON and UNCOMMON', () => {
    expect(mapHoloType('COMMON', 'FLAT_SILVER', 'REVERSE')).toBe('reverse-holo')
    expect(mapHoloType('UNCOMMON', 'FLAT_SILVER', 'REVERSE')).toBe('reverse-holo')
  })

  it('returns reverse-holo for unknown designation', () => {
    expect(mapHoloType('PROMO', 'FLAT_SILVER', 'REVERSE')).toBe('reverse-holo')
  })

  it('RAINBOW without ETCHED mask follows designation, not master-ball', () => {
    expect(mapHoloType('COMMON', 'RAINBOW', 'REVERSE')).toBe('reverse-holo')
    expect(mapHoloType('RARE', 'RAINBOW', 'HOLO')).toBe('reverse-holo')
  })
})

// ---------------------------------------------------------------------------
// extractPrefix
// ---------------------------------------------------------------------------
describe('extractPrefix', () => {
  it('extracts ph from standard longFormID', () => {
    expect(extractPrefix('Ivysaur_sv3-5_2_ph_Uncommon_FlatSilver_Reverse')).toBe('ph')
  })

  it('extracts std from longFormID', () => {
    expect(extractPrefix('Charizard_sv3-5_6_std_Rare_SunPillar_Holo')).toBe('std')
  })

  it('extracts mph from longFormID', () => {
    expect(extractPrefix('Pikachu_sv8-5_25_mph_Common_Rainbow_Etched')).toBe('mph')
  })

  it('extracts sph from longFormID', () => {
    expect(extractPrefix('Eevee_sv8-5_133_sph_Common_FlatSilver_Reverse')).toBe('sph')
  })

  it('handles names with underscores', () => {
    expect(extractPrefix('Mr_Mime_sv3-5_122_ph_Rare_FlatSilver_Reverse')).toBe('ph')
  })

  it('falls back to std when no match', () => {
    expect(extractPrefix('NoSetCodeHere')).toBe('std')
    expect(extractPrefix('')).toBe('std')
  })

  it('handles double-digit set codes with hyphens', () => {
    expect(extractPrefix('Bulbasaur_sv12-5_1_ph_Common_FlatSilver_Reverse')).toBe('ph')
  })
})

// ---------------------------------------------------------------------------
// pickBestFoilEntry
// ---------------------------------------------------------------------------
describe('pickBestFoilEntry', () => {
  function makeEntry(foilType: string): SetCardJson {
    return {
      name: 'TestCard',
      collector_number: { numerator: '001', numeric: 1 },
      rarity: { designation: 'COMMON' },
      foil: { type: foilType, mask: 'REVERSE' },
      ext: { tcgl: { longFormID: 'TestCard_sv3-5_1_ph_Common_FlatSilver_Reverse' } },
    }
  }

  it('picks RAINBOW over everything', () => {
    const entries = [makeEntry('FLAT_SILVER'), makeEntry('SUN_PILLAR'), makeEntry('RAINBOW')]
    expect(pickBestFoilEntry(entries).foil!.type).toBe('RAINBOW')
  })

  it('picks non-FLAT_SILVER over FLAT_SILVER', () => {
    const entries = [makeEntry('FLAT_SILVER'), makeEntry('SV_HOLO')]
    expect(pickBestFoilEntry(entries).foil!.type).toBe('SV_HOLO')
  })

  it('falls back to first entry when all are FLAT_SILVER', () => {
    const entries = [makeEntry('FLAT_SILVER'), makeEntry('FLAT_SILVER')]
    expect(pickBestFoilEntry(entries)).toBe(entries[0])
  })

  it('picks RAINBOW even when it is first', () => {
    const entries = [makeEntry('RAINBOW'), makeEntry('SV_HOLO'), makeEntry('FLAT_SILVER')]
    expect(pickBestFoilEntry(entries).foil!.type).toBe('RAINBOW')
  })

  it('works with single entry', () => {
    const entries = [makeEntry('FLAT_SILVER')]
    expect(pickBestFoilEntry(entries).foil!.type).toBe('FLAT_SILVER')
  })
})
