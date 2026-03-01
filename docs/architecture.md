# Pokebox Architecture

```mermaid
flowchart TB
    subgraph User["User"]
        Browser["Browser<br/><small>pokebox.lopatkin.net</small>"]
    end

    subgraph CI["GitHub Actions CI/CD"]
        Build["Build & Push"]
        GHCR["ghcr.io<br/><small>Container Registry</small>"]
        Build -->|push image| GHCR
    end

    subgraph Secrets["Build-time Secrets"]
        S1["VITE_ASSET_BASE_URL"]
        S2["VITE_OTEL_COLLECTOR_URL"]
    end
    Secrets -.->|injected at build| Build

    subgraph Host["Docker Host"]
        subgraph Pokebox["pokebox container"]
            Nginx["Nginx<br/><small>:80 → :3000</small>"]
            SPA["Vite SPA Bundle"]
            Health["/health"]
            Stub["/nginx_status"]
        end
        Watchtower["Watchtower"] -->|auto-pulls| GHCR
        Watchtower -->|restarts| Pokebox
    end

    Browser <-->|HTTPS| Nginx
    Nginx --- SPA
    Nginx --- Health
    Nginx --- Stub

    subgraph External["External Services"]
        S3["Hetzner Object Storage<br/><small>pokebox-assets.fsn1.your-objectstorage.com</small>"]
        OTEL["OTLP Collector<br/><small>/v1/traces</small>"]
    end

    subgraph Monitoring["pokebox-observability <small>(separate repo)</small>"]
        Prometheus["Prometheus"]
        NginxExp["nginx-exporter"]
        Blackbox["blackbox-exporter"]
        cAdvisor["cAdvisor"]
        Grafana["Grafana<br/><small>:3001</small>"]

        Prometheus -->|scrape| NginxExp
        Prometheus -->|scrape| Blackbox
        Prometheus -->|scrape| cAdvisor
        Grafana -->|query| Prometheus
    end

    NginxExp -->|reads| Stub
    Blackbox -->|probes /health & /| Nginx
    cAdvisor -->|docker socket| Pokebox

    Browser -->|"GET card assets<br/><small>fronts, masks, foils, JSON</small>"| S3
    Browser -->|"POST /v1/traces<br/><small>OTel spans</small>"| OTEL
```

## Browser App Internals

