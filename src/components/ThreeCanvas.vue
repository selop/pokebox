<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useThreeScene } from '@/composables/useThreeScene'
import { useKeyboardControls } from '@/composables/useKeyboardControls'
import { useAppStore } from '@/stores/app'

const store = useAppStore()
const canvasContainer = ref<HTMLElement | null>(null)
const { init, gyroscope } = useThreeScene(canvasContainer)
useKeyboardControls()

onMounted(() => {
  init()
})

defineExpose({ gyroscope })
</script>

<template>
  <div id="canvas-container" ref="canvasContainer" :class="{ blurred: store.showInstructions }"></div>
</template>

<style scoped>
#canvas-container {
  transition: filter 0.4s ease;
}

#canvas-container.blurred {
  filter: blur(12px);
  pointer-events: none;
}
</style>
