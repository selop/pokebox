<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useAppStore } from '@/stores/app'
import { CARD_CATALOG } from '@/data/cardCatalog'

const store = useAppStore()
const query = ref('')
const isOpen = ref(false)
const inputRef = ref<HTMLInputElement | null>(null)
const rootRef = ref<HTMLElement | null>(null)

const filtered = computed(() => {
  const q = query.value.toLowerCase().trim()
  if (!q) return CARD_CATALOG.slice(0, 20)
  return CARD_CATALOG.filter((c) => c.label.toLowerCase().includes(q)).slice(0, 20)
})

function selectCard(id: string) {
  store.currentCardId = id
  query.value = ''
  isOpen.value = false
  inputRef.value?.blur()
}

function onFocus() {
  isOpen.value = true
}

function onClickOutside(e: MouseEvent) {
  if (rootRef.value && !rootRef.value.contains(e.target as Node)) {
    isOpen.value = false
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    isOpen.value = false
    inputRef.value?.blur()
  }
}

onMounted(() => document.addEventListener('pointerdown', onClickOutside))
onBeforeUnmount(() => document.removeEventListener('pointerdown', onClickOutside))
</script>

<template>
  <div ref="rootRef" class="card-search" @keydown="onKeydown">
    <input
      ref="inputRef"
      v-model="query"
      class="search-input"
      type="text"
      placeholder="Search cards..."
      autocomplete="off"
      @focus="onFocus"
    />
    <div v-if="isOpen" class="search-dropdown" @mousedown.prevent>
      <div
        v-for="card in filtered"
        :key="card.id"
        class="search-result"
        @click="selectCard(card.id)"
      >
        <img :src="card.front" :alt="card.label" class="search-thumb" loading="lazy" />
        <span class="search-label">{{ card.label }}</span>
      </div>
      <div v-if="filtered.length === 0" class="search-empty">No cards found</div>
    </div>
  </div>
</template>

<style scoped>
.card-search {
  position: fixed;
  bottom: 28px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 60;
  width: 320px;
}

.search-input {
  width: 100%;
  box-sizing: border-box;
  background: rgba(0, 0, 0, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(16px);
  border-radius: 10px;
  padding: 10px 16px;
  font-family: 'Space Mono', monospace;
  font-size: 0.7rem;
  color: #fff;
  outline: none;
  letter-spacing: 0.04em;
}

.search-input::placeholder {
  color: #666;
}

.search-input:focus {
  border-color: #00f5d4;
  box-shadow: 0 0 12px rgba(0, 245, 212, 0.15);
}

.search-dropdown {
  position: absolute;
  bottom: calc(100% + 6px);
  left: 0;
  right: 0;
  max-height: 340px;
  overflow-y: auto;
  background: rgba(0, 0, 0, 0.88);
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(16px);
  border-radius: 10px;
  padding: 6px;
}

.search-result {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
}

.search-result:hover {
  background: rgba(0, 245, 212, 0.1);
}

.search-thumb {
  width: 32px;
  height: 45px;
  object-fit: cover;
  border-radius: 3px;
  flex-shrink: 0;
}

.search-label {
  font-family: 'Space Mono', monospace;
  font-size: 0.65rem;
  color: #ccc;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.search-empty {
  padding: 12px;
  text-align: center;
  font-family: 'Space Mono', monospace;
  font-size: 0.6rem;
  color: #666;
}
</style>
