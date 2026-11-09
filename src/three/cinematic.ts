/**
 * Cinematic choreography: timed keyframe tracks that drive the real DEF-* skeleton (via `Pose`),
 * the whole-body motion (lift / pitch / bank), the FX channels and the camera.
 *
 * Within a track, a channel left out of a keyframe inherits the previous keyframe's value. Each track
 * starts from the pose / channels the previous move of `REEL` ends on, so the full reel is continuous;
 * the armour additionally eases the first 0.35 s of any move in from the current state and settles back
 * to rest when a sequence ends.
 *
 * `Pose` angles use the conventions of `actions.ts`: [pitch, yaw, roll] radians in model space, right
 * side written explicitly (yaw and roll mirrored).
 */
import { BONE_KEYS, type BoneKey, type Euler3, type Pose } from './actions'

export type CinematicMove = 'power-up' | 'takeoff' | 'hover' | 'dive' | 'landing' | 'hero' | 'repulsor' | 'unibeam'

/** Order of the full reel. Each move starts where the previous one ends. */
export const REEL: CinematicMove[] = ['power-up', 'takeoff', 'hover', 'dive', 'landing', 'hero', 'repulsor', 'unibeam']

export const MOVE_LABEL: Record<CinematicMove, string> = {
  'power-up': 'POWER UP',
  takeoff: 'TAKE OFF',
  hover: 'HOVER',
  dive: 'DIVE',
  landing: 'LANDING',
  hero: 'REVEAL',
  repulsor: 'REPULSORS',
  unibeam: 'UNIBEAM',
}

/** Scalar channels interpolated alongside the pose. */
interface Channels {
  /** Whole-body lift in scene units (negative = crouch below the standing height). */
  lift: number
  /** Whole-body forward pitch / roll (rad). */
  pitch: number
  bank: number
  /** Boot thruster intensity 0..1. */
  thrust: number
  beamL: number
  beamR: number
  /** Chest reactor flare / power override 0..1. */
  reactor: number
  /** Ground-impact pulse (drives the shockwave) and chest unibeam 0..1. */
  impact: number
  uni: number
  /** Speed streaks 0..1; positive = streaks move up (suit descending), negative = down (ascending). */
  speed: number
  /** Camera: distance multiplier, look-height offset (scene units), orbit around the suit (rad), shake 0..1. */
  cd: number
  cl: number
  co: number
  shake: number
}

const CHANNELS = ['lift', 'pitch', 'bank', 'thrust', 'beamL', 'beamR', 'reactor', 'impact', 'uni', 'speed', 'cd', 'cl', 'co', 'shake'] as const

const DEFAULTS: Channels = {
  lift: 0, pitch: 0, bank: 0, thrust: 0, beamL: 0, beamR: 0, reactor: 0, impact: 0, uni: 0, speed: 0, cd: 1, cl: 0, co: 0, shake: 0,
}

type Keyframe = { at: number; pose: Pose } & Partial<Channels>
type Frame = { at: number; pose: Pose } & Channels

