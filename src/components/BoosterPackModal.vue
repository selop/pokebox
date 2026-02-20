<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useAppStore } from '@/stores/app'
import { SET_REGISTRY } from '@/data/cardCatalog'
import mewPack from '@/assets/MEW-booster-pack.webp'
import prePack from '@/assets/PRE-booster-pack.webp'
import pafPack from '@/assets/PAF-booster-pack.webp'
import tefPack from '@/assets/TEF-booster-pack.webp'
import driPack from '@/assets/DRI-booster-pack.webp'

const store = useAppStore()

const packImages: Record<string, string> = {
  'sv3-5_en': mewPack,
  'sv8-5_en': prePack,
  'sv4-5_en': pafPack,
  sv5_en: tefPack,
  sv10_en: driPack,
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && store.showBoosterModal) {
    close()
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))

function close() {
  store.showBoosterModal = false
}

async function selectSet(setId: string) {
  await store.switchSet(setId)
  close()
}
</script>

<template>
  <Transition name="booster-modal">
    <div v-if="store.showBoosterModal" class="booster-backdrop" @click.self="close">
      <button class="close-btn" @click="close" aria-label="Close">&times;</button>
      <div class="booster-grid">
        <button
          v-for="set in SET_REGISTRY"
          :key="set.id"
          class="booster-pack"
          :class="{ active: set.id === store.currentSetId, loading: store.setLoading }"
          :disabled="store.setLoading"
          @click="selectSet(set.id)"
        >
          <img
            v-if="packImages[set.id]"
            :src="packImages[set.id]"
            :alt="set.label"
            class="pack-image"
          />
          <span v-if="set.id === store.currentSetId" class="pack-badge">Selected</span>
        </button>
      </div>
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
  transition: transform 0.25s ease;
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
  opacity: 0.6;
}

.pack-badge {
  font-family: 'Space Mono', monospace;
  font-size: 1.5rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: hsl(47, 100%, 78%);
  margin-top: 10px;
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
    gap: 16px;
    padding: 16px;
  }

  .booster-pack {
    width: 200px;
  }
}
</style>
