<script setup lang="ts">
import { useAppStore } from '@/stores/app'

const store = useAppStore()
</script>

<template>
  <TransitionGroup name="toast-slide" tag="div" class="toast-stack">
    <div v-for="toast in store.toasts" :key="toast.id" class="toast-item" @click="store.removeToast(toast.id)">
      {{ toast.message }}
    </div>
  </TransitionGroup>
</template>

<style scoped>
.toast-stack {
  position: fixed;
  bottom: 72px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 200;
  display: flex;
  flex-direction: column-reverse;
  align-items: center;
  gap: 8px;
  pointer-events: none;
}

.toast-item {
  background: rgba(12, 0, 4, 0.85);
  border: 1px solid #f72585;
  backdrop-filter: blur(12px);
  border-radius: 8px;
  padding: 8px 18px;
  font-family: 'Space Mono', monospace;
  font-size: 0.62rem;
  color: #f7a8c4;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  white-space: nowrap;
  pointer-events: auto;
  cursor: pointer;
  max-width: 90vw;
  overflow: hidden;
  text-overflow: ellipsis;
}

.toast-slide-enter-active,
.toast-slide-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.toast-slide-enter-from {
  opacity: 0;
  transform: translateY(12px);
}
.toast-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
