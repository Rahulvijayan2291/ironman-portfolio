/**
 * Procedural action rig for the supplied suit.
 *
 * The GLB ships only T-pose clips (they are deliberately not used), so every action here is
 * authored in code: joint deltas layered on top of the bind pose, driven through the real
 * skeleton so the reactor / repulsor / thruster FX stay attached while the suit moves.
 *
 * Angles are radians as [pitch (about X), yaw (about Y), roll (about Z)] in model space, applied on
 * top of each bone's bind rotation. In this A-pose the arms hang down -Y and the suit faces +Z, so:
 *   arm pitch  < 0  swings the arm forward,  > 0 swings it back
 *   left arm roll > 0 lifts it outward (right arm is mirrored automatically)
 */

export type ActionName = 'fire' | 'flight' | 'scan'
export type Euler3 = [number, number, number]

export const BONE_NODES = {
  pelvis: 'DEF-pelvis',
  spine1: 'DEF-spine001',
  spine2: 'DEF-spine002',
  chest: 'DEF-spine003',
  neck: 'DEF-spine005',
  head: 'DEF-spine006',
  shoulderL: 'DEF-shoulderL',
  shoulderR: 'DEF-shoulderR',
  armL: 'DEF-upper_armL',
  armR: 'DEF-upper_armR',
  foreL: 'DEF-forearmL',
  foreR: 'DEF-forearmR',
  handL: 'DEF-handL',
  handR: 'DEF-handR',
  thighL: 'DEF-thighL',
  thighR: 'DEF-thighR',
  shinL: 'DEF-shinL',
  shinR: 'DEF-shinR',
  footL: 'DEF-footL',
  footR: 'DEF-footR',
} as const

export type BoneKey = keyof typeof BONE_NODES
export const BONE_KEYS = Object.keys(BONE_NODES) as BoneKey[]
export type Pose = Partial<Record<BoneKey, Euler3>>

/** Mirrors a left-side Euler for the right side (pitch is shared; yaw and roll flip). */
const mirror = (e: Euler3, s: 1 | -1): Euler3 => [e[0], e[1] * s, e[2] * s]

interface LimbSet {
  shoulder?: Euler3
  arm?: Euler3
  fore?: Euler3
  hand?: Euler3
  thigh?: Euler3
  shin?: Euler3
  foot?: Euler3
}

/** Expands a left-side description into a pose for one side (`L`, +1) or both. */
function limbs(side: 'L' | 'R', v: LimbSet): Pose {
  const s = side === 'L' ? 1 : -1
  const out: Pose = {}
  const put = (key: string, e?: Euler3) => {
    if (e) out[`${key}${side}` as BoneKey] = mirror(e, s)
  }
  put('shoulder', v.shoulder)
  put('arm', v.arm)
  put('fore', v.fore)
  put('hand', v.hand)
  put('thigh', v.thigh)
  put('shin', v.shin)
  put('foot', v.foot)
  return out
}

const merge = (...poses: Pose[]): Pose => {
  const out: Pose = {}
  poses.forEach((p) => {
    ;(Object.keys(p) as BoneKey[]).forEach((k) => {
      const cur = out[k] ?? [0, 0, 0]
      const add = p[k]!
      out[k] = [cur[0] + add[0], cur[1] + add[1], cur[2] + add[2]]
    })
  })
  return out
}

/**
 * Repulsor aim: arm raised ~65° and angled outward so the blast reads in profile from the
 * front camera; the wrist is extended and the hand twisted so the palm (and its repulsor)
 * faces down the barrel of the arm.
 */
const AIM: LimbSet = {
  shoulder: [0, 0, 0.08],
  arm: [-1.3, 0.7, 0.05],
  fore: [-0.12, 0, 0],
  // roll of ~90° about Z turns the palm normal (-X in the bind pose) onto the arm axis (-Y)
  hand: [0, 0, 1.5],
}

