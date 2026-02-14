<script setup lang="ts">
import { useAppStore } from '@/stores/app'

const store = useAppStore()
</script>

<template>
  <div class="status">
    <div class="status-dot" :class="{ active: store.isTrackingActive }"></div>
    <span>{{ store.statusText }}</span>
  </div>
</template>

<style scoped>
.status {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 50;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.7rem;
  color: #666;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #333;
}

.status-dot.active {
  background: #00f5d4;
  box-shadow: 0 0 10px #00f5d4;
}

@media (max-width: 768px) {
  .status {
    top: auto;
    bottom: 56px;
    right: 16px;
    font-size: 0.6rem;
  }
}
</style>
