<script setup lang="ts">
import { useAppStore } from '@/stores/app'

const store = useAppStore()
</script>

<template>
  <div class="tracking-data">
    <h3>Eye Position</h3>
    <div class="data-row">
      <span>X</span>
      <span class="data-value">{{ store.targetEye.x.toFixed(4) }}</span>
    </div>
    <div class="data-row">
      <span>Y</span>
      <span class="data-value">{{ store.targetEye.y.toFixed(4) }}</span>
    </div>
    <div class="data-row">
      <span>Z</span>
      <span class="data-value">{{ store.targetEye.z.toFixed(4) }}</span>
    </div>
  </div>
</template>

<style scoped>
.tracking-data {
  position: fixed;
  bottom: 20px;
  left: 20px;
  z-index: 50;
  background: rgba(0, 0, 0, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 16px 20px;
  font-size: 0.7rem;
}

.tracking-data h3 {
  font-size: 0.6rem;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: #00f5d4;
  margin-bottom: 12px;
}

.data-row {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 6px;
  color: #888;
}

.data-value {
  color: #fff;
  font-variant-numeric: tabular-nums;
}

@media (max-width: 768px) {
  .tracking-data {
    display: none;
  }
}
</style>