const P = {
  // Arms pulled back, fists clenched: reactor charging.
  power: {
    chest: [0.04, 0, 0], spine2: [0.02, 0, 0],
    armL: [-0.25, 0, 0.48], armR: [-0.25, 0, -0.48],
    foreL: [-0.55, 0, 0], foreR: [-0.55, 0, 0],
    handL: [0, 0, 0.2], handR: [0, 0, -0.2],
  },
  // Crouched launch: arms swept back, knees bent, body pitched into flight.
  launch: {
    chest: [0.28, 0, 0], spine2: [0.18, 0, 0], neck: [-0.2, 0, 0], head: [-0.25, 0, 0],
    armL: [0.85, 0, 0.5], armR: [0.85, 0, -0.5],
    foreL: [-0.25, 0, 0], foreR: [-0.25, 0, 0],
    thighL: [0.35, 0, 0.1], thighR: [0.35, 0, -0.1],
    shinL: [0.6, 0, 0], shinR: [0.6, 0, 0],
  },
  // Stable airborne pose.
  hover: {
    chest: [0.08, 0, 0],
    armL: [0.45, 0, 0.42], armR: [0.45, 0, -0.42],
    foreL: [-0.18, 0, 0], foreR: [-0.18, 0, 0],
    thighL: [0.15, 0, 0.08], thighR: [0.15, 0, -0.08],
    shinL: [0.35, 0, 0], shinR: [0.35, 0, 0],
    footL: [0.2, 0, 0], footR: [0.2, 0, 0],
  },
  // Fast dive, arms tight against the body.
  dive: {
    chest: [0.62, 0, 0], spine2: [0.2, 0, 0], neck: [-0.25, 0, 0], head: [-0.28, 0, 0],
    armL: [0.95, 0, 0.22], armR: [0.95, 0, -0.22],
    foreL: [-0.1, 0, 0], foreR: [-0.1, 0, 0],
    thighL: [0.25, 0, 0], thighR: [0.25, 0, 0],
    shinL: [0.2, 0, 0], shinR: [0.2, 0, 0],
  },
  // Three-point landing: one knee down, opposite leg planted, one hand near the floor.
  landing: {
    chest: [0.35, 0, 0.05], spine2: [0.18, 0, 0],
    armL: [-0.7, 0, 0.7], armR: [-0.2, 0, -0.3],
    foreL: [-0.75, 0, 0], foreR: [-0.25, 0, 0],
    thighL: [-0.95, 0, 0.08], thighR: [-0.35, 0, -0.08],
    shinL: [1.25, 0, 0], shinR: [0.55, 0, 0],
    footL: [-0.25, 0, 0], footR: [-0.15, 0, 0],
  },
  // Both palms aimed at the camera.
  repulsor: {
    chest: [-0.08, 0, 0],
    armL: [-1.25, 0.65, 0.05], armR: [-1.25, -0.65, -0.05],
    foreL: [-0.12, 0, 0], foreR: [-0.12, 0, 0],
    handL: [0, 0, 1.5], handR: [0, 0, -1.5],
  },
  // Arms open wide; the chest reactor is the focus.
  unibeam: {
    chest: [-0.15, 0, 0], spine2: [-0.08, 0, 0],
    armL: [0.15, 0, 1.05], armR: [0.15, 0, -1.05],
    foreL: [-0.15, 0, 0], foreR: [-0.15, 0, 0],
    handL: [0, 0, 0.15], handR: [0, 0, -0.15],
  },
  // Signature hero stance.
  hero: {
    chest: [-0.06, 0, 0], spine2: [-0.03, 0, 0],
    armL: [-0.2, 0, 0.35], armR: [-0.2, 0, -0.35],
    foreL: [-0.25, 0, 0], foreR: [-0.25, 0, 0],
    thighL: [0.02, 0, 0.04], thighR: [0.02, 0, -0.04],
  },
} satisfies Record<string, Pose>

