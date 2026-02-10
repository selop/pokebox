# Plan: 3D Stacked Card Mode with Cutout Layers

## Context

The user wants a new viewing mode called "3D stacked mode" where multiple versions of the same card are displayed in a stack along the Z-axis (depth), with each layer having cutouts to reveal the layers beneath. This will create a dramatic parallax effect that benefits from the head-coupled off-axis perspective system.

### Requirements
- 10 versions of the same card stacked along Z-axis
- Each card layer should have cutouts/masks
- Should work with the existing head-tracking/off-axis perspective
- New display mode option (alongside 'single' and 'triple')

### Current System Understanding

From Phase 1 exploration, I've identified:

#### **Display Mode System** (`src/stores/app.ts`, `src/composables/useThreeScene.ts`)
- Currently has two modes: `'single'` (exploded layer view) and `'triple'` (side-by-side)
- `CardDisplayMode` type defined in `src/types/index.ts` (line 58)
- Mode switching handled by toolbar button and triggers scene rebuild
- Each mode has distinct layout logic in `rebuildScene()` function

#### **Off-Axis Perspective System** (`src/composables/useThreeScene.ts`, `useFaceTracking.ts`)
- Camera uses asymmetric frustum calculated per-frame: `makePerspective(left, right, top, bottom, near, far)`
- Eye position smoothly interpolated: `eyePos += (targetEye - eyePos) * smoothing`
- Screen at Z=0, cards positioned at negative Z (inside box)
- Head movement creates parallax through shifted frustum edges
- Box depth: `dims.screenH * 0.6` (60% of screen height)

#### **Card Positioning** (`src/composables/useThreeScene.ts`)
- Z-axis positioning: `-(cardTransform.z / 100) * boxD` (0-100% from screen to back of box)
- Current exploded view uses `zGap = dims.boxD * 0.08` (8% of box depth per layer)
- Cards positioned with `.position.set(x, y, z)` on Three.js meshes

#### **Texture & Mask System** (`src/data/cardCatalog.ts`, `src/three/buildCard.ts`)
- Cards have: `front`, `mask` (holo areas), `foil` (etched texture)
- Masks are grayscale textures: white = effect applied, black = no effect
- Shader materials use masks to control effect intensity per-pixel
- Current masks define holographic regions, not transparency cutouts

## Phase 1 Exploration Complete

Agents explored:
- Display modes and card rendering ✓
- Off-axis perspective camera system ✓
- Texture and mask/cutout handling ✓

## Phase 2: Design Complete

Plan agent has designed comprehensive implementation approach.

### User-Confirmed Design Choices

**Cutout Pattern Style**: Grid-based lattice pattern with uniform holes
- Circular or rectangular holes arranged in a regular grid
- Grid density increases with layer depth (sparse on front, dense on back)
- Layer 0: 3×3 grid (9 holes), Layer 9: 8×8 grid (64 holes)

**Edge Style**: Hard edges (sharp cutoff)
- Clean geometric cuts with no alpha gradient
- Binary transparency: 0 (transparent) or 1 (opaque)
- Creates paper-cutout aesthetic that's crisp and stylized

## Implementation Plan

### Overview

Create a new "stacked" display mode showing 10 layers of the same card along the Z-axis with procedurally generated grid-based cutout masks. Layers positioned with logarithmic Z-spacing for dramatic parallax with the existing head-coupled off-axis perspective system.

### Critical Implementation Details

#### 1. Type System & State Management

**File: `src/types/index.ts`** (line 58)
```typescript
export type CardDisplayMode = 'single' | 'triple' | 'stacked'
```

**File: `src/stores/app.ts`** (add after line 161)
```typescript
function toggleCardDisplayMode() {
  if (cardDisplayMode.value === 'single') {
    cardDisplayMode.value = 'triple'
  } else if (cardDisplayMode.value === 'triple') {
    cardDisplayMode.value = 'stacked'
  } else {
    cardDisplayMode.value = 'single'
  }
}
```

Export in return statement (line 162).

#### 2. Cutout Generator Module

**New file: `src/composables/useCutoutGenerator.ts`**

Creates grid-based lattice cutout patterns using Canvas API:

```typescript
export function generateCutoutPattern(
  cardId: string,
  layerIndex: number,
  width: number,
  height: number
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!

  // Fill opaque white background
  ctx.fillStyle = 'white'
  ctx.fillRect(0, 0, width, height)

  // Calculate grid density (3x3 for layer 0, 8x8 for layer 9)
  const gridSize = Math.floor(3 + (layerIndex / 9) * 5) // 3 → 8
  const cellWidth = width / gridSize
  const cellHeight = height / gridSize
  const holeSize = cellWidth * 0.6 // 60% of cell size

  // Cut circular holes in grid pattern
  ctx.globalCompositeOperation = 'destination-out'
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const x = (col + 0.5) * cellWidth
      const y = (row + 0.5) * cellHeight
      const radius = holeSize / 2

      ctx.beginPath()
      ctx.arc(x, y, radius, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  return canvas
}
```

