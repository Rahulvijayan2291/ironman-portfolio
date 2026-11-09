import type { ActionName } from './actions'
import { REEL, type CinematicMove } from './cinematic'
import { hasWebGL } from './webgl'

export type ActionState = ActionName | 'idle'

/** One camera / placement keyframe of the scroll story. */
export interface Shot {
  /** Camera distance in scene units (interpolated logarithmically). */
  dist: number
  /** World height the camera looks at. */
  look: number
  /** Screen-space shift of the figure as a fraction of viewport width (+ = right) / height (+ = up). */
  fx: number
  fy: number
  /** Whole-body yaw (rad, - = turns toward screen-left), forward pitch (rad) and roll (rad). */
  yaw: number
  pitch: number
  bank: number
  /** Opacity of the whole 3D layer. */
  alpha: number
  /** Visibility of the floor discs / contact shadow (0 while airborne). */
  floor: number
}
export const FULL_BODY: Shot = { dist: 9.2, look: 1.72, fx: 0.2, fy: -0.02, yaw: 0, pitch: 0, bank: 0, alpha: 1, floor: 1 }
/** Scroll-driven behaviour: which action loops while the visitor is in a given part of the page. */
export type Mode = 'none' | ActionName

/**
 * Tiny mutable bridge between the DOM (pointer, scroll, buttons, intro) and the R3F scene.
 * Using a plain object avoids React re-renders for per-frame values.
 */
export const bus = {
  /** Normalised pointer, -1..1, relative to the viewport centre. Mouse only. */
  pointer: { x: 0, y: 0 },
  /** Target repulsor charge (0 idle, 1 charged). The scene eases toward it. */
  charge: 0,
  /** Lighting reveal 0 (darkness) -> 1 (full). Driven by the intro timeline. */
  reveal: 1,
  /** Suit power-up 0 (dark visor / dead reactor) -> 1 (eyes + reactor lit). Driven by the armour. */
  power: 0,
  /** True once the GLB has been parsed and the first frame is ready. */
  ready: false,
  readyListeners: new Set<() => void>(),

  /** Currently playing procedural action. */
  action: 'idle' as ActionState,
  /** Requested action, consumed by the armour on its next frame ('stop' cancels). */
  pending: null as ActionName | 'stop' | null,
  /** Action looped by the scroll director (flight over About, fire over Experience, scan over Contact). */
  mode: 'none' as Mode,
  /** Horizontal drag (radians) applied to the figure; springs back when released. */
  dragYaw: 0,
  dragging: false,
  /** World orientation of the suit root as [x, y, z, w] (thrusters use it to vent along the body). */
  rootQ: [0, 0, 0, 1] as [number, number, number, number],
  actionListeners: new Set<(a: ActionState) => void>(),
  /** Requested cinematic sequence, consumed by the armour when `token` changes (empty `moves` cancels). */
  cinematicRequest: null as { moves: CinematicMove[]; token: number } | null,
  /** Cinematic move currently playing (null when none). */
  cinematic: null as CinematicMove | null,
  cinematicListeners: new Set<(m: CinematicMove | null) => void>(),
  /** Per-frame effect intensities written by the armour and read by the FX components. */
  fx: { beamL: 0, beamR: 0, thrust: 0, lift: 0, flight: 0, scanP: 0, scanA: 0, reactor: 0, impact: 0, uni: 0, speed: 0, pitch: 0 },
  /** Cinematic camera targets (written by the armour) and their eased values (written by the camera rig). */
  cam: { cd: 1, cl: 0, co: 0, shake: 0 },
  camView: { cd: 1, cl: 0, co: 0, shake: 0 },
  /** Shot targets written by the scroll director (see director.ts). */
  shot: { ...FULL_BODY } as Shot,
  /** Eased copy of `shot` (written by the camera rig every frame, read by the armour). */
  view: { ...FULL_BODY } as Shot,
  /** Fixed DOM layer holding the canvas; its opacity is driven by `view.alpha`. */
  layer: null as HTMLElement | null,
  /** False while the figure is faded out (Skills..Achievements): the stage stops rendering. */
  visible: true,
  visibleListeners: new Set<(v: boolean) => void>(),
  /** Scene lifecycle, shared with the DOM (hero layout switches to a static variant on fallback). */
  status: (hasWebGL() ? 'loading' : 'fallback') as SceneStatus,
  statusListeners: new Set<() => void>(),
  /** Smoothly returns the dragged figure to its framed pose. */
  resetView: () => {
    bus.dragYaw = 0
  },
}

export type SceneStatus = 'loading' | 'ready' | 'fallback'

export function setStatus(s: SceneStatus) {
  if (bus.status === s) return
  bus.status = s
  bus.statusListeners.forEach((l) => l())
}
export const subscribeStatus = (cb: () => void) => {
  bus.statusListeners.add(cb)
  return () => {
    bus.statusListeners.delete(cb)
  }
}
export const getStatus = () => bus.status

export function markReady() {
  bus.ready = true
  bus.readyListeners.forEach((l) => l())
  bus.readyListeners.clear()
}

/** Visitor-triggered action. Triggering the running action again cancels it. */
export function triggerAction(name: ActionName) {
  bus.pending = bus.action === name ? 'stop' : name
}

export function setActionState(a: ActionState) {
  bus.action = a
  bus.actionListeners.forEach((l) => l(a))
}

let cinematicToken = 0

/** Plays one or more cinematic moves back to back. The scroll director's action loops are suspended meanwhile. */
export function playCinematic(...moves: CinematicMove[]) {
  bus.pending = null
  bus.cinematicRequest = { moves, token: ++cinematicToken }
}
/** The full reel: reactor power-up, take-off, flight, dive, landing, reveal, repulsors, unibeam. */
export const playReel = () => playCinematic(...REEL)
export function cancelCinematic() {
  if (bus.cinematic !== null) playCinematic()
}
export function setCinematicState(m: CinematicMove | null) {
  if (bus.cinematic === m) return
  bus.cinematic = m
  bus.cinematicListeners.forEach((l) => l(m))
}

export function setVisible(v: boolean) {
  if (bus.visible === v) return
  bus.visible = v
  bus.visibleListeners.forEach((l) => l(v))
}

/** Resolves when the model is ready, or after `timeoutMs` so the intro never stalls. */
export function whenReady(timeoutMs: number): Promise<void> {
  if (bus.ready) return Promise.resolve()
  return new Promise((resolve) => {
    const done = () => {
      window.clearTimeout(timer)
      bus.readyListeners.delete(done)
      resolve()
    }
    const timer = window.setTimeout(done, timeoutMs)
    bus.readyListeners.add(done)
  })
}
