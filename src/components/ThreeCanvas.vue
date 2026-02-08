<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useThreeScene } from '@/composables/useThreeScene'
import { useKeyboardControls } from '@/composables/useKeyboardControls'

const canvasContainer = ref<HTMLElement | null>(null)
const { init } = useThreeScene(canvasContainer)
useKeyboardControls()

onMounted(() => {
  init()
})
</script>

<template>
  <div id="canvas-container" ref="canvasContainer"></div>
</template>