```mermaid
flowchart TB
    subgraph Vue["Vue 3 App"]
        App["App.vue"]
        Store["Pinia Store<br/><small>stores/app.ts</small>"]
        Search["CardSearch"]
        Booster["BoosterPackModal"]
        Toolbar["ToolbarButtons"]
        ShaderPanel["ShaderControlsPanel"]
        GfxPanel["GraphicsPanel<br/><small>tone mapping, DOF, bloom</small>"]
        CalPanel["CalibrationPanel<br/><small>webcam offset, lights</small>"]
        Instructions["InstructionsModal"]
        PerfOvl["PerfOverlay<br/><small>FPS, frame time</small>"]
        Toast["ToastContainer"]
    end

    subgraph Composables["Composables"]
        Scene["useThreeScene"]
        Loader["useCardLoader"]
        Face["useFaceTracking"]
        Tilt["useMouseTilt /<br/>useGyroscope"]
        Swipe["useSwipeGesture<br/><small>mobile vertical swipe</small>"]
        Fullscreen["useFullscreen"]
        UniformWatch["useUniformWatchers<br/><small>registry-driven<br/>config→uniform sync</small>"]
        Timers["useSceneTimers<br/><small>slideshow, carousel,<br/>hero lifecycle</small>"]
    end

    subgraph ThreeJS["Three.js Scene"]
        Camera["Off-axis Camera"]
        Box["Box Shell"]
        Cards["Card Meshes<br/><small>ShaderMaterial</small>"]
        Lights["Lights<br/><small>head-tracked spotlight</small>"]
        subgraph PostProc["Post-processing<br/><small>always-on EffectComposer</small>"]
            RP["RenderPass"]
            Bloom["UnrealBloomPass"]
            Bokeh["BokehPass<br/><small>maxblur=0 passthrough<br/>when DOF inactive</small>"]
            Output["OutputPass<br/><small>tone mapping only<br/>(no sRGB transfer)</small>"]
            RP --> Bloom --> Bokeh --> Output
        end
        subgraph SceneHelpers["Scene Helpers"]
            SceneBuilder["CardSceneBuilder<br/><small>layout dispatch</small>"]
            UniformUpd["ShaderUniformUpdater<br/><small>per-frame uniform push</small>"]
            FanAnim["FanAnimator<br/><small>intro, hover, zoom,<br/>fan-zoom DOF ramp</small>"]
            StackAnim["StackAnimator<br/><small>stack intro, swipe</small>"]
            Navigator["CardNavigator<br/><small>single-mode nav</small>"]
            Merge["MergeAnimator<br/><small>card transitions</small>"]
            FanLayout["FanLayoutBuilder"]
            StackLayout["StackLayoutBuilder"]
            CarouselLayout["CarouselLayoutBuilder"]
        end
    end

    subgraph Shaders["GLSL Shaders"]
        Vert["holo.vert"]
        Frag["*.frag<br/><small>14 shader variants</small>"]
        Common["common/*.glsl<br/><small>blend, filters, rainbow,<br/>holo-shine, base-adjust, voronoi</small>"]
        Frag --- Common
    end

    subgraph Data["Data Layer"]
        Catalog["cardCatalog.ts<br/><small>SET_REGISTRY +<br/>loadSetCatalog()</small>"]
        Hero["heroShowcase.ts<br/><small>cross-set hero cards</small>"]
        Defaults["defaults.ts<br/><small>DEFAULT_CONFIG,<br/>STARTUP_CARD_ID</small>"]
        AssetUrl["assetUrl()<br/><small>VITE_ASSET_BASE_URL</small>"]
        Registry["shaderRegistry.ts<br/><small>uniform↔config<br/>single source of truth</small>"]
    end

    subgraph External["External"]
        S3["Object Storage<br/><small>card assets</small>"]
        MediaPipe["MediaPipe CDN<br/><small>face_detection</small>"]
        Webcam["Webcam"]
        OTEL["OTLP Collector"]
    end

    subgraph Utils["Utils"]
        Spring["SpringValue<br/><small>physics-based damping</small>"]
        Perf["perfTracker<br/><small>FPS, draw calls</small>"]
    end

    subgraph Telemetry["Telemetry"]
        Tracer["OTel Tracer<br/><small>telemetry.ts</small>"]
    end

    %% User interactions
    Search -->|"selectCard(id)"| Store
    Booster -->|"switchSet(setId)"| Store
    Toolbar -->|"display mode, slideshow<br/><small>set/card selects hidden in carousel</small>"| Store
    ShaderPanel -->|"shader uniforms"| Store
    GfxPanel -->|"tone mapping, DOF, bloom"| Store
    CalPanel -->|"lights, webcam offset"| Store

    %% Store → Scene
    Store -->|"displayCardIds watcher"| Loader
    Store -->|"config watchers"| UniformWatch
    Store -->|"targetEye"| Scene
    Store -->|"timers"| Timers

    %% Catalog & asset loading
    Store -->|"switchSet()"| Catalog
    Store -->|"carouselHeroCatalog"| Hero
    Hero -->|"loadSetCatalog() per set"| Catalog
    Catalog -->|"fetch JSON"| AssetUrl
    Loader -->|"load textures"| AssetUrl
    AssetUrl -->|"GET (CORS)"| S3

    %% Face tracking pipeline
    Webcam -->|stream| Face
    Face -->|"dynamic import"| MediaPipe
    Face -->|"store.targetEye"| Store

    %% Tilt input
    Tilt -->|"rotateX/Y"| Scene
    Spring -->|"damped spring"| Tilt
    Swipe -->|"swipe up/down"| Scene

    %% Scene rendering
    Scene --> Camera
    Scene --> Box
    Scene --> Cards
    Scene --> Lights
    Scene --> PostProc
    Scene -->|"dispatch"| SceneBuilder
    SceneBuilder -->|"delegates"| FanLayout
    SceneBuilder -->|"delegates"| StackLayout
    SceneBuilder -->|"delegates"| CarouselLayout
    Scene -->|"tick()"| FanAnim
    Scene -->|"tick()"| StackAnim
    Scene -->|"tick()"| Navigator
    Scene -->|"tick()"| Merge
    Loader -->|"CardTextures"| Cards
    Cards --- Vert
    Cards --- Frag

    %% Uniform flow
    UniformWatch -->|"pushUniform()"| Cards
    Registry -->|"uniform defs"| UniformWatch
    Registry -->|"initial values"| Cards

    %% Telemetry
    Loader -->|"traced spans"| Tracer
    Tracer -->|"OTLP HTTP POST"| OTEL
    Scene -->|"frame stats"| Perf

    %% Animate loop
    UniformUpd -->|"uPointer, uTime<br/>uniforms per frame"| Cards
```

## Post-processing Pipeline

Every frame renders through the same `EffectComposer` FBO chain, initialized eagerly at startup. This ensures consistent lighting whether DOF, bloom, or tone mapping are active or not — no visual pop when effects toggle on/off.

```mermaid
flowchart LR
    Scene["Scene<br/><small>cards + box + lights</small>"]
    RP["RenderPass<br/><small>scene → FBO</small>"]
    Bloom["UnrealBloomPass<br/><small>toggled per-frame<br/>via bloomPass.enabled</small>"]
    Bokeh["BokehPass<br/><small>maxblur=0 passthrough<br/>when DOF inactive</small>"]
    Output["OutputPass<br/><small>tone mapping only<br/>(SRGB_TRANSFER disabled)</small>"]
    Canvas["Canvas"]

    Scene --> RP --> Bloom --> Bokeh --> Output --> Canvas
```