export const POSES = {
  fireL: merge(limbs('L', AIM), { chest: [0, 0.14, 0], spine2: [0, 0.1, 0], head: [0.05, 0.1, 0] }),
  fireR: merge(limbs('R', AIM), { chest: [0, -0.14, 0], spine2: [0, -0.1, 0], head: [0.05, -0.1, 0] }),
  flight: merge(
    limbs('L', {
      shoulder: [0, 0, 0.1],
      arm: [0.6, 0, 0.55],
      fore: [-0.25, 0, 0],
      hand: [0, 0, 0.15],
      thigh: [0.2, 0, 0.08],
      shin: [0.45, 0, 0],
      foot: [0.3, 0, 0],
    }),
    limbs('R', {
      shoulder: [0, 0, 0.1],
      arm: [0.6, 0, 0.55],
      fore: [-0.25, 0, 0],
      hand: [0, 0, 0.15],
      thigh: [0.2, 0, 0.08],
      shin: [0.45, 0, 0],
      foot: [0.3, 0, 0],
    }),
    { spine1: [0.1, 0, 0], spine2: [0.1, 0, 0], chest: [0.08, 0, 0], neck: [-0.22, 0, 0], head: [-0.3, 0, 0] },
  ),
  scan: merge(
    limbs('L', { shoulder: [0, 0, 0.1], arm: [-0.12, 0, 0.62], fore: [-0.22, 0, 0], hand: [0, 0, 0.1] }),
    limbs('R', { shoulder: [0, 0, 0.1], arm: [-0.12, 0, 0.62], fore: [-0.22, 0, 0], hand: [0, 0, 0.1] }),
    { chest: [-0.04, 0, 0] },
  ),
} satisfies Record<string, Pose>

/** Suit power-up curve: dark -> flickering -> fully lit, `t` seconds after power was requested. */
export function ignite(t: number) {
  const base = sstep(0.25, 1.6, t)
  const flicker = t < 1.2 ? 0.55 + 0.45 * Math.abs(Math.sin(t * 52) * Math.sin(t * 21)) : 1
  return base * flicker
}

/** Total running time of each action in seconds. */
export const DURATION: Record<ActionName, number> = { fire: 3.6, flight: 5.2, scan: 3.8 }

export const ACTION_LABEL: Record<ActionName, string> = {
  fire: 'REPULSOR BLAST // FIRING',
  flight: 'FLIGHT MODE // THRUSTERS ONLINE',
  scan: 'SCAN SWEEP // ANALYSING',
}

// ---- envelope helpers -------------------------------------------------------------------
const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
export const sstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}
/** Rises over `rin` from `a`, falls over `rout` ending at `b`. */
export const pulse = (t: number, a: number, b: number, rin: number, rout: number) => sstep(a, a + rin, t) * (1 - sstep(b - rout, b, t))
/** Impulse that jumps at `at` and decays exponentially (used for recoil). */
export const kick = (t: number, at: number, rate = 5) => (t < at ? 0 : Math.exp(-(t - at) * rate) * sstep(at, at + 0.04, t))

export interface ActionFrame {
  armL: number
  armR: number
  beamL: number
  beamR: number
  flight: number
  scan: number
  /** 0..1 progress of the scan sweep and its visibility */
  scanP: number
  scanA: number
  recoil: number
}

export const emptyFrame = (): ActionFrame => ({ armL: 0, armR: 0, beamL: 0, beamR: 0, flight: 0, scan: 0, scanP: 0, scanA: 0, recoil: 0 })

/**
 * Fills `f` with the target weights of `name` at time `t`.
 * `hold` makes the action sustained (used while a page section is on screen): flight and scan stay
 * engaged, and the fire / scan sequences repeat.
 */
export function sampleAction(name: ActionName, t: number, f: ActionFrame, hold = false) {
  const tt = hold ? t % DURATION[name] : t
  if (name === 'fire') {
    // right arm first, left follows; each blast kicks the torso back
    f.armR = pulse(tt, 0, 2.1, 0.45, 0.6)
    f.armL = pulse(tt, 1.0, 3.1, 0.45, 0.6)
    f.beamR = pulse(tt, 0.5, 1.8, 0.1, 0.18)
    f.beamL = pulse(tt, 1.5, 2.8, 0.1, 0.18)
    f.recoil = kick(tt, 0.5) + kick(tt, 1.5)
  } else if (name === 'flight') {
    f.flight = hold ? sstep(0, 1.0, t) : pulse(t, 0, DURATION.flight, 1.0, 1.1)
  } else {
    f.scan = hold ? sstep(0, 0.5, t) : pulse(tt, 0, DURATION.scan, 0.5, 0.6)
    f.scanP = sstep(0.35, 3.0, tt)
    f.scanA = pulse(tt, 0.3, 3.2, 0.2, 0.3)
  }
}
