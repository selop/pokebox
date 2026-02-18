import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { defineComponent, h } from 'vue'
import { useAppStore } from '@/stores/app'
import VideoFeed from '@/components/VideoFeed.vue'
import TrackingData from '@/components/TrackingData.vue'

/**
 * Lightweight wrapper that mirrors App.vue's conditional rendering for
 * VideoFeed and TrackingData without mounting the heavy Three.js scene.
 */
const TestHost = defineComponent({
  components: { VideoFeed, TrackingData },
  setup() {
    const store = useAppStore()
    return { store }
  },
  render() {
    return h('div', [
      // v-show equivalent: always rendered, toggled via display
      this.store.isPanelOpen && this.store.isTrackingActive
        ? h(VideoFeed, { class: 'video-feed-wrapper' })
        : h(VideoFeed, { class: 'video-feed-wrapper', style: { display: 'none' } }),
      // v-if equivalent: only rendered when both flags are true
      this.store.isPanelOpen && this.store.isTrackingActive
        ? h(TrackingData)
        : null,
    ])
  },
})

describe('Camera-dependent component visibility', () => {
  let store: ReturnType<typeof useAppStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useAppStore()
  })

  // -------------------------------------------------------------------------
  // VideoFeed (uses v-show)
  // -------------------------------------------------------------------------
  describe('VideoFeed', () => {
    it('is hidden when panel is closed and tracking is inactive', () => {
      store.isPanelOpen = false
      store.isTrackingActive = false
      const wrapper = mount(TestHost)
      const video = wrapper.find('.video-feed-wrapper')
      expect(video.exists()).toBe(true)
      expect(video.attributes('style')).toContain('display: none')
    })

    it('is hidden when panel is open but tracking is inactive', () => {
      store.isPanelOpen = true
      store.isTrackingActive = false
      const wrapper = mount(TestHost)
      const video = wrapper.find('.video-feed-wrapper')
      expect(video.attributes('style')).toContain('display: none')
    })

    it('is hidden when tracking is active but panel is closed', () => {
      store.isPanelOpen = false
      store.isTrackingActive = true
      const wrapper = mount(TestHost)
      const video = wrapper.find('.video-feed-wrapper')
      expect(video.attributes('style')).toContain('display: none')
    })

    it('is visible when both panel is open and tracking is active', () => {
      store.isPanelOpen = true
      store.isTrackingActive = true
      const wrapper = mount(TestHost)
      const video = wrapper.find('.video-feed-wrapper')
      expect(video.exists()).toBe(true)
      expect(video.attributes('style') ?? '').not.toContain('display: none')
    })
  })

  // -------------------------------------------------------------------------
  // TrackingData (uses v-if)
  // -------------------------------------------------------------------------
  describe('TrackingData', () => {
    it('is not rendered when panel is closed and tracking is inactive', () => {
      store.isPanelOpen = false
      store.isTrackingActive = false
      const wrapper = mount(TestHost)
      expect(wrapper.findComponent(TrackingData).exists()).toBe(false)
    })

    it('is not rendered when panel is open but tracking is inactive', () => {
      store.isPanelOpen = true
      store.isTrackingActive = false
      const wrapper = mount(TestHost)
      expect(wrapper.findComponent(TrackingData).exists()).toBe(false)
    })

    it('is not rendered when tracking is active but panel is closed', () => {
      store.isPanelOpen = false
      store.isTrackingActive = true
      const wrapper = mount(TestHost)
      expect(wrapper.findComponent(TrackingData).exists()).toBe(false)
    })

    it('is rendered when both panel is open and tracking is active', () => {
      store.isPanelOpen = true
      store.isTrackingActive = true
      const wrapper = mount(TestHost)
      expect(wrapper.findComponent(TrackingData).exists()).toBe(true)
    })
  })

  // -------------------------------------------------------------------------
  // Reactivity — state changes update visibility
  // -------------------------------------------------------------------------
  describe('reactivity', () => {
    it('TrackingData appears when tracking activates after mount', async () => {
      store.isPanelOpen = true
      store.isTrackingActive = false
      const wrapper = mount(TestHost)
      expect(wrapper.findComponent(TrackingData).exists()).toBe(false)

      store.isTrackingActive = true
      await wrapper.vm.$nextTick()
      expect(wrapper.findComponent(TrackingData).exists()).toBe(true)
    })

    it('TrackingData disappears when tracking deactivates', async () => {
      store.isPanelOpen = true
      store.isTrackingActive = true
      const wrapper = mount(TestHost)
      expect(wrapper.findComponent(TrackingData).exists()).toBe(true)

      store.isTrackingActive = false
      await wrapper.vm.$nextTick()
      expect(wrapper.findComponent(TrackingData).exists()).toBe(false)
    })

    it('VideoFeed hides when tracking deactivates', async () => {
      store.isPanelOpen = true
      store.isTrackingActive = true
      const wrapper = mount(TestHost)
      const video = wrapper.find('.video-feed-wrapper')
      expect(video.attributes('style') ?? '').not.toContain('display: none')

      store.isTrackingActive = false
      await wrapper.vm.$nextTick()
      const videoAfter = wrapper.find('.video-feed-wrapper')
      expect(videoAfter.attributes('style')).toContain('display: none')
    })
  })
})
