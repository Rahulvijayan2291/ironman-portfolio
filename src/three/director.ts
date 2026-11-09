import { bus, setVisible, type Mode, type Shot } from './bus'

/**
 * Scroll director. Turns the page position into 3D "shots": a keyframe track built from the real
 * section positions (so it survives any content height / viewport size) that sets where the camera
 * is, where the suit is on screen, how it is oriented and which action it performs:
 *
 *   hero        face close-up, eyes ignite -> camera pulls back -> full body on the right
 *   about       flight: lift-off from the right, flies out past the left edge, re-enters from the right
 *   experience  lands on the right and fires the repulsors
 *   skills ..   suit leaves the frame (dense content gets the whole screen)
 *   contact     returns and runs a scan sweep
 *
 * Output goes to `bus.shot` (targets). The camera rig eases toward it every frame, which also
 * smooths scroll jitter.
 */

interface Key extends Shot {
  y: number
  mode: Mode
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x))
const clamp01 = (x: number) => clamp(x, 0, 1)

let keys: Key[] = []
let staticLayout = false
let reducedMotion = false
let raf = 0

// ---- hero phase store (0 = face + name, 1 = main copy, 2 = pulled back / controls, 3 = past the hero) ----
let phase = 0
const phaseListeners = new Set<() => void>()
export const subscribePhase = (cb: () => void) => {
  phaseListeners.add(cb)
  return () => {
    phaseListeners.delete(cb)
  }
}
export const getPhase = () => phase

const abs = (el: Element | null) => {
  if (!el) return { top: 0, bottom: 0, h: 0 }
  const r = el.getBoundingClientRect()
  const top = r.top + window.scrollY
  return { top, bottom: top + r.height, h: r.height }
}

/** 0..1 progress through the pinned hero story (1 for the static layout). */
export function heroProgress(): number {
  const hero = document.getElementById('home')
  if (!hero || staticLayout) return 1
  const span = hero.offsetHeight - window.innerHeight
  return span <= 0 ? 1 : clamp01(window.scrollY / span)
}

/** Right edge (px) of the readable content column of a section that reserves a right-hand gutter. */
function contentRight(section: HTMLElement | null): number | null {
  const col = section?.querySelector<HTMLElement>('[data-gutter]')
  if (!col) return null
  return col.getBoundingClientRect().right
}

function build() {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const aspect = vw / vh
  const wide = vw >= 900 && aspect > 1.15
  const hero = document.getElementById('home')
  const about = abs(document.getElementById('about'))
  const expEl = document.getElementById('experience')
  const exp = abs(expEl)
  const skills = abs(document.getElementById('skills'))
  const contactEl = document.getElementById('contact')
  const contact = abs(contactEl)
  const docEnd = Math.max(document.documentElement.scrollHeight - vh, contact.top)
  const H = hero ? Math.max(1, hero.offsetHeight - vh) : vh

  // Camera distances that give the same share of the viewport on any aspect ratio.
  // Visible height at distance d (fov 30deg) = 2 * d * tan(15deg) = 0.536 * d
  const bodyDist = wide ? 9.1 : 3.4 / (0.36 * 0.536)
  const faceDist = wide ? 1.5 : Math.max(1.9, 0.72 / (0.536 * aspect))
  const faceLook = 3.1
  const fxBody = wide ? 0.2 : 0
  const fyBody = wide ? -0.02 : 0.26

  const base: Shot = { dist: bodyDist, look: 1.72, fx: fxBody, fy: fyBody, yaw: wide ? -0.16 : 0, pitch: 0, bank: 0, alpha: 1, floor: 1 }
  const face: Shot = { ...base, dist: faceDist, look: faceLook, fx: wide ? 0.17 : 0, fy: wide ? 0 : 0.12, yaw: wide ? -0.3 : -0.12, floor: 0 }
  const k = (y: number, s: Partial<Shot>, mode: Mode = 'none', from: Shot = base): Key => ({ ...from, ...s, y, mode })

  if (staticLayout) {
    // reduced motion / no scroll story: the full-body figure stays in the hero only
    const heroBottom = hero ? abs(hero).bottom : vh
    keys = [k(0, {}), k(Math.max(1, heroBottom - vh), {}), k(Math.max(2, heroBottom - vh * 0.3), { alpha: 0 }), k(docEnd + 3, { alpha: 0 })]
    return
  }

  // Where the suit stands beside a section that reserves a right-hand gutter (wide screens only).
  const half = (d: number) => (1.15 / (0.536 * d)) * vh
  const standing = (el: HTMLElement | null, d: number, fallback: number): Partial<Shot> => {
    if (!wide) return { dist: bodyDist * 1.1, fx: 0, fy: 0.05, yaw: -0.2, alpha: 0.28 }
    const right = contentRight(el)
    const fx = right == null ? fallback : clamp((right + half(d) + 10) / vw - 0.5, 0.12, 0.34)
    return { dist: d, fx, fy: -0.04, yaw: -0.4, alpha: 1 }
  }
  const stand = (el: HTMLElement | null) => standing(el, bodyDist * 1.1, 0.27)
  const away: Partial<Shot> = { fx: wide ? 0.62 : 0.3, alpha: 0, floor: 0 }

  const aH = about.h
  const fly = (t: number, s: Partial<Shot>): Key => k(about.top + aH * t, { floor: 0, ...s }, 'flight')
  const ghost = wide ? 1 : 0.3
  // Screen-space shift that puts the (horizontal) flying suit completely outside the viewport.
  const off = wide ? 0.85 : 1.3
  const cruise: Partial<Shot> = { dist: bodyDist * 1.5, fy: wide ? 0.24 : 0.15, yaw: -1.4, pitch: 1.1, bank: -0.12, alpha: ghost }

  const list: Key[] = [
    // ---- hero: face close-up, then pull back to full body on the right -------------------
    k(0, face, 'none', face),
    k(H * 0.14, face, 'none', face),
    k(H * 0.78, {}),
    k(H, {}),
    // ---- about: take off from the right, sweep across the page -----------------------------
    k(H + vh * 0.25, { floor: 0.5 }, 'flight'),
    fly(0.12, { dist: bodyDist * 1.25, fx: wide ? 0.14 : 0, fy: 0.2, yaw: -0.7, pitch: 0.55, bank: -0.1, alpha: ghost }),
    // leaves through the left edge...
    fly(0.34, { ...cruise, fx: -off }),
    // ...and (a 2px jump, the camera rig snaps across it) comes back in from the right, still flying left
    k(about.top + aH * 0.34 + 2, { floor: 0, ...cruise, fx: off }, 'flight'),
    fly(0.64, { ...cruise, dist: bodyDist * 1.35, fx: wide ? 0.3 : 0.05, pitch: 0.9, yaw: -1.2, bank: 0.08 }),
    // slows, straightens up and settles beside the Experience copy
    fly(0.92, { ...stand(expEl), fy: wide ? 0.06 : 0.1, pitch: 0.25, floor: 0 }),
    // ---- experience: land on the right and fire -----------------------------------------
    k(Math.max(about.bottom - vh * 0.05, about.top + aH * 0.95), stand(expEl), 'none'),
    k(exp.top + vh * 0.4, stand(expEl), 'fire'),
    k(exp.bottom - vh * 0.8, stand(expEl), 'fire'),
    k(exp.bottom - vh * 0.3, { ...stand(expEl), ...away }, 'none'),
    // ---- skills .. achievements: suit off-stage ------------------------------------------
    k(Math.max(skills.top, contact.top - vh * 1.2), away, 'none'),
    k(contact.top - vh * 0.6, away, 'none'),
    // ---- contact: scan -------------------------------------------------------------------
    k(contact.top - vh * 0.05, stand(contactEl), 'scan'),
    k(docEnd + 3, stand(contactEl), 'scan'),
  ]

  // keys must be strictly increasing in y
  list.sort((a, b) => a.y - b.y)
  for (let i = 1; i < list.length; i++) if (list[i].y <= list[i - 1].y) list[i].y = list[i - 1].y + 1
  keys = list
}

