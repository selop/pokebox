<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useAppStore } from '@/stores/app'
import { SET_REGISTRY } from '@/data/cardCatalog'
import mewPack from '@/assets/MEW-booster-pack.webp'
import prePack from '@/assets/PRE-booster-pack.webp'
import pafPack from '@/assets/PAF-booster-pack.webp'
import tefPack from '@/assets/TEF-booster-pack.webp'
import driPack from '@/assets/DRI-booster-pack.webp'
import ascPack from '@/assets/ASC-booster-pack.webp'
import pflPack from '@/assets/PFL-booster-pack.webp'

const store = useAppStore()

const packImages: Record<string, string> = {
  'sv3-5_en': mewPack,
  'sv8-5_en': prePack,
  'sv4-5_en': pafPack,
  sv5_en: tefPack,
  sv10_en: driPack,
  'me2-5_en': ascPack,
  me2_en: pflPack,
}

// --- Pack opening animation state ---
const animatingPackId = ref<string | null>(null)
const packPhase = ref<'idle' | 'focus' | 'shake' | 'burst'>('idle')

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && store.showBoosterModal) {
    close()
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))

function close() {
  // Block closing during animation
  if (packPhase.value !== 'idle') return
  store.showBoosterModal = false
}

async function selectSet(setId: string, event: MouseEvent) {
  // Guard against double-click, clicking during animation, or re-selecting current set
  if (packPhase.value !== 'idle') return
  if (setId === store.currentSetId) return

  animatingPackId.value = setId

  // Compute translation from the clicked pack's current position to viewport center.
  // This keeps the element in flow and uses transform to slide it smoothly.
  const btn = (event.currentTarget as HTMLElement)
  const rect = btn.getBoundingClientRect()
  const elCenterX = rect.left + rect.width / 2
  const elCenterY = rect.top + rect.height / 2
  const vpCenterX = window.innerWidth / 2
  const vpCenterY = window.innerHeight / 2
  const dx = vpCenterX - elCenterX
  const dy = vpCenterY - elCenterY
  btn.style.setProperty('--focus-tx', `${dx}px`)
  btn.style.setProperty('--focus-ty', `${dy}px`)

  // Start parallel set loading
  store.openPack(setId)

  // Phase 1: Focus (0.5s) — selected pack slides to center, others fade
  packPhase.value = 'focus'
  await delay(500)

  // Phase 2: Shake (0.3s) — pack wobbles with glow
  packPhase.value = 'shake'
  await delay(300)

  // Phase 3: Burst (0.4s) — pack explodes, flash overlay
  packPhase.value = 'burst'
  await delay(400)

  // Signal CSS animation done — store decides cascade vs waiting-load
  store.packCssAnimDone()

  // Reset local animation state and clean up inline custom properties
  packPhase.value = 'idle'
  animatingPackId.value = null
  btn.style.removeProperty('--focus-tx')
  btn.style.removeProperty('--focus-ty')
}
</script>

<template>
  <Transition name="booster-modal">
    <div v-if="store.showBoosterModal" class="booster-backdrop" @click.self="close">
      <button
        v-if="packPhase === 'idle'"
        class="close-btn"
        @click="close"
        aria-label="Close"
      >
        &times;
      </button>

      <!-- Loading spinner for slow-network case -->
      <div v-if="store.packOpeningPhase === 'waiting-load'" class="loading-spinner">
        Loading cards...
      </div>

      <div class="booster-grid">
        <button
          v-for="set in SET_REGISTRY"
          :key="set.id"
          class="booster-pack"
          :class="{
            active: set.id === store.currentSetId && packPhase === 'idle',
            loading: store.setLoading && packPhase === 'idle',
            'pack-focus': packPhase !== 'idle' && set.id === animatingPackId && packPhase === 'focus',
            'pack-shake': packPhase !== 'idle' && set.id === animatingPackId && packPhase === 'shake',
            'pack-burst': packPhase !== 'idle' && set.id === animatingPackId && packPhase === 'burst',
            'pack-hidden': packPhase !== 'idle' && set.id !== animatingPackId,
          }"
          :disabled="packPhase !== 'idle'"
          @click="selectSet(set.id, $event)"
        >
          <img
            v-if="packImages[set.id]"
            :src="packImages[set.id]"
            :alt="set.label"
            class="pack-image"
          />
          <span v-if="set.id === store.currentSetId && packPhase === 'idle'" class="pack-badge"
            >Selected</span
          >
        </button>
      </div>

      <!-- Radial flash overlay during burst phase -->
      <div v-if="packPhase === 'burst'" class="burst-flash" />
    </div>
  </Transition>
</template>

<style scoped>
.booster-backdrop {
  position: fixed;
  inset: 0;
  z-index: 150;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 151;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  font-size: 2.4rem;
  line-height: 1;
  cursor: pointer;
  padding: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    color 0.2s,
    transform 0.2s;
}

.close-btn:hover {
  color: #fff;
  transform: scale(1.15);
}

.booster-grid {
  display: flex;
  flex-wrap: nowrap;
  gap: 24px;
  justify-content: center;
  padding: 24px;
  max-width: 1280px;
}

.booster-pack {
  position: relative;
  width: 220px;
  border-radius: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0;
  transition:
    transform 0.25s ease,
    opacity 0.25s ease;
}

.pack-image {
  width: 100%;
  height: auto;
  display: block;
  object-fit: contain;
  pointer-events: none;
  border-radius: 8px;
  transition:
    filter 0.25s ease,
    box-shadow 0.25s ease;
}