const RAW: Record<CinematicMove, Keyframe[]> = {
  // Darkness -> reactor flickers -> full power. Camera starts on the reactor, pushes up to the helmet, pulls back.
  'power-up': [
    { at: 0, pose: {}, reactor: 0.12, cd: 0.32, cl: 0.9 },
    { at: 0.5, pose: P.power, reactor: 0.6 },
    { at: 1.3, pose: P.power, reactor: 1 },
    { at: 1.55, pose: P.power, reactor: 0.3 },
    { at: 1.72, pose: P.power, reactor: 1 },
    { at: 2.5, pose: P.power, reactor: 1, cd: 0.2, cl: 1.45 },
    { at: 3.4, pose: P.hero, reactor: 1, cd: 1, cl: 0 },
  ],

  // Crouch, explode upward, streaks rush down the frame while the camera climbs with the suit.
  takeoff: [
    { at: 0, pose: P.hero },
    { at: 0.4, pose: P.launch, lift: -0.12, thrust: 0.3, pitch: 0.2, cd: 1.05 },
    { at: 1.1, pose: P.launch, lift: 1.2, thrust: 1, pitch: 0.4, speed: -0.8, cd: 1.25, cl: 0.7, co: 0.15 },
    { at: 2.0, pose: P.hover, lift: 2.1, thrust: 0.8, pitch: 0.12, speed: -0.4, cd: 1.35, cl: 1.2, co: 0.3 },
    { at: 2.8, pose: P.hover, lift: 2.2, thrust: 0.55, pitch: 0.05, speed: 0, cl: 1.3 },
  ],

  // Hold altitude, bank left then right while the camera orbits.
  hover: [
    { at: 0, pose: P.hover, lift: 2.2, thrust: 0.55, pitch: 0.05, cd: 1.35, cl: 1.3, co: 0.3 },
    { at: 1.2, pose: P.hover, lift: 2.3, thrust: 0.45, bank: 0.1, co: 0.6 },
    { at: 2.4, pose: P.hover, lift: 2.05, thrust: 0.55, bank: -0.1, cl: 1.2, co: 0.85 },
    { at: 3.6, pose: P.hover, lift: 2.1, thrust: 0.55, bank: 0, cl: 1.3, co: 0.65 },
  ],

  // Pitch over and plunge; the camera swings to profile and drops with the suit, streaks race upward.
  dive: [
    { at: 0, pose: P.hover, lift: 2.1, thrust: 0.55, pitch: 0.05, bank: 0, cd: 1.35, cl: 1.3, co: 0.65 },
    { at: 0.45, pose: P.dive, lift: 1.7, thrust: 1, pitch: 0.6, bank: -0.1, speed: 0.7, cd: 1.3, cl: 1.0, co: 1.0 },
    { at: 1.1, pose: P.dive, lift: 0.8, pitch: 0.9, bank: -0.15, speed: 1, cd: 1.2, cl: 0.5, co: 1.1, shake: 0.15 },
    { at: 1.7, pose: P.dive, lift: 0.22, pitch: 1.0, bank: 0, speed: 1, cd: 1.1, cl: 0.15, co: 0.9, shake: 0.25 },
  ],

  // Slam into a three-point landing: shockwave, camera shake, then rise into the hero stance.
  landing: [
    { at: 0, pose: P.dive, lift: 0.22, thrust: 1, pitch: 1.0, speed: 1, cd: 1.1, cl: 0.15, co: 0.9, shake: 0.25 },
    { at: 0.3, pose: P.landing, lift: -0.28, thrust: 0.8, pitch: 0.15, speed: 0.3, cd: 1, cl: 0, co: 0.5, shake: 0.4 },
    { at: 0.42, pose: P.landing, thrust: 0.1, speed: 0, impact: 1, shake: 1 },
    { at: 0.9, pose: P.landing, thrust: 0, impact: 0, shake: 0.25 },
    { at: 1.5, pose: P.landing, shake: 0 },
    { at: 2.2, pose: P.hero, lift: 0, co: 0.15 },
    { at: 2.7, pose: P.hero },
  ],

  // Slow dramatic reveal: low orbit away to the side, then sweeping round to the front and pushing in.
  hero: [
    { at: 0, pose: P.hero, cd: 1, cl: 0, co: 0.15 },
    { at: 1.2, pose: P.hero, cd: 1.15, cl: -0.25, co: -0.7 },
    { at: 2.8, pose: P.hero, reactor: 0.9, cd: 0.85, cl: 0.2, co: 0 },
  ],

  // Palms up, right fires first then left; the torso kicks back on each shot.
  repulsor: [
    { at: 0, pose: P.hero, reactor: 0.9, cd: 0.85, cl: 0.2 },
    { at: 0.4, pose: P.repulsor },
    { at: 0.9, pose: P.repulsor, reactor: 1, cd: 0.8 },
    { at: 1.1, pose: P.repulsor, beamR: 1, shake: 0.12, pitch: -0.04 },
    { at: 1.3, pose: P.repulsor, beamL: 1, shake: 0.35, pitch: -0.07 },
    { at: 1.55, pose: P.repulsor, beamL: 0.15, beamR: 0.15, shake: 0.1, pitch: -0.02 },
    { at: 1.85, pose: P.repulsor, beamL: 0, beamR: 0, shake: 0, pitch: 0 },
    { at: 2.5, pose: P.hero, reactor: 0.6, cd: 1, cl: 0 },
  ],

  // Arms open, reactor builds, chest beam fires, then settle.
  unibeam: [
    { at: 0, pose: P.hero, reactor: 0.6, cd: 1, cl: 0 },
    { at: 0.5, pose: P.unibeam, reactor: 0.8, cd: 0.75, cl: 0.5 },
    { at: 1.2, pose: P.unibeam, reactor: 1, cd: 0.7, cl: 0.6 },
    { at: 1.4, pose: P.unibeam, uni: 1, shake: 0.5, pitch: -0.05 },
    { at: 2.0, pose: P.unibeam, uni: 1, shake: 0.3, pitch: -0.03 },
    { at: 2.3, pose: P.unibeam, uni: 0, shake: 0, pitch: 0, cd: 0.8 },
    { at: 3.1, pose: P.hero, reactor: 0.6, cd: 1, cl: 0 },
  ],
}

