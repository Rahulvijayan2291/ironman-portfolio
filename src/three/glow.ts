import * as THREE from 'three'

const cache = new Map<string, THREE.CanvasTexture>()

/** Radial gradient texture (stops are [0..1 radius, css colour]). Cached by key. */
export function radialTexture(key: string, stops: Array<[number, string]>, size = 256): THREE.CanvasTexture {
  const hit = cache.get(key)
  if (hit) return hit
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  stops.forEach(([t, c]) => g.addColorStop(t, c))
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  cache.set(key, tex)
  return tex
}

/** Vertical alpha gradient used for the faux-volumetric light beam (top of canvas = cone apex). */
export function beamTexture(): THREE.CanvasTexture {
  const hit = cache.get('beam')
  if (hit) return hit
  const canvas = document.createElement('canvas')
  canvas.width = 4
  canvas.height = 256
  const ctx = canvas.getContext('2d')!
  const g = ctx.createLinearGradient(0, 0, 0, 256)
  g.addColorStop(0, '#000')
  g.addColorStop(0.3, '#777')
  g.addColorStop(0.8, '#aaa')
  g.addColorStop(1, '#222')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 4, 256)
  const tex = new THREE.CanvasTexture(canvas)
  cache.set('beam', tex)
  return tex
}

export const CORE_STOPS: Array<[number, string]> = [
  [0, 'rgba(255,255,255,1)'],
  [0.35, 'rgba(210,248,255,1)'],
  [0.7, 'rgba(70,215,255,0.9)'],
  [1, 'rgba(53,223,255,0)'],
]

export const FLAME_STOPS: Array<[number, string]> = [
  [0, 'rgba(255,245,225,0.95)'],
  [0.3, 'rgba(255,170,80,0.55)'],
  [1, 'rgba(255,110,40,0)'],
]

export const HALO_STOPS: Array<[number, string]> = [
  [0, 'rgba(120,235,255,0.85)'],
  [0.25, 'rgba(53,223,255,0.35)'],
  [1, 'rgba(53,223,255,0)'],
]
