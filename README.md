# pokebox

A virtual holographic Pokemon card viewer that runs in your browser. Pokebox uses your webcam to track your head position and renders realistic holographic card effects that shift as you move — as if you're peering through a window into a box of shiny cards.

**Try it live:** [pokebox.lopatkin.net](https://pokebox.lopatkin.net)

<div align="center">

https://github.com/user-attachments/assets/0ba49c13-38ee-443e-ac0a-128c02c3e87e

</div>

## FAQ

### What is Pokebox?

Pokebox recreates the experience of tilting a holographic Pokemon card under a light. It displays cards with real-time holographic effects (rainbow shifts, sparkles, etch foils) that respond to your movement. The "parallax window" effect makes the screen feel like a physical opening into a 3D scene containing the cards. This is a topic I studied in university and it was part of my [Master's thesis](https://github.com/selop/dynamic-perspective-on-android).

### Was this built with AI?

Yes! I have a software engineering background but lacked the time to work on a side project with this scope. I heavily used Claude Opus 4.6 to achieve the holo effects in WebGL/GLSL.

### How do I use it?

Just visit [pokebox.lopatkin.net](https://pokebox.lopatkin.net) in your browser — no download or installation required. When prompted, you can enable your camera for the full head-tracking experience, or skip it and use keyboard controls instead.

### Does it work on my phone?

Well, it's not the full sauce. On mobile devices, Pokebox uses your phone's gyroscope (tilt sensor) instead of a camera, so the holographic effects respond as you tilt your phone. The interface adapts to smaller screens with simplified navigation. I **highly recommend** to use a Desktop/Laptop setup.

### Does it need my camera? Is my video sent anywhere?

The camera is **completely optional** — you can dismiss the prompt and use keyboard arrow keys to move the viewpoint instead. If you do enable the camera, all face tracking runs **entirely in your browser** using [MediaPipe](https://ai.google.dev/edge/mediapipe/solutions/guide). No video or tracking data ever leaves your device.

### Which card sets are included?

Currently five sets are available:

- **Destined Rivals** (SV10)
- **Prismatic Evolutions** (SV8.5)
- **Scarlet & Violet 151** (SV3.5)
- **Paldean Fates** (SV4.5)
- **Temporal Forces** (SV5)

You can switch between sets by clicking the "Packs" button and selecting a booster pack.

### Why don't I see every card from a set?

Pokebox only displays cards that have holographic or foil treatments (illustration rares, ultra rares, special art rares, etc.). Common and uncommon cards without holo effects are filtered out since there's no holographic effect to show for them.

### What do the different holo effects look like?

Each card automatically gets the holographic effect that matches its real-world rarity:

- **Regular Holo** — diagonal rainbow gradient with rotating bars
- **Illustration Rare** — vertical rainbow bands with diagonal bars and glare
- **Special Illustration Rare** — iridescent texture layers with tilt-reactive sparkle on etched foil
- **Ultra Rare** — metallic sparkle with shimmer bars
- **Double Rare** — birthday holo with grain and dual textures
- **Rainbow Rare** — metallic spotlight with iridescent glitter
- **Master Ball** — etched foil composite with rainbow overlay

### Can I share a specific card with someone?

Yes. Click the "Share" button in the toolbar (or use your browser's address bar). The URL updates to include the current set and card number, so anyone opening the link will see the exact card you're viewing.

### Can I use it offline?

Pokebox is a Progressive Web App (PWA), so you can install it to your home screen or desktop. The app shell works offline, but card images are loaded from a server and require an internet connection.

### Which browsers are supported?

Any modern browser with WebGL2 support works. This includes recent versions of Chrome, Edge, Brave, Firefox, and Safari. For the best experience, use a Chromium-based browser (Chrome, Edge, Brave) on desktop.

### The effect doesn't respond to my movement / looks wrong

Open the Settings panel (gear icon) and check the **Screen** calibration — the physical screen dimensions and viewing distance should roughly match your actual setup. You can also adjust the **Tracking** sliders for sensitivity and smoothness.

### Can I add my own cards or custom scans?

Not through the UI, but the project is open source. If you're comfortable with code, see the developer documentation below and `docs/CARD-SETS.md` for instructions on adding new sets.

### Is this an official Pokemon product?

No. Pokebox is an independent fan project. Pokemon and all related trademarks belong to The Pokemon Company / Nintendo.

---

## Development

### Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

### Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

### Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

### Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

### Project Setup

```sh
bun install
```

### Compile and Hot-Reload for Development

```sh
bun dev
```

### Type-Check, Compile and Minify for Production

```sh
bun run build
```

### Run Unit & Shader Tests with [Vitest](https://vitest.dev)

```sh
bun test:unit        # All unit tests (includes shader tests)
bun test:shader      # Shader compilation and validation tests only
```

> **Note:** Do not use bare `bun test` — it invokes Bun's built-in test runner which lacks Vite path aliases and plugin support. Always use the specific commands above.

### Run End-to-End Tests with [Playwright](https://playwright.dev)

```sh
# Install browsers for the first run
npx playwright install

# When testing on CI, must build the project first
bun run build

# Runs the end-to-end tests
bun test:e2e
# Runs the tests only on Chromium
bun test:e2e --project=chromium
# Runs the tests of a specific file
bun test:e2e tests/example.spec.ts
# Runs the tests in debug mode
bun test:e2e --debug
```

### Lint with [ESLint](https://eslint.org/)

```sh
bun lint
```
