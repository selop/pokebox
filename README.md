# pokebox

Pokebox uses your webcam to track your head position and renders realistic holographic card effects that shift as you move — as if you're peering through a window into a box of shiny cards. Enjoy the holo foil effect!

**Try it live:** [pokebox.lopatkin.net](https://pokebox.lopatkin.net)

<div align="center">

https://github.com/user-attachments/assets/0ba49c13-38ee-443e-ac0a-128c02c3e87e

</div>

## FAQ

### What is Pokebox?

Pokebox recreates the experience of tilting a holographic Pokemon card under a light. It displays cards with real-time holographic effects (rainbow shifts, sparkles, etch foils) that respond to your movement. The "parallax window" effect makes the screen feel like a physical opening into a 3D scene containing the cards. This is a topic I studied in university and it was part of my [Master's thesis](https://github.com/selop/dynamic-perspective-on-android). The holo effects are based on [Simey Pokemon CSS cards](https://github.com/simeydotme/pokemon-cards-css), but are implemented in GLSL in this project. Big thanks to Simey!

### Was this built with AI?

Yes! I have a software engineering background but lacked the time to work on a side project with this scope. I heavily used Claude Opus 4.6 to achieve the holo effects in WebGL/GLSL.

### How do I use it?

Just visit [pokebox.lopatkin.net](https://pokebox.lopatkin.net) in your browser — no download or installation required. When prompted, enable your camera for the full head-tracking experience, or skip it and use keyboard controls instead. The mouse can also be used to tilt the card and provoke the holo foil effect.

### Does it work on my phone?

Well, it's not the full sauce. On mobile devices, Pokebox uses your phone's gyroscope (tilt sensor) instead of a camera, so the holographic effects respond as you tilt your phone. The interface adapts to smaller screens with simplified navigation. I **highly recommend** to use a Desktop/Laptop setup.

### Does it need my camera? Is my video sent anywhere?

The camera is **completely optional** — you can dismiss the prompt and use keyboard arrow keys to move the viewpoint or use the mouse to tile the card instead. If you do enable the camera, all face tracking runs **entirely in your browser** using [MediaPipe](https://ai.google.dev/edge/mediapipe/solutions/guide). No video or tracking data ever leaves your device.

### Can I share a specific card with someone?

Yes. Click the "Share" button in the toolbar (or use your browser's address bar). The URL updates to include the current set and card number, so anyone opening the link will see the exact card you're viewing.

### The effect doesn't respond to my movement / looks wrong

Open the Settings panel (gear icon) and check the **Screen** calibration — the physical screen dimensions and viewing distance should roughly match your actual setup. You can also adjust the **Tracking** sliders for sensitivity and smoothness.

### Can I add my own cards or custom scans?

Not through the UI, but the project is open source. If you're comfortable with code, see the developer documentation below and `docs/CARD-SETS.md` for instructions on adding new sets.

The cards displayed are sourced from [malio.io](https://malie.io/). Big thanks for their card database!

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

> **Tip:** The dev server runs on HTTP by default. Browsers require a secure context (HTTPS) for camera access. `localhost` is treated as secure by most browsers, so camera access works out of the box. If you access the dev server from another device on your network (e.g. via LAN IP), you'll need HTTPS. Add `@vitejs/plugin-basic-ssl` to enable it:
> ```sh
> bun add -d @vitejs/plugin-basic-ssl
> ```
> Then add `basicSsl()` to the `plugins` array in `vite.config.ts`.

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