/** Tracks with every channel resolved (omitted channels inherit the previous keyframe). */
const TRACKS = Object.fromEntries(
  (Object.keys(RAW) as CinematicMove[]).map((move) => {
    let prev: Channels = DEFAULTS
    const frames = RAW[move].map((kf): Frame => {
      const frame = { ...prev, ...kf } as Frame
      prev = frame
      return frame
    })
    return [move, frames]
  }),
) as Record<CinematicMove, Frame[]>

export const cinematicDuration = (move: CinematicMove) => TRACKS[move][TRACKS[move].length - 1].at

export interface CineSample extends Channels {
  pose: Record<BoneKey, Euler3>
  done: boolean
}

/** A sample at rest: neutral pose, camera at its default framing. */
export const emptySample = (): CineSample => ({
  ...DEFAULTS,
  pose: Object.fromEntries(BONE_KEYS.map((k) => [k, [0, 0, 0] as Euler3])) as Record<BoneKey, Euler3>,
  done: false,
})

const ZERO: Euler3 = [0, 0, 0]
const smooth = (a: number, b: number, t: number) => {
  const x = Math.max(0, Math.min(1, (t - a) / (b - a)))
  return x * x * (3 - 2 * x)
}
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/** Samples `move` at `time` seconds into `out` (no allocations). */
export function sampleCinematic(move: CinematicMove, time: number, out: CineSample) {
  const frames = TRACKS[move]
  const duration = frames[frames.length - 1].at
  const t = Math.max(0, Math.min(duration, time))

  let i = 0
  while (i < frames.length - 2 && t > frames[i + 1].at) i++
  const a = frames[i]
  const b = frames[i + 1]
  const alpha = smooth(a.at, b.at, t)

  for (const key of BONE_KEYS) {
    const av = a.pose[key] ?? ZERO
    const bv = b.pose[key] ?? ZERO
    const o = out.pose[key]
    o[0] = lerp(av[0], bv[0], alpha)
    o[1] = lerp(av[1], bv[1], alpha)
    o[2] = lerp(av[2], bv[2], alpha)
  }
  for (const ch of CHANNELS) out[ch] = lerp(a[ch], b[ch], alpha)
  out.done = time >= duration
  return out
}

export function copySample(src: CineSample, dst: CineSample) {
  for (const key of BONE_KEYS) {
    const s = src.pose[key]
    const d = dst.pose[key]
    d[0] = s[0]
    d[1] = s[1]
    d[2] = s[2]
  }
  for (const ch of CHANNELS) dst[ch] = src[ch]
  dst.done = src.done
}

/** `out = a + (b - a) * t` for every pose angle and channel. `out` may alias `a` or `b`. */
export function mixSample(a: CineSample, b: CineSample, t: number, out: CineSample) {
  for (const key of BONE_KEYS) {
    const av = a.pose[key]
    const bv = b.pose[key]
    const o = out.pose[key]
    o[0] = lerp(av[0], bv[0], t)
    o[1] = lerp(av[1], bv[1], t)
    o[2] = lerp(av[2], bv[2], t)
  }
  for (const ch of CHANNELS) out[ch] = lerp(a[ch], b[ch], t)
  return out
}

export { smooth as smoothstep }
