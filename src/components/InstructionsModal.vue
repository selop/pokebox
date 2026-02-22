<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useAppStore } from '@/stores/app'

const props = defineProps<{
  isMobile: boolean
}>()

const store = useAppStore()

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && store.showInstructions) {
    onClose()
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))

const emit = defineEmits<{
  enableCamera: []
  enableGyroscope: []
}>()

function onStart() {
  if (props.isMobile) {
    emit('enableGyroscope')
  } else {
    emit('enableCamera')
  }
}

function onClose() {
  store.showInstructions = false
}
</script>

<template>
  <div class="instructions" :class="{ hidden: !store.showInstructions }">
    <button class="close-btn" @click="onClose" aria-label="Close">×</button>
    <h2>Virtual Pokebox Demo</h2>
    <p v-if="isMobile">
      This demonstrates off-axis perspective projection. Tilt your phone to move the parallax and
      see the holographic card effects respond to physical movement.
    </p>
    <p v-if="isMobile" class="desktop-hint">
      For the full experience, visit on a laptop with a webcam — head tracking makes the screen feel
      like a real window into a 3D box.
    </p>
    <p v-else>
      This demonstrates off-axis perspective projection. Your webcam tracks your head position and
      renders a 3D box behind the screen. Move your head to peek around the edges — like looking
      through a window into a real box.
    </p>
    <button class="start-btn" @click="onStart">
      {{ isMobile ? 'Enable Gyroscope' : 'Enable Camera' }}
    </button>
    <p class="keyboard-hint">
      {{
        isMobile
          ? 'Tilt your phone to move the parallax'
          : 'Or use arrow keys + W/S to test without camera'
      }}
    </p>
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

.desktop-hint {
  font-size: 0.7rem;
  color: #666;
  font-style: italic;
  margin-bottom: 16px;
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

@media (max-width: 768px) {
  .instructions {
    padding: 28px 24px;
    width: calc(100vw - 32px);
    max-width: none;
  }

  .instructions h2 {
    font-size: 1.2rem;
  }
}
</style>
