import { useEffect, useMemo, useRef } from 'react'
import { createPortal, useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js'
import * as THREE from 'three'
import { ANCHOR_SPECS, createAnchor, type AnchorKey } from './anchors'
import { ChestReactor, Repulsor, SpeedStreaks, StageFx, Thruster, Unibeam } from './Fx'
import { BONE_KEYS, ignite, BONE_NODES, DURATION, POSES, emptyFrame, sampleAction, type ActionName, type BoneKey, type Euler3 } from './actions'
import { copySample, emptySample, mixSample, sampleCinematic, smoothstep, type CinematicMove } from './cinematic'
import { bus, setActionState, setCinematicState } from './bus'

/** Displayed height of the full suit in scene units (feet at y = 0). */
export const SUIT_HEIGHT = 3.4
/** Hip pivot used for whole-body lean (scene units). */
const HIP_Y = 1.75

interface PoseBone {
  bone: THREE.Object3D
  rest: THREE.Quaternion
  parent: THREE.Quaternion
  parentInv: THREE.Quaternion
}

function poseBone(model: THREE.Object3D, name: string): PoseBone | null {
  const bone = model.getObjectByName(name)
  if (!bone || !bone.parent) return null
  const parent = bone.parent.getWorldQuaternion(new THREE.Quaternion())
  return { bone, rest: bone.quaternion.clone(), parent, parentInv: parent.clone().invert() }
}

const _rq = new THREE.Quaternion()
const _dq = new THREE.Quaternion()
const _e = new THREE.Euler()

/** Applies a rotation expressed in model-space axes on top of the bone's bind rotation. */
function drive(p: PoseBone | null | undefined, pitch: number, yaw: number, roll = 0) {
  if (!p) return
  _e.set(pitch, yaw, roll, 'YXZ')
  _dq.setFromEuler(_e)
  p.bone.quaternion.copy(p.parentInv).multiply(_dq).multiply(p.parent).multiply(p.rest)
}

interface ArmorProps {
  url: string
  reduced: boolean
  onReady: () => void
}

interface Built {
  model: THREE.Object3D
  anchors: Record<AnchorKey, THREE.Object3D>
  rig: Partial<Record<BoneKey, PoseBone>>
  mats: THREE.MeshStandardMaterial[]
  offset: THREE.Vector3
  scale: number
}

export default function Armor({ url, reduced, onReady }: ArmorProps) {
  const { scene } = useGLTF(url, false, true)

  const built = useMemo<Built>(() => {
    const model = clone(scene)
    model.updateMatrixWorld(true)

    // Effects are parented to the actual skeleton bones, measured in the model's bind pose.
    const anchors = {} as Record<AnchorKey, THREE.Object3D>
    ;(Object.keys(ANCHOR_SPECS) as AnchorKey[]).forEach((key) => {
      const spec = ANCHOR_SPECS[key]
      const bone = model.getObjectByName(spec.bone)
      if (!bone) throw new Error(`Bone not found: ${spec.bone}`)
      anchors[key] = createAnchor(model, bone, spec.point, spec.normal, spec.lift)
    })

    const rig: Partial<Record<BoneKey, PoseBone>> = {}
    BONE_KEYS.forEach((k) => {
      const pb = poseBone(model, BONE_NODES[k])
      if (pb) rig[k] = pb
    })

    const mats: THREE.MeshStandardMaterial[] = []
    model.traverse((o) => {
      const mesh = o as THREE.SkinnedMesh
      if (!mesh.isMesh) return
      mesh.frustumCulled = false // skinned bounds can lag behind the pose
      const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      list.forEach((m) => {
        const std = m as THREE.MeshStandardMaterial
        if (!mats.includes(std)) {
          std.userData.baseEI = std.emissiveIntensity
          mats.push(std)
        }
        // keep the original textures/materials; only raise filtering quality
        ;[std.map, std.normalMap, std.roughnessMap, std.emissiveMap].forEach((t) => t && (t.anisotropy = 8))
        std.needsUpdate = true
      })
    })

    // Fit by bounding box: feet on y=0, centred on x/z, scaled to SUIT_HEIGHT.
    const box = new THREE.Box3().setFromObject(model)
    const size = box.getSize(new THREE.Vector3())
    const centre = box.getCenter(new THREE.Vector3())
    const scale = SUIT_HEIGHT / size.y
    const offset = new THREE.Vector3(-centre.x * scale, -box.min.y * scale, -centre.z * scale)
    return { model, anchors, rig, mats, offset, scale }
  }, [scene])

  useEffect(() => {
    onReady()
  }, [onReady])

  const lift = useRef<THREE.Group>(null)
  const lean = useRef<THREE.Group>(null)

  // Everything the per-frame loop mutates lives here (no React state, no allocations per frame).
  const sim = useMemo(
    () => ({
      yaw: 0,
      pitch: 0,
      name: null as ActionName | null,
      /** True when the running action is held by the scroll director (loops until the section ends). */
      hold: false,
      powerT: 0,
      t: 0,
      frame: emptyFrame(),
      /** Cinematic sequencer: plays `moves` in order, cross-fading from the previous output into each move. */
      cine: {
        token: 0,
        moves: [] as CinematicMove[],
        idx: 0,
        time: 0,
        blend: 1,
        /** Seconds the current cross-fade takes. */
        dur: 0.4,
        running: false,
        /** True while easing back to rest after the last move. */
        releasing: false,
        /** 0..1 weight used to quieten idle life / head tracking while a cinematic plays. */
        weight: 0,
        from: emptySample(),
        tmp: emptySample(),
        out: emptySample(),
        rest: emptySample(),
      },
      w: { armL: 0, armR: 0, flight: 0, scan: 0, recoil: 0 },
      sum: Object.fromEntries(BONE_KEYS.map((k) => [k, [0, 0, 0] as Euler3])) as Record<BoneKey, Euler3>,
    }),
    [],
  )

  useEffect(() => {
    const fx = bus.fx
    return () => {
      // leaving the scene: make sure no effect stays lit
      Object.keys(fx).forEach((k) => ((fx as Record<string, number>)[k] = 0))
      bus.pending = null
      setActionState('idle')
      setCinematicState(null)
    }
  }, [])

  const start = (name: ActionName, hold: boolean) => {
    sim.name = name
    sim.hold = hold
    sim.t = 0
    setActionState(name)
  }
  const stop = () => {
    sim.name = null
    sim.hold = false
    setActionState('idle')
  }

  useFrame((state, rawDelta) => {
    ;(window as unknown as { __r3f: unknown }).__r3f = state // TEMP-DEBUG
    const { clock } = state
    const delta = Math.min(rawDelta, 0.05)
    const t = clock.elapsedTime
    const { rig } = built
    const idle = reduced ? 0 : 1

    // ---- cinematic sequencer: a request replaces whatever is playing ---------------------
    const cn = sim.cine
    const co = cn.out
    const req = bus.cinematicRequest
    if (req && req.token !== cn.token) {
      cn.token = req.token
      if (!reduced && (req.moves.length > 0 || cn.running)) {
        copySample(co, cn.from)
        // a power-up starts from the suit's current glow so it visibly cuts to dark and re-ignites
        if (req.moves[0] === 'power-up') cn.from.reactor = Math.max(cn.from.reactor, bus.power)
        cn.moves = req.moves
        cn.idx = 0
        cn.time = 0
        cn.blend = 0
        cn.releasing = req.moves.length === 0
        cn.dur = cn.releasing ? 0.9 : 0.4
        cn.running = true
        bus.pending = null
        if (sim.name) stop()
      }
    }
    let move: CinematicMove | null = null
    if (cn.running) {
      if (cn.idx < cn.moves.length) {
        move = cn.moves[cn.idx]
        cn.time += delta
        sampleCinematic(move, cn.time, cn.tmp)
      } else {
        if (!cn.releasing) {
          cn.releasing = true
          copySample(co, cn.from)
          cn.blend = 0
          cn.dur = 0.9
        }
        copySample(cn.rest, cn.tmp)
      }
      cn.blend = Math.min(1, cn.blend + delta / cn.dur)
      mixSample(cn.from, cn.tmp, smoothstep(0, 1, cn.blend), co)
      if (move) {
        if (cn.tmp.done) {
          cn.idx++
          cn.time = 0
          copySample(co, cn.from)
          cn.blend = 0
          cn.dur = 0.3
        }
      } else if (cn.blend >= 1) {
        cn.running = false
        copySample(cn.rest, co)
      }
    }
    setCinematicState(cn.running && !cn.releasing ? (move ?? cn.moves[cn.moves.length - 1] ?? null) : null)
    cn.weight = THREE.MathUtils.damp(cn.weight, cn.running && !cn.releasing ? 1 : 0, 6, delta)

    // ---- power-up: visor + reactor ignite once the intro has revealed the suit ----------
    sim.powerT = bus.reveal > 0.55 ? sim.powerT + delta : 0
    bus.power = reduced ? (sim.powerT > 0 ? 1 : 0) : ignite(sim.powerT)
    // cinematic reactor: the power-up move owns the glow (it can go dark), other moves only add to it
    if (cn.running) bus.power = move === 'power-up' ? co.reactor : Math.max(bus.power, co.reactor)
    built.mats.forEach((m) => (m.emissiveIntensity = (m.userData.baseEI as number) * (0.04 + 0.96 * bus.power)))

    // ---- action state machine: visitor actions win, otherwise the scroll director's mode --
    if (bus.pending) {
      const p = bus.pending
      bus.pending = null
      if (cn.running) {
        /* a cinematic owns the suit */
      } else if (p === 'stop') stop()
      else start(p, false)
    }
    if (cn.running) {
      if (sim.name) stop()
    } else if (!sim.name || sim.hold) {
      const want = reduced ? 'none' : bus.mode
      if (want === 'none') {
        if (sim.name) stop()
      } else if (sim.name !== want) {
        start(want, true)
      }
    }
    const f = sim.frame
    Object.assign(f, emptyFrame())
    if (sim.name) {
      sim.t += delta
      if (!sim.hold && sim.t >= DURATION[sim.name]) stop()
      else sampleAction(sim.name, sim.t, f, sim.hold)
    }

    // ---- smooth the weights (instant under reduced motion) --------------------------
    const k = reduced ? 1000 : 1
    const w = sim.w
    w.armL = THREE.MathUtils.damp(w.armL, f.armL, 9 * k, delta)
    w.armR = THREE.MathUtils.damp(w.armR, f.armR, 9 * k, delta)
    w.flight = THREE.MathUtils.damp(w.flight, f.flight, 4 * k, delta)
    w.scan = THREE.MathUtils.damp(w.scan, f.scan, 5 * k, delta)
    w.recoil = THREE.MathUtils.damp(w.recoil, f.recoil, 30 * k, delta)

    // ---- idle life: weight shift, breathing, arm sway, glances ----------------------
    const breath = Math.sin(t * 1.5) * idle
    const shift = Math.sin(t * 0.55) * idle
    const glance = Math.sin(t * 0.23) * Math.sin(t * 0.61 + 1) * idle
    const calm = (1 - Math.max(w.armL, w.armR, w.flight, w.scan) * 0.7) * (1 - cn.weight * 0.85)

    const s = sim.sum
    BONE_KEYS.forEach((key) => {
      const e = s[key]
      e[0] = e[1] = e[2] = 0
    })
    const add = (key: BoneKey, pitch: number, yaw = 0, roll = 0) => {
      const e = s[key]
      e[0] += pitch
      e[1] += yaw
      e[2] += roll
    }
    const addPose = (pose: Partial<Record<BoneKey, Euler3>>, weight: number) => {
      if (weight < 0.0005) return
      ;(Object.keys(pose) as BoneKey[]).forEach((key) => {
        const v = pose[key]!
        add(key, v[0] * weight, v[1] * weight, v[2] * weight)
      })
    }

    add('chest', breath * 0.026 - 0.004, shift * 0.05 * calm)
    add('spine2', breath * 0.012, shift * 0.04 * calm)
    add('shoulderL', 0, 0, breath * 0.03)
    add('shoulderR', 0, 0, -breath * 0.03)
    add('armL', Math.sin(t * 0.9) * 0.05 * calm, 0, 0.03 + shift * 0.035 * calm)
    add('armR', Math.sin(t * 0.9 + 2) * 0.05 * calm, 0, -0.03 + shift * 0.035 * calm)
    add('foreL', -0.05 - breath * 0.03 * calm)
    add('foreR', -0.05 - breath * 0.03 * calm)
    add('thighL', 0, 0, shift * 0.025 * calm)
    add('thighR', 0, 0, shift * 0.025 * calm)

    addPose(POSES.fireL, w.armL)
    addPose(POSES.fireR, w.armR)
    addPose(POSES.flight, w.flight)
    addPose(POSES.scan, w.scan)
    // cinematic pose is blended straight into the DEF-* skeleton
    if (cn.running) {
      ;(Object.keys(co.pose) as BoneKey[]).forEach((key) => {
        const v = co.pose[key]
        add(key, v[0], v[1], v[2])
      })
    }
    // recoil: torso snaps back, both shoulders drop
    add('chest', -w.recoil * 0.1)
    add('spine1', -w.recoil * 0.06)
    add('head', w.recoil * 0.05)

    // ---- head: pointer tracking + glances + scan sweep ------------------------------
    const px = reduced ? 0 : bus.pointer.x
    const py = reduced ? 0 : bus.pointer.y
    const track = (1 - Math.max(w.armL, w.armR, w.scan) * 0.6) * (1 - Math.min(1, Math.abs(bus.view.yaw) / 0.6)) * (1 - cn.weight * 0.9)
    sim.yaw = THREE.MathUtils.damp(sim.yaw, px * 0.55 * track + glance * 0.45 + Math.sin(t * 0.45) * 0.05 * idle, 3, delta)
    sim.pitch = THREE.MathUtils.damp(sim.pitch, -py * 0.22 * track + Math.sin(t * 0.37) * 0.015 * idle, 3, delta)
    const scanLook = Math.sin(f.scanP * Math.PI * 2.0 + 0.4) * 0.65 * w.scan * idle
    add('neck', sim.pitch * 0.35, sim.yaw * 0.4 + scanLook * 0.4)
    add('head', sim.pitch * 0.65, sim.yaw * 0.6 + scanLook * 0.6)

    BONE_KEYS.forEach((key) => {
      const e = s[key]
      drive(rig[key], e[0], e[1], e[2])
    })

    // ---- whole-body motion: shot orientation, drag, lean, lift, hover, recoil ---------------
    if (!bus.dragging) bus.dragYaw = THREE.MathUtils.damp(bus.dragYaw, 0, 2.2, delta)
    const v = bus.view
    const fl = w.flight
    const air = Math.min(1, Math.max(0, co.lift))
    const hover = reduced ? 0 : Math.sin(t * 2.1) * 0.05 * Math.min(1, fl + air)
    const liftY = fl * 0.3 * (reduced ? 0 : 1) + hover + co.lift
    if (lift.current) {
      lift.current.position.y = liftY
      lift.current.position.z = -w.recoil * 0.07 * idle
    }
    if (lean.current) {
      const r = lean.current.rotation
      r.order = 'YXZ'
      r.x = v.pitch + fl * 0.28 * (reduced ? 0 : 1) + w.recoil * -0.03 * idle + breath * 0.004 + co.pitch
      r.y = v.yaw + bus.dragYaw + (w.armR - w.armL) * 0.18 * idle
      r.z = v.bank + (shift * 0.012 * calm + Math.sin(t * 1.3) * 0.035 * fl) * idle + co.bank
      lean.current.getWorldQuaternion(_rq)
      bus.rootQ[0] = _rq.x
      bus.rootQ[1] = _rq.y
      bus.rootQ[2] = _rq.z
      bus.rootQ[3] = _rq.w
    }

    // ---- publish FX intensities -----------------------------------------------------
    const fx = bus.fx
    fx.beamL = Math.max(f.beamL, co.beamL)
    fx.beamR = Math.max(f.beamR, co.beamR)
    fx.thrust = Math.max(fl, co.thrust)
    fx.lift = liftY
    fx.scanP = f.scanP
    fx.scanA = f.scanA
    fx.impact = co.impact
    fx.uni = co.uni
    fx.speed = co.speed
    fx.pitch = co.pitch

    fx.reactor = Math.max(w.armL, w.armR, fl * 0.7, w.scan * (0.55 + 0.45 * Math.sin(t * 7)), co.reactor, co.uni, 0)

    // camera choreography targets, consumed by the camera rig in Stage.tsx
    const cam = bus.cam
    cam.cd = co.cd
    cam.cl = co.cl
    cam.co = co.co
    cam.shake = co.shake
  })

  const { model, anchors, offset, scale } = built
  return (
    <>
      <group ref={lift}>
        <group ref={lean} position={[0, HIP_Y, 0]}>
          <group position={[0, -HIP_Y, 0]}>
            <group position={offset} scale={scale}>
              <primitive object={model} />
              {createPortal(<ChestReactor reduced={reduced} />, anchors.chest)}
              {createPortal(<Unibeam reduced={reduced} />, anchors.chest)}
              {createPortal(<Repulsor reduced={reduced} side="L" />, anchors.palmL)}
              {createPortal(<Repulsor reduced={reduced} side="R" />, anchors.palmR)}
              {createPortal(<Thruster reduced={reduced} seed={0} />, anchors.soleL)}
              {createPortal(<Thruster reduced={reduced} seed={3} />, anchors.soleR)}
            </group>
          </group>
        </group>
      </group>
      <StageFx height={SUIT_HEIGHT} />
      {!reduced && <SpeedStreaks />}
    </>
  )
}