**Key features**:
- Grid density: 3×3 (layer 0) to 8×8 (layer 9)
- Circular holes at 60% of cell size
- Hard edges using `destination-out` compositing
- Returns canvas ready for Three.js `CanvasTexture`

#### 3. Scene Building Integration

**File: `src/composables/useThreeScene.ts`**

Add stacked mode branch after line 270 (after triple card layout):

```typescript
} else if (store.cardDisplayMode === 'stacked') {
  // Stacked mode: 10 layers with grid cutouts
  const id = store.displayCardIds[0]
  if (id) {
    const tex = cardLoader!.get(id)
    if (!tex) return

    const cardH = dims.screenH * store.config.cardSize
    const cardW = cardH * CARD_ASPECT
    const effectiveShader = getEffectiveShader(id)

    // Load shared shader textures once
    const iriTextures = ['special-illustration-rare', 'ultra-rare'].includes(effectiveShader)
      ? cardLoader!.getIriTextures() : null
    const birthdayTextures = effectiveShader === 'double-rare'
      ? cardLoader!.getBirthdayTextures() : null
    const glitterTexture = cardLoader!.getGlitterTexture()
    const cardBackTexture = cardLoader!.getCardBackTexture()

    // Generate 10 layers with logarithmic Z spacing
    for (let i = 0; i < 10; i++) {
      // Logarithmic Z distribution: front layers closer, back layers spread
      const t = i / 9 // 0.0 to 1.0
      const layerZ = -dims.boxD * (0.05 + 0.55 * Math.pow(t, 1.8))

      // Build card mesh
      const mesh = buildCardMesh(
        dims,
        tex.card,
        tex.mask,
        tex.foil,
        store.config,
        effectiveShader,
        iriTextures,
        birthdayTextures,
        glitterTexture,
        cardBackTexture,
      )

      // Generate and apply cutout mask (except last layer - solid back)
      if (i < 9) {
        const cutoutCanvas = generateCutoutPattern(id, i, 512, 512)
        const cutoutTexture = new CanvasTexture(cutoutCanvas)
        cutoutTexture.needsUpdate = true

        // Apply as alpha map for transparency
        ;(mesh.material as ShaderMaterial).alphaMap = cutoutTexture
        ;(mesh.material as ShaderMaterial).transparent = true
      }

      // Position layer in Z-stack
      mesh.position.set(centerX, cy, cz + layerZ)
      mesh.rotation.y = baseRotY
      mesh.userData.stackLayerIndex = i
      scene!.add(mesh)
      meshes.push(mesh)
    }
  }
}
```

**Z-Spacing Formula**:
```typescript
layerZ = -boxD * (0.05 + 0.55 * (i/9)^1.8)
```
- Layer 0: z ≈ -0.008 (nearly at screen)
- Layer 5: z ≈ -0.15 (middle)
- Layer 9: z ≈ -0.60 (full box depth)

**Update transform watcher** (after line 502):
```typescript
} else if (store.cardDisplayMode === 'stacked') {
  const dims = store.dimensions
  const cx = (store.cardTransform.x / 100) * dims.screenW
  const cy = (store.cardTransform.y / 100) * dims.screenH
  const cz = -(store.cardTransform.z / 100) * dims.boxD
  const baseRotY = cardAngle + (store.cardTransform.rotY * Math.PI) / 180

  meshes.forEach((mesh) => {
    const i = mesh.userData.stackLayerIndex || 0
    const t = i / 9
    const layerZ = -dims.boxD * (0.05 + 0.55 * Math.pow(t, 1.8))
    mesh.position.set(cx, cy, cz + layerZ)
    mesh.rotation.y = baseRotY
  })
}
```

**Add imports** (line 1):
```typescript
import { generateCutoutPattern } from '@/composables/useCutoutGenerator'
import { CanvasTexture } from 'three'
```

#### 4. UI Controls

**File: `src/components/ToolbarButtons.vue`**

**Update display button** (lines 22-27):
```vue
<button
  v-show="store.sceneMode === 'cards'"
  class="toolbar-btn display-btn"
  @click="store.toggleCardDisplayMode()"
>
  {{
    store.cardDisplayMode === 'single' ? '&#x2630; Triple'
    : store.cardDisplayMode === 'triple' ? '&#x2261; Stacked'
    : '&#x25A3; Single'
  }}
</button>
```