const NUMERIC = ['look', 'fx', 'fy', 'yaw', 'pitch', 'bank', 'alpha', 'floor'] as const

function apply() {
  raf = 0
  if (!keys.length) return
  const y = window.scrollY

  // hero phase + progress variable for the CSS fades
  const p = heroProgress()
  document.documentElement.style.setProperty('--hero-p', p.toFixed(3))
  const hero = document.getElementById('home')
  const pastHero = hero ? y > hero.offsetHeight - window.innerHeight * 0.55 : false
  const next = pastHero ? 3 : staticLayout ? 2 : p < 0.12 ? 0 : p < 0.72 ? 1 : 2
  if (next !== phase) {
    phase = next
    phaseListeners.forEach((l) => l())
  }

  let i = 0
  while (i < keys.length - 2 && y >= keys[i + 1].y) i++
  const a = keys[i]
  const b = keys[i + 1] ?? a
  const t = b.y === a.y ? 0 : clamp01((y - a.y) / (b.y - a.y))
  const s = bus.shot
  s.dist = Math.exp(lerp(Math.log(a.dist), Math.log(b.dist), t))
  for (const n of NUMERIC) s[n] = lerp(a[n], b[n], t)
  bus.mode = reducedMotion ? 'none' : a.mode
  // wake the render loop as soon as the suit is due back on screen
  if (s.alpha > 0.01) setVisible(true)
  // before the 3D is ready, the poster layer is the only thing on screen
  if (bus.status !== 'ready' && bus.layer) bus.layer.style.opacity = String(s.alpha)
}

function schedule() {
  if (!raf) raf = requestAnimationFrame(apply)
}

function rebuild() {
  build()
  schedule()
}

export interface DirectorOptions {
  /** True for reduced motion or any layout without the pinned hero story. */
  staticLayout: boolean
  reduced: boolean
}

/** Starts the director; returns a cleanup function. */
export function startDirector(opts: DirectorOptions) {
  staticLayout = opts.staticLayout
  reducedMotion = opts.reduced
  rebuild()
  window.addEventListener('scroll', schedule, { passive: true })
  window.addEventListener('resize', rebuild)
  // section heights change as fonts / images / reveal animations settle
  const ro = new ResizeObserver(rebuild)
  ro.observe(document.body)
  const late = window.setTimeout(rebuild, 1200)
  return () => {
    window.removeEventListener('scroll', schedule)
    window.removeEventListener('resize', rebuild)
    ro.disconnect()
    window.clearTimeout(late)
    cancelAnimationFrame(raf)
    raf = 0
    bus.mode = 'none'
    document.documentElement.style.removeProperty('--hero-p')
  }
}
