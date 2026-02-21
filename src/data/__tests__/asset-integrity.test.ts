/**
 * Asset integrity test — verifies texture files on disk match what set JSON expects.
 *
 * This test is OPTIONAL. Run explicitly with: bun test:assets
 * It is excluded from `bun test:unit` because contributors typically
 * don't have the full card asset sets checked out locally.
 */
import fs from 'node:fs'
import path from 'node:path'
import { describe, it, expect } from 'vitest'
import { extractPrefix, pickBestFoilEntry, SET_REGISTRY } from '../cardCatalog'
import type { SetCardJson } from '@/types'

const PUBLIC_DIR = path.resolve(__dirname, '../../../public')

describe('asset integrity — texture files match set JSON', () => {
  for (const setDef of SET_REGISTRY) {
    const jsonPath = path.join(PUBLIC_DIR, setDef.jsonFile)
    if (!fs.existsSync(jsonPath)) continue

    describe(setDef.label, () => {
      const allCards: SetCardJson[] = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
      const foilCards = allCards.filter((c) => !!c.foil)

      // Group foil entries by card number (same logic as loadSetCatalog)
      const byNumber = new Map<string, SetCardJson[]>()
      for (const card of foilCards) {
        const num = card.collector_number.numerator
        const group = byNumber.get(num)
        if (group) group.push(card)
        else byNumber.set(num, [card])
      }

      for (const [cardNum, group] of byNumber) {
        const best = pickBestFoilEntry(group)
        const jsonPrefix = extractPrefix(best.ext.tcgl.longFormID)
        const maskPrefix = jsonPrefix === 'sph' ? 'mph' : jsonPrefix
        const isEtched = best.foil!.mask === 'ETCHED'

        const frontPath = `${setDef.id}/fronts/${cardNum}_front_2x.webp`
        const maskPath = `${setDef.id}/holo-masks/${setDef.id}_${cardNum}_${maskPrefix}.foil_up.webp`

        it(`#${cardNum} front exists`, () => {
          expect(
            fs.existsSync(path.join(PUBLIC_DIR, frontPath)),
            `Missing: ${frontPath}`,
          ).toBe(true)
        })

        it(`#${cardNum} holo-mask exists (${maskPrefix})`, () => {
          expect(
            fs.existsSync(path.join(PUBLIC_DIR, maskPath)),
            `Missing: ${maskPath}`,
          ).toBe(true)
        })

        if (isEtched) {
          const etchPath = `${setDef.id}/etch-foils/${setDef.id}_${cardNum}_${maskPrefix}.etch_up.webp`
          it(`#${cardNum} etch-foil exists (${maskPrefix})`, () => {
            expect(
              fs.existsSync(path.join(PUBLIC_DIR, etchPath)),
              `Missing: ${etchPath}`,
            ).toBe(true)
          })
        }
      }
    })
  }
})