**Why OutputPass without sRGB transfer:**

Three.js r182 skips per-material tone mapping when rendering to an FBO (`WebGLPrograms.js` checks `currentRenderTarget === null`). `OutputPass` is the only way to apply tone mapping in the compositor pipeline. However, card `ShaderMaterial` already outputs gamma-space sRGB directly in `gl_FragColor` — adding the sRGB transfer would double-gamma those pixels (milky washed-out look). Setting `renderer.outputColorSpace = LinearSRGBColorSpace` disables the sRGB transfer in `OutputPass`, so it applies tone mapping only.

**Fan-zoom DOF:**

When a card is clicked in fan mode, DOF ramps in gradually over 1 second (cubic ease-in-out), focusing on the zoomed card. On unzoom, DOF ramps back to 0 over 1 second. The `fanDofMaxBlur` / `fanDofRamp` state drives `BokehPass.uniforms.maxblur` each frame.

## Data Flow: Card Set Switch

```mermaid
sequenceDiagram
    participant User
    participant Store as Pinia Store
    participant Catalog as cardCatalog
    participant S3 as Object Storage
    participant Loader as useCardLoader
    participant Scene as useThreeScene
    participant OTel as OTLP Collector

    User->>Store: switchSet("sv3-5_en")
    Store->>Loader: clearCache()
    Note over Loader: dispose GPU textures
    Store->>Catalog: loadSetCatalog("sv3-5_en")
    Catalog->>S3: fetch(assetUrl("sv3-5_en/sv3-5.en-US.json"))
    S3-->>Catalog: JSON metadata
    Note over Catalog: filter foils → pick best variant<br/>→ mapHoloType() → build entries
    Catalog-->>Store: CardCatalogEntry[]
    Note over Store: CARD_CATALOG.value = entries<br/>→ displayCardIds recomputes

    Store->>Loader: loadCards([ids])
    Loader->>OTel: startSpan("load-card-set")

    par parallel texture loads
        Loader->>S3: GET front texture (CORS)
        Loader->>S3: GET holo mask (CORS)
        Loader->>S3: GET etch foil (CORS)
    end

    S3-->>Loader: textures
    Loader->>OTel: endSpan()
    Loader->>Scene: rebuildCardsOnly()
    Note over Scene: build ShaderMaterial<br/>per holoType + textures
```

## Data Flow: Booster Pack Opening

```mermaid
sequenceDiagram
    participant User
    participant Modal as BoosterPackModal
    participant Store as Pinia Store
    participant Catalog as cardCatalog
    participant Scene as useThreeScene
    participant Fan as FanAnimator

    User->>Modal: click pack
    Modal->>Store: openPack(setId)
    Note over Modal: CSS phases:<br/>focus (0.5s) → shake (0.3s) → burst (0.4s)
    Store->>Store: packOpeningPhase = 'css-anim'

    par CSS animation + set loading
        Modal->>Modal: animate focus → shake → burst
        Store->>Catalog: loadSetCatalog(setId)
    end

    alt set loaded before CSS finishes
        Store->>Store: packOpeningPhase = 'cascade'
    else CSS finishes before set loads
        Store->>Store: packOpeningPhase = 'waiting-load'
        Note over Store: wait for catalog...
        Store->>Store: packOpeningPhase = 'cascade'
    end

    Store->>Scene: close modal, rebuild fan
    Scene->>Fan: intro with origin at screen center
    Note over Fan: cards burst from single point<br/>staggered pop-up animation
    Fan->>Fan: auto-reveal after 0.5s
    Store->>Store: packOpeningPhase = 'idle'
```

## Data Flow: Fan-Zoom DOF Transition

```mermaid
sequenceDiagram
    participant User
    participant Fan as FanAnimator
    participant Scene as useThreeScene
    participant Bokeh as BokehPass

    Note over Bokeh: maxblur=0 (passthrough)

    User->>Fan: click card in fan
    Fan->>Fan: start zoom transition (1.2s)
    Note over Scene: compositor already active<br/>(always-on pipeline)

    Fan-->>Scene: zoomedFanIndex set (zoom complete)
    Scene->>Scene: start DOF ramp {from: 0, to: maxBlur, duration: 1.0s}

    loop every frame (1.0s ramp)
        Scene->>Scene: cubic ease-in-out interpolation
        Scene->>Bokeh: maxblur = interpolated value
    end

    Note over Bokeh: maxblur = config.dof.maxBlur

    User->>Fan: click empty space (unzoom)
    Fan->>Fan: start return-to-fan transition
    Scene->>Scene: start DOF ramp {from: maxBlur, to: 0, duration: 1.0s}

    loop every frame (1.0s ramp)
        Scene->>Scene: cubic ease-in-out interpolation
        Scene->>Bokeh: maxblur = interpolated value
    end

    Note over Bokeh: maxblur=0 (passthrough restored)
```
