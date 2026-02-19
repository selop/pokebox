/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ASSET_BASE_URL?: string
  readonly VITE_OTEL_COLLECTOR_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
