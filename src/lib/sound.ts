/**
 * Procedural UI sounds via WebAudio (no audio files, no autoplay).
 * Silent until the visitor explicitly turns sound on.
 */
const KEY = 'stark:sound'

let ctx: AudioContext | null = null
let on = false

try {
  on = sessionStorage.getItem(KEY) === '1'
} catch {
  /* storage unavailable */
}

type Listener = (on: boolean) => void
const listeners = new Set<Listener>()

export const isSoundOn = () => on
export const subscribeSound = (l: Listener) => {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

function audio(): AudioContext | null {
  if (!on) return null
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx ??= new AC()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

function tone(freq: number, dur: number, opts: { type?: OscillatorType; gain?: number; delay?: number; to?: number } = {}) {
  const c = audio()
  if (!c) return
  const { type = 'sine', gain = 0.04, delay = 0, to } = opts
  const t0 = c.currentTime + delay
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur)
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.015)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(g).connect(c.destination)
  osc.start(t0)
  osc.stop(t0 + dur + 0.02)
}

export const sfx = {
  ping: () => tone(880, 0.09, { type: 'triangle', gain: 0.025 }),
  charge: () => tone(180, 0.7, { type: 'sawtooth', gain: 0.02, to: 900 }),
  fire: () => {
    tone(1400, 0.35, { type: 'sawtooth', gain: 0.025, to: 120 })
    tone(90, 0.5, { type: 'sine', gain: 0.05, delay: 0.05, to: 50 })
  },
  flight: () => tone(70, 1.6, { type: 'sawtooth', gain: 0.025, to: 320 }),
  scan: () => tone(500, 1.1, { type: 'sine', gain: 0.03, to: 1500 }),
  power: () => {
    tone(220, 0.5, { type: 'sine', gain: 0.04, to: 660 })
    tone(660, 0.6, { type: 'triangle', gain: 0.025, delay: 0.18 })
  },
}

export function setSound(next: boolean) {
  on = next
  try {
    sessionStorage.setItem(KEY, next ? '1' : '0')
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l(on))
  if (on) sfx.power()
}
