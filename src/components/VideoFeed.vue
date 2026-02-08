<script setup lang="ts">
import { ref } from 'vue'

const videoEl = ref<HTMLVideoElement | null>(null)
defineExpose({ videoEl })
</script>

<template>
  <video ref="videoEl" class="video-feed" autoplay playsinline></video>
</template>

<style scoped>
.video-feed {
  position: fixed;
  bottom: 80%;
  right: 20px;
  width: 160px;
  height: 120px;
  border-radius: 8px;
  border: 2px solid #00f5d4;
  box-shadow: 0 0 20px rgba(0, 245, 212, 0.3);
  z-index: 100;
  object-fit: cover;
  transform: scaleX(-1);
  opacity: 0.85;
}
</style>
