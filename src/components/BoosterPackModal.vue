<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useAppStore } from '@/stores/app'
import { SET_REGISTRY } from '@/data/cardCatalog'
import mewPack from '@/assets/MEW-booster-pack.png'
import prePack from '@/assets/PRE-booster-pack.png'
import pafPack from '@/assets/PAF-booster-pack.png'
import tefPack from '@/assets/TEF-booster-pack.png'

const store = useAppStore()

const packImages: Record<string, string> = {
  'sv3-5_en': mewPack,
  'sv8-5_en': prePack,
  'sv4-5_en': pafPack,
  'sv5_en': tefPack,
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
          <span class="pack-label">{{ set.label }}</span>
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
  transition: color 0.2s, transform 0.2s;
}

.close-btn:hover {
  color: #fff;
  transform: scale(1.15);
}

.booster-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  justify-content: center;
  padding: 24px;
  max-width: 720px;
}

.booster-pack {
  position: relative;
  width: 160px;
  border-radius: 14px;
  border: 2px solid rgba(255, 255, 255, 0.15);
  background: rgba(0, 0, 0, 0.4);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 0;
  padding-bottom: 12px;
  transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  overflow: hidden;
}

.pack-image {
  width: 100%;
  height: auto;
  display: block;
  object-fit: contain;
  pointer-events: none;
}

.booster-pack:hover:not(:disabled) {
  transform: scale(1.08);
  border-color: rgba(255, 255, 255, 0.4);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px rgba(255, 255, 255, 0.08);
}

.booster-pack:active:not(:disabled) {
  transform: scale(1.02);
}

.booster-pack:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.booster-pack.active {
  border-color: #00f5d4;
  box-shadow: 0 0 24px rgba(0, 245, 212, 0.25), 0 4px 20px rgba(0, 0, 0, 0.4);
}

.pack-label {
  font-family: 'Syne', sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.8);
  text-align: center;
  padding: 6px 8px 0;
  line-height: 1.3;
}

.pack-badge {
  font-family: 'Space Mono', monospace;
  font-size: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #00f5d4;
  margin-top: 4px;
}

/* Transitions */
.booster-modal-enter-active {
  transition: opacity 0.3s ease;
}
.booster-modal-enter-active .booster-pack {
  transition: opacity 0.3s ease, transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
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
    width: 130px;
  }

  .pack-label {
    font-size: 0.75rem;
  }
}
</style>
