export type QualityTier = 'high' | 'medium' | 'low'

export interface Quality {
  tier: QualityTier
  /** [min, max] device pixel ratio; PerformanceMonitor moves between them. */
  dpr: [number, number]
  /** Number of dust sparkles (0 disables). */
  sparkles: number
  /** GLB to load: full 2K textures or the 1K "lite" variant. */
  modelFile: string
  antialias: boolean
}

interface NavigatorHints extends Navigator {
  deviceMemory?: number
  connection?: { saveData?: boolean }
}

/** Device-aware quality selection. Cheap heuristics only; PerformanceMonitor refines at runtime. */
export function detectQuality(): Quality {
  const nav = navigator as NavigatorHints
  const cores = nav.hardwareConcurrency ?? 4
  const memory = nav.deviceMemory ?? 4
  const coarse = window.matchMedia('(pointer: coarse)').matches
  const small = window.innerWidth < 820
  const saveData = Boolean(nav.connection?.saveData)

  let score = 2
  if (cores <= 4 || memory <= 4) score -= 1
  if (coarse || small) score -= 1
  if (saveData) score = 0

  const base = import.meta.env.BASE_URL
  if (score >= 2) {
    return { tier: 'high', dpr: [1, 2], sparkles: 90, modelFile: `${base}models/ironman.glb`, antialias: true }
  }
  if (score === 1) {
    return { tier: 'medium', dpr: [1, 1.5], sparkles: 36, modelFile: `${base}models/ironman-lite.glb`, antialias: true }
  }
  return { tier: 'low', dpr: [1, 1.25], sparkles: 0, modelFile: `${base}models/ironman-lite.glb`, antialias: false }
}