**Update keyboard hint** (lines 64-68):
```vue
<div v-show="store.sceneMode === 'cards'" class="nav-hint">
  <kbd>B</kbd> prev · <kbd>N</kbd> next
  <span v-show="store.cardDisplayMode === 'single'">· <kbd>M</kbd> merge</span>
  · <kbd>S</kbd> display · <kbd>H</kbd> shader
</div>
```

**File: `src/composables/useThreeScene.ts`**

**Add keyboard shortcut** (in `onKeydown` function, around line 428):
```typescript
if (e.key === 's' || e.key === 'S') {
  store.toggleCardDisplayMode()
  return
}
```

### Implementation Sequence

1. **Types & State** (15 min)
   - Update `CardDisplayMode` type in `src/types/index.ts`
   - Add `toggleCardDisplayMode()` to `src/stores/app.ts`

2. **Cutout Generator** (45 min)
   - Create `src/composables/useCutoutGenerator.ts`
   - Implement grid-based circular hole pattern
   - Test canvas generation with varying grid densities

3. **Scene Integration** (1.5 hours)
   - Add stacked mode branch to `rebuildScene()`
   - Implement 10-layer loop with Z-spacing
   - Apply cutout textures as alpha maps
   - Update transform watcher

4. **UI Controls** (30 min)
   - Update toolbar button toggle logic
   - Add 'S' keyboard shortcut
   - Update keyboard hints

5. **Testing & Polish** (1 hour)
   - Test parallax effect with head tracking
   - Verify cutout reveal works correctly
   - Performance profiling
   - Cross-browser testing

**Total Time**: ~4 hours

### Verification Testing

1. **Visual Verification**:
   - Toggle to stacked mode → should see 10 layers in depth
   - Move head left/right → dramatic parallax between layers
   - Front layers should have sparse holes (3×3 grid)
   - Back layers should have dense holes (8×8 grid)
   - Last layer (layer 9) should be solid (no cutouts)

2. **Interaction Verification**:
   - Press 'S' key → cycles through single/triple/stacked modes
   - Click display button → same cycling behavior
   - Navigate cards (B/N) → stacked view updates to new card
   - Adjust card transforms (sliders) → all 10 layers move together
   - Toggle shaders (H) → all layers update shader style

3. **Performance Verification**:
   - Monitor FPS in stacked mode → should maintain 60 FPS
   - Check Chrome DevTools Performance tab → verify no excessive draw calls
   - Test on laptop integrated graphics → verify acceptable performance

### Critical Files to Modify

1. **`/Users/selop/Git/pokebox/src/types/index.ts`** (line 58)
   - Add 'stacked' to CardDisplayMode type

2. **`/Users/selop/Git/pokebox/src/stores/app.ts`** (line 161)
   - Add toggleCardDisplayMode() function

3. **`/Users/selop/Git/pokebox/src/composables/useCutoutGenerator.ts`** (NEW)
   - Grid-based cutout pattern generator

4. **`/Users/selop/Git/pokebox/src/composables/useThreeScene.ts`** (lines 270, 502, 428)
   - Add stacked mode scene building
   - Add transform watcher case
   - Add keyboard shortcut

5. **`/Users/selop/Git/pokebox/src/components/ToolbarButtons.vue`** (lines 22-27, 64-68)
   - Update display button and keyboard hints

### Performance Considerations

- **Expected load**: 10 ShaderMaterial meshes per card (vs 2-4 in single mode)
- **Optimization**: All layers share base card texture (already loaded)
- **Optimization**: Cutout canvases at 512×512 (4× smaller than card textures)
- **Optimization**: ShaderMaterial materials reuse same shader code
- **Target**: 60 FPS on mid-range GPU (similar to triple mode)

### Design Rationale

**Grid-based cutouts**: Creates clean, geometric aesthetic with predictable reveal pattern. Easier to implement than random shapes, performs better (no complex path drawing), and looks intentional/designed rather than arbitrary.

**Hard edges**: Simpler rendering (binary alpha), better performance (no gradient calculations), matches paper-cutout aesthetic requested by user.

**Logarithmic Z-spacing**: Front layers tightly clustered for maximum parallax effect when head moves. Back layers spread to fill box depth. Power 1.8 chosen for good visual balance.

**10 layers**: Sweet spot between dramatic depth effect and performance. Fewer layers (5-6) wouldn't create enough depth separation; more layers (15+) would impact performance with diminishing returns.
