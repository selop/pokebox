<script setup lang="ts">
import { useAppStore } from '@/stores/app'

const store = useAppStore()

const emit = defineEmits<{
  enableCamera: []
}>()

function onSceneChange(value: string) {
  store.setSceneMode(value as 'furniture' | 'cards')
}

function onStart() {
  emit('enableCamera')
}

function onClose() {
  store.showInstructions = false
}
</script>

<template>
  <div class="instructions" :class="{ hidden: !store.showInstructions }">
    <button class="close-btn" @click="onClose" aria-label="Close">×</button>
    <h2>Virtual Pokebox Demo</h2>
    <p>
      This demonstrates off-axis perspective projection. Your webcam tracks your head position and
      renders a 3D box behind the screen. Move your head to peek around the edges — like looking
      through a window into a real box.
    </p>
    <div class="scene-select-wrapper">
      <label>Scene</label>
      <select
        class="cal-select scene-select"
        :value="store.sceneMode"
        @change="onSceneChange(($event.target as HTMLSelectElement).value)"
      >
        <option value="furniture">Furnished Room</option>
        <option value="cards">Pokemon Cards</option>
      </select>
    </div>
    <button class="start-btn" @click="onStart">Enable Camera</button>
    <p class="keyboard-hint">Or use arrow keys + W/S to test without camera</p>
  </div>
</template>

<style scoped>
.instructions {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 200;
  background: rgba(0, 0, 0, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 40px 50px;
  text-align: center;
  max-width: 480px;
  transition: all 0.4s ease;
}

.instructions.hidden {
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.95);
  pointer-events: none;
}

.instructions h2 {
  font-family: 'Syne', sans-serif;
  font-size: 1.4rem;
  margin-bottom: 12px;
}

.instructions p {
  font-size: 0.8rem;
  color: #999;
  line-height: 1.6;
  margin-bottom: 24px;
}

.scene-select-wrapper {
  margin-bottom: 20px;
}

.scene-select-wrapper label {
  font-size: 0.75rem;
  color: #aaa;
  display: block;
  margin-bottom: 8px;
}

.scene-select {
  width: 100%;
  padding: 10px 12px;
  font-size: 0.8rem;
  border-radius: 10px;
}

.cal-select {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  padding: 5px 8px;
  font-family: 'Space Mono', monospace;
  font-size: 0.65rem;
  color: #fff;
  cursor: pointer;
  outline: none;
}

.cal-select:hover {
  border-color: #00f5d4;
}

.cal-select option {
  background: #111;
  color: #fff;
}

.start-btn {
  background: linear-gradient(135deg, #00f5d4, #f72585);
  border: none;
  padding: 14px 36px;
  border-radius: 30px;
  font-family: 'Space Mono', monospace;
  font-size: 0.8rem;
  font-weight: 700;
  color: #000;
  cursor: pointer;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.start-btn:hover {
  transform: scale(1.03);
  box-shadow: 0 0 30px rgba(0, 245, 212, 0.4);
}

.keyboard-hint {
  margin-top: 16px;
  margin-bottom: 0;
  font-size: 0.7rem;
}

.close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  font-size: 2rem;
  line-height: 1;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    color 0.2s ease,
    transform 0.2s ease;
}

.close-btn:hover {
  color: #fff;
  transform: scale(1.1);
}
</style>