.booster-pack:hover:not(:disabled) {
  transform: scale(1.08);
}

.booster-pack:hover:not(:disabled):not(.active) .pack-image {
  filter: drop-shadow(0 0 12px hsl(43, 100%, 65%)) drop-shadow(0 0 30px hsl(43, 100%, 55%));
}

.booster-pack:active:not(:disabled) {
  transform: scale(1.02);
}

.booster-pack:disabled {
  cursor: not-allowed;
}

.pack-badge {
  font-family: 'Space Mono', monospace;
  font-size: 1.5rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: hsl(47, 100%, 78%);
  margin-top: 10px;
}

/* ── Pack opening animation phases ── */

/* Non-selected packs fade out */
.pack-hidden {
  opacity: 0;
  transform: scale(0.8);
  transition:
    opacity 0.4s ease,
    transform 0.4s ease;
  pointer-events: none;
}

/* Phase 1: Focus — selected pack slides from its grid position to center with golden glow.
   --focus-tx / --focus-ty are set by JS based on the element's actual position. */
.pack-focus {
  z-index: 160;
  transform: translate(var(--focus-tx, 0), var(--focus-ty, 0)) scale(1.3);
  transition: transform 0.5s cubic-bezier(0.22, 1, 0.36, 1);
  pointer-events: none;
}

.pack-focus .pack-image {
  filter: drop-shadow(0 0 20px hsl(43, 100%, 65%)) drop-shadow(0 0 50px hsl(43, 100%, 50%));
}

/* Phase 2: Shake — wobble with intensified glow (holds the centered position) */
.pack-shake {
  z-index: 160;
  transform: translate(var(--focus-tx, 0), var(--focus-ty, 0)) scale(1.3);
  animation: pack-shake-anim 0.3s ease-in-out;
  pointer-events: none;
}

.pack-shake .pack-image {
  filter: drop-shadow(0 0 30px hsl(43, 100%, 70%)) drop-shadow(0 0 60px hsl(43, 100%, 55%))
    drop-shadow(0 0 80px hsl(30, 100%, 50%));
}

@keyframes pack-shake-anim {
  0% {
    transform: translate(var(--focus-tx, 0), var(--focus-ty, 0)) scale(1.3) rotate(0deg);
  }
  14% {
    transform: translate(var(--focus-tx, 0), var(--focus-ty, 0)) scale(1.3) rotate(3deg);
  }
  28% {
    transform: translate(var(--focus-tx, 0), var(--focus-ty, 0)) scale(1.3) rotate(-4deg);
  }
  42% {
    transform: translate(var(--focus-tx, 0), var(--focus-ty, 0)) scale(1.3) rotate(3deg);
  }
  57% {
    transform: translate(var(--focus-tx, 0), var(--focus-ty, 0)) scale(1.3) rotate(-3deg);
  }
  71% {
    transform: translate(var(--focus-tx, 0), var(--focus-ty, 0)) scale(1.3) rotate(2deg);
  }
  85% {
    transform: translate(var(--focus-tx, 0), var(--focus-ty, 0)) scale(1.3) rotate(-1deg);
  }
  100% {
    transform: translate(var(--focus-tx, 0), var(--focus-ty, 0)) scale(1.3) rotate(0deg);
  }
}

/* Phase 3: Burst — scale up and fade out from centered position */
.pack-burst {
  z-index: 160;
  animation: pack-burst-anim 0.4s ease-out forwards;
  pointer-events: none;
}

@keyframes pack-burst-anim {
  0% {
    transform: translate(var(--focus-tx, 0), var(--focus-ty, 0)) scale(1.3);
    opacity: 1;
  }
  100% {
    transform: translate(var(--focus-tx, 0), var(--focus-ty, 0)) scale(2.5);
    opacity: 0;
  }
}

/* Radial flash overlay */
.burst-flash {
  position: fixed;
  inset: 0;
  z-index: 155;
  background: radial-gradient(circle at center, rgba(255, 230, 150, 0.8) 0%, transparent 70%);
  animation: flash-anim 0.4s ease-out forwards;
  pointer-events: none;
}

@keyframes flash-anim {
  0% {
    opacity: 0;
  }
  30% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

/* Loading spinner */
.loading-spinner {
  position: fixed;
  bottom: 20%;
  left: 50%;
  transform: translateX(-50%);
  z-index: 160;
  font-family: 'Space Mono', monospace;
  font-size: 1rem;
  color: hsl(47, 100%, 78%);
  letter-spacing: 0.1em;
  animation: pulse-text 1s ease-in-out infinite;
}

@keyframes pulse-text {
  0%,
  100% {
    opacity: 0.5;
  }
  50% {
    opacity: 1;
  }
}

/* Transitions */
.booster-modal-enter-active {
  transition: opacity 0.3s ease;
}
.booster-modal-enter-active .booster-pack {
  transition:
    opacity 0.3s ease,
    transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}
.booster-modal-leave-active {
  transition: opacity 0.25s ease;
}

.booster-modal-enter-from {
  opacity: 0;
}
.booster-modal-enter-from .booster-pack {
  opacity: 0;
  transform: translateY(20px) scale(0.9);
}
.booster-modal-leave-to {
  opacity: 0;
}

@media (max-width: 768px) {
  .booster-grid {
    flex-wrap: wrap;
    gap: 12px;
    padding: 16px;
    max-width: 100vw;
  }

  .booster-pack {
    width: calc(33.33% - 8px);
  }

  .pack-badge {
    font-size: 0.7rem;
    margin-top: 4px;
  }
}
</style>
