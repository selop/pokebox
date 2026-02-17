# Multi-Set Support for Pokebox

## Context

The app currently supports a single hardcoded card set (sv3-5_en, 207 Gen 1 Pokemon cards). The `/public/cards/` directory has been renamed to `/public/sv3-5_en/` and a new set `/public/sv8-5_en/` (180 cards) has been added. Both sets include JSON metadata files (`sv3-5.en-US.json`, `sv8-5.en-US.json`) with card names, rarities, and foil type information. We need to make the app support multiple sets with a set-switcher dropdown in the toolbar.

## Approach: JSON-Driven Catalog Generation

Instead of hardcoding per-set catalogs, we'll parse the set JSON metadata files to auto-generate card catalogs at runtime. This makes adding future sets trivial.

## Files to Modify

### 1. `src/data/cardCatalog.ts` — Rewrite as dynamic, JSON-driven catalog

**Current**: Hardcoded 207 entries with `POKEMON_NAMES`, `HOLO_SUN_PILLAR`, `HOLO_SV_HOLO`, etc.

**New**:

- Define a `SetDefinition` interface with set ID, display name, card count, and default mask variant preference
- Define a `SET_REGISTRY` array listing available sets:
  ```ts
  { id: 'sv3-5_en', label: 'SV 151', jsonFile: 'sv3-5_en/sv3-5.en-US.json', defaultMask: 'ph' }
  { id: 'sv8-5_en', label: 'SV Prismatic', jsonFile: 'sv8-5_en/sv8-5.en-US.json', defaultMask: 'mph' }
  ```
- Add an async `loadSetCatalog(setId)` function that:
  1. Fetches the set's JSON metadata file
  2. Deduplicates entries per card number (takes the non-foil base entry for name, uses foil entries for rarity info)
  3. Maps `rarity.designation` + `foil.type` → `HoloType` using a mapping function:
     - `SPECIAL_ILLUSTRATION_RARE` → `'special-illustration-rare'`
     - `ULTRA_RARE` → `'ultra-rare'`
     - `DOUBLE_RARE` with `SUN_PILLAR_HOLO` → `'double-rare'`
     - `RARE` with `SV_HOLO_HOLO` → `'regular-holo'`
     - `ILLUSTRATION_RARE` → `'illustration-rare'`
     - Anything with `FLAT_SILVER_REVERSE` or `NONE` → `'reverse-holo'`
  4. Constructs texture paths using set ID prefix:
     - front: `{setId}/fronts/{id}_front_2x.webp`
     - mask: `{setId}/holo-masks/{setId}_{id}_{variant}.foil_up.webp` (variant from preferred mask, falling back: mph → ph → std)
     - foil: `{setId}/etch-foils/{setId}_{id}_{variant}.etch_4x.webp` (only for etched types)
  5. Returns `CardCatalogEntry[]`
- Keep a synchronous `CARD_CATALOG` export as a `ref` (or mutable array) that gets populated
- Export `SET_REGISTRY` for the UI dropdown

### 2. `src/types/index.ts` — Add set-related types

- Add `SetDefinition` interface: `{ id: string, label: string, jsonFile: string, defaultMask: string }`
- Add `SetId` type (or keep it as `string` for extensibility)

### 3. `src/stores/app.ts` — Add `currentSetId` + set-switching logic

- Add `currentSetId` ref (default: `'sv3-5_en'`)
- Add `setLoading` ref for loading state
- Make `displayCardIds` use the reactive catalog
- Add `switchSet(setId)` action that:
  1. Sets `setLoading = true`
  2. Calls `loadSetCatalog(setId)`
  3. Updates the catalog reference
  4. Resets `currentCardId` to first card in new set
  5. Sets `setLoading = false`
  6. Triggers rebuild
- Update `resetDefaults()` to not hardcode card ID `'170'` — use first card of current set

### 4. `src/composables/useCardLoader.ts` — Clear cache on set switch

- Import the reactive catalog instead of static `CARD_CATALOG`
- Add a `clearCache()` method that disposes all loaded textures and clears the `loaded` map
- The store's `switchSet()` will call this before loading the new catalog

### 5. `src/components/ToolbarButtons.vue` — Add set selector dropdown

- Import `SET_REGISTRY` and `currentSetId` from store
- Add a `<select>` dropdown styled like existing toolbar buttons:
  ```html
  <select v-model="store.currentSetId" @change="store.switchSet($event.target.value)">
    <option v-for="set in SET_REGISTRY" :value="set.id">{{ set.label }}</option>
  </select>
  ```
- Place it as the first element in the toolbar (before Settings button)

### 6. `src/components/CardSearch.vue` — Use reactive catalog

- Change `CARD_CATALOG` import to use the reactive catalog from the store/data module
- The `filtered` computed will automatically update when the catalog changes

### 7. `src/components/CalibrationPanel.vue` — Use reactive catalog

- Same as CardSearch — switch to reactive catalog reference

### 8. `src/components/ShaderControlsPanel.vue` — Use reactive catalog

- Same import change

### 9. `src/three/CardNavigator.ts` — Use reactive catalog

- Switch from static `CARD_CATALOG` to reactive reference
- Navigation wraps within current set's catalog

### 10. `src/composables/useThreeScene.ts` — Use reactive catalog

- Switch import to reactive catalog

## Key Design Decisions

- **Catalog as reactive ref**: Replace the static `CARD_CATALOG` array export with a `shallowRef<CardCatalogEntry[]>` that gets updated on set switch. All consumers already use it in computed/watchers so reactivity will propagate.
- **Mask variant fallback**: For sv8-5_en (defaultMask: `'mph'`), fall back to `ph` → `std` since only 67/180 cards have mph masks. For sv3-5_en (defaultMask: `'ph'`), fall back to `std`.
- **JSON fetch at runtime**: Fetch set JSON on demand (not at build time) to avoid bundling large JSON blobs. Cache after first load.
- **Texture cache clearing**: When switching sets, dispose Three.js textures and clear the loader cache to free GPU memory.
- **Card #056 in sv8-5_en**: Has no mask file — will render with `MeshBasicMaterial` (no holo effect), which is the existing fallback behavior.

## Verification

1. Run `bun dev` and verify sv3-5_en loads by default with existing behavior
2. Switch to sv8-5_en via toolbar dropdown — cards should load with correct names from JSON
3. Navigate cards with B/N keys — should wrap within current set
4. Search cards — CardSearch should show only current set's cards
5. Switch back to sv3-5_en — should restore correctly with texture cache cleared
6. Run `bun run build` to verify TypeScript compilation
7. Run `bun test:shader` to verify shader tests still pass
