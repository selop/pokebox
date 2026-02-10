<script setup lang="ts">
import { useAppStore } from '@/stores/app'
import { useFullscreen } from '@/composables/useFullscreen'

const store = useAppStore()
const { isFullscreen, toggle: toggleFullscreen } = useFullscreen()
</script>

<template>
  <button class="toolbar-btn settings-btn" @click="store.togglePanel()">&#x2699; Settings</button>
  <button class="toolbar-btn fullscreen-btn" @click="toggleFullscreen">
    &#x26F6; {{ isFullscreen ? 'Exit FS' : 'Fullscreen' }}
  </button>
  <button
    class="toolbar-btn mode-btn"
    :class="{ solid: store.renderMode === 'solid' }"
    @click="store.toggleRenderMode()"
  >
    {{ store.renderMode === 'xray' ? '◈ X-Ray' : '◆ Solid' }}
  </button>
  <button
    v-show="store.sceneMode === 'cards'"
    class="toolbar-btn display-btn"
    @click="store.cardDisplayMode = store.cardDisplayMode === 'single' ? 'triple' : 'single'"
  >
    {{ store.cardDisplayMode === 'single' ? '&#x2630; Triple' : '&#x25A3; Single' }}
  </button>
  <button
    v-show="store.sceneMode === 'cards'"
    class="toolbar-btn shader-btn"
    @click="store.toggleShaderStyle()"
  >
    {{
      store.shaderStyle === 'illustration-rare'
        ? '&#x2728; Illus. Rare'
        : store.shaderStyle === 'regular-holo'
          ? '&#x2606; Regular Holo'
          : store.shaderStyle === 'special-illustration-rare'
            ? '&#x2747; Special IR'
            : store.shaderStyle === 'double-rare'
              ? '&#x2605; Double Rare'
              : store.shaderStyle === 'ultra-rare'
                ? '&#x2605; Ultra Rare'
                : store.shaderStyle === 'parallax'
                  ? '&#x2734; Parallax'
                  : '&#x2694; Metallic'
    }}
  </button>
  <button
    v-show="store.sceneMode === 'cards'"
    class="toolbar-btn shader-controls-btn"
    @click="store.toggleShaderPanel()"
  >
    &#x2699; Shader
  </button>
  <button
    v-show="store.sceneMode === 'furniture'"
    class="toolbar-btn randomize-btn"
    @click="store.randomizeSeed()"
  >
    &#x26A1; Randomize Interior
  </button>

  <div v-show="store.sceneMode === 'cards'" class="nav-hint">
    <kbd>B</kbd> prev &middot; <kbd>N</kbd> next
    <span v-show="store.cardDisplayMode === 'single'">&middot; <kbd>M</kbd> merge</span>
    &middot; <kbd>H</kbd> shader
  </div>
</template>

<style scoped>
.toolbar-btn {
  position: fixed;
  top: 20px;
  z-index: 60;
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border-radius: 8px;
  padding: 8px 14px;
  font-family: 'Space Mono', monospace;
  font-size: 0.65rem;
  color: #aaa;
  cursor: pointer;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  transition: all 0.2s;
}

.toolbar-btn:hover {
  border-color: #00f5d4;
  color: #00f5d4;
}

.settings-btn {
  left: 20px;
}
.fullscreen-btn {
  left: 130px;
}
.mode-btn {
  left: 260px;
}
.mode-btn.solid {
  border-color: #f72585;
  color: #f72585;
}
.display-btn {
  left: 350px;
}
.shader-btn {
  left: 440px;
}
.shader-controls-btn {
  left: 570px;
}
.randomize-btn {
  left: 350px;
}

.nav-hint {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 60;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 8px;
  padding: 6px 12px;
  font-family: 'Space Mono', monospace;
  font-size: 0.6rem;
  color: rgba(255, 255, 255, 0.4);
  letter-spacing: 0.05em;
}

.nav-hint kbd {
  display: inline-block;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 3px;
  padding: 1px 5px;
  font-family: 'Space Mono', monospace;
  font-size: 0.6rem;
  color: rgba(255, 255, 255, 0.6);
}
</style>
