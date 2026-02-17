const base = import.meta.env.VITE_ASSET_BASE_URL ?? ''

export const assetUrl = (path: string) => `${base}${path}`
