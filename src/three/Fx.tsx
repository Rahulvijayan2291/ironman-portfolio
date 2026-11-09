import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { CORE_STOPS, FLAME_STOPS, HALO_STOPS, radialTexture } from './glow'
import { bus } from './bus'

/**
 * Glow effects. Each component is rendered inside a portal whose container is an
 * Object3D parented to a real skeleton bone (see `anchors.ts`), so the effects
 * follow the character exactly instead of floating beside it.
 * Local +Z of the portal container is the surface normal.
 */

const CYAN = new THREE.Color('#35dfff')
const WHITE = new THREE.Color('#ffffff')

interface FxProps {
  reduced: boolean
}

/**
 * Visor eye glow, parented to the head bone. The slits are already baked into the model's emissive
 * texture; this adds the light they cast. It ignites with `bus.power` and flares during actions.
 */
export function EyeGlow({ reduced, side }: FxProps & { side: 'L' | 'R' }) {
  const core = useRef<THREE.Sprite>(null)
  const halo = useRef<THREE.Sprite>(null)
  const streak = useRef<THREE.Sprite>(null)
  const light = useRef<THREE.PointLight>(null)
  const coreMap = useMemo(() => radialTexture('core', CORE_STOPS), [])
  const haloMap = useMemo(() => radialTexture('halo', HALO_STOPS), [])

  useFrame(({ clock }) => {
    const p = bus.power
    const t = clock.elapsedTime
    const flare = Math.max(bus.fx.reactor, 0) * 0.5
    const flick = reduced ? 1 : 0.94 + Math.sin(t * 3.1 + (side === 'L' ? 0 : 1.7)) * 0.04 + Math.sin(t * 11) * 0.02
    const lvl = p * flick * bus.reveal
    if (core.current) {
      const s = 0.05 + p * 0.05 + flare * 0.03
      core.current.scale.set(s * 2.4, s, 1)
      core.current.material.opacity = Math.min(1, lvl * 1.1)
    }
    if (halo.current) {
      const s = 0.14 + p * 0.22 + flare * 0.1
      halo.current.scale.set(s, s * 0.7, 1)
      halo.current.material.opacity = Math.min(1, lvl * 0.75)
    }
    if (streak.current) {
      streak.current.scale.set(0.9 * p * (1 + flare), 0.02, 1)
      streak.current.material.opacity = lvl * 0.5
    }
    if (light.current) light.current.intensity = (0.1 + p * 0.9 + flare * 0.8) * bus.reveal
  })

  return (
    <group>
      <sprite ref={halo} position={[0, 0, 0.02]}>
        <spriteMaterial map={haloMap} color="#bfefff" transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </sprite>
      <sprite ref={core} position={[0, 0, 0.01]}>
        <spriteMaterial map={coreMap} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </sprite>
      <sprite ref={streak} position={[0, 0, 0.02]}>
        <spriteMaterial map={coreMap} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </sprite>
      <pointLight ref={light} position={[0, 0, 0.12]} color="#aeeaff" intensity={0} distance={1.4} decay={2} />
    </group>
  )
}

export function ChestReactor({ reduced }: FxProps) {
  const core = useRef<THREE.Mesh>(null)
  const arcs = useRef<THREE.Group>(null)
  const halo = useRef<THREE.Sprite>(null)
  const light = useRef<THREE.PointLight>(null)

  const haloMap = useMemo(() => radialTexture('halo', HALO_STOPS), [])
  const arcGeo = useMemo(() => [0, 1, 2].map((i) => new THREE.RingGeometry(0.108, 0.118, 24, 1, (i * Math.PI * 2) / 3, 1.5)), [])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const boost = bus.fx.reactor
    const pulse = (reduced ? 0.8 : 0.78 + Math.sin(t * 2.6) * 0.14 + Math.sin(t * 6.1) * 0.03) + boost * 0.35
    const r = bus.reveal * (0.25 + 0.75 * bus.power)
    if (core.current) (core.current.material as THREE.MeshBasicMaterial).opacity = Math.min(1, 0.42 * pulse * r + boost * 0.2)
    if (arcs.current && !reduced) arcs.current.rotation.z = -t * (0.5 + boost * 3)
    if (halo.current) {
      const s = 0.62 + pulse * 0.1 + boost * 0.35
      halo.current.scale.set(s, s, 1)
      halo.current.material.opacity = Math.min(1, 0.55 * pulse * r)
    }
    if (light.current) light.current.intensity = (0.9 + pulse * 1.4 + boost * 3) * r
  })

  return (
    <group>
      {/* tint over the baked white emissive disc so it reads as cyan plasma */}
      <mesh ref={core} position={[0, 0, 0.004]}>
        <circleGeometry args={[0.095, 40]} />
        <meshBasicMaterial color={CYAN} transparent opacity={0.4} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      <group ref={arcs} position={[0, 0, 0.007]}>
        {arcGeo.map((g, i) => (
          <mesh key={i} geometry={g}>
            <meshBasicMaterial color={WHITE} transparent opacity={0.75} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
          </mesh>
        ))}
      </group>
      <sprite ref={halo} position={[0, 0, 0.06]}>
        <spriteMaterial map={haloMap} transparent opacity={0.5} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </sprite>
      <pointLight ref={light} position={[0, 0, 0.16]} color="#5fe6ff" intensity={2} distance={1.8} decay={2} />
    </group>
  )
}

/** Soft additive volume: bright toward the viewer-facing core, fading along its length (uv.y 0 -> 1). */
const BEAM_VERT = `varying vec3 vN; varying vec3 vV; varying float vU;
  void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); vU = uv.y; gl_Position = projectionMatrix * mv; }`
const BEAM_FRAG = `uniform float uO; uniform vec3 uC; varying vec3 vN; varying vec3 vV; varying float vU;
  void main(){ float f = pow(abs(dot(normalize(vN), normalize(vV))), 1.4); float a = pow(1.0 - vU, 1.15) * f * uO; gl_FragColor = vec4(uC, a); }`

const _pq = new THREE.Quaternion()
const _rootQ = new THREE.Quaternion()
const _body = new THREE.Vector3()
const _dir = new THREE.Vector3()
const _zAxis = new THREE.Vector3(0, 0, 1)
const BEAM_LEN = 6.5
const FLAME_LEN = 1.4

/** Open flared tube from the origin out along +Z (radius r0 at the source, r1 at the far end). */
function tube(r0: number, r1: number, len: number) {
  const g = new THREE.CylinderGeometry(r1, r0, len, 20, 1, true)
  g.translate(0, len / 2, 0)
  g.rotateX(Math.PI / 2) // +Y -> +Z
  return g
}

/** Open cone from the origin out along +Z: wide base at the source, tip at the far end. */
function cone(radius: number, len: number) {
  const g = new THREE.ConeGeometry(radius, len, 18, 1, true)
  g.translate(0, len / 2, 0)
  g.rotateX(Math.PI / 2)
  return g
}

function glowMaterial(color: string) {
  return new THREE.ShaderMaterial({
    uniforms: { uO: { value: 0 }, uC: { value: new THREE.Color(color) } },
    vertexShader: BEAM_VERT,
    fragmentShader: BEAM_FRAG,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  })
}

export function Repulsor({ reduced, side }: FxProps & { side: 'L' | 'R' }) {
  const core = useRef<THREE.Sprite>(null)
  const halo = useRef<THREE.Sprite>(null)
  const ring = useRef<THREE.Mesh>(null)
  const light = useRef<THREE.PointLight>(null)
  const beam = useRef<THREE.Group>(null)

  const coreMap = useMemo(() => radialTexture('core', CORE_STOPS), [])
  const haloMap = useMemo(() => radialTexture('halo', HALO_STOPS), [])
  const outerGeo = useMemo(() => tube(0.05, 0.24, BEAM_LEN), [])
  const innerGeo = useMemo(() => tube(0.02, 0.07, BEAM_LEN), [])
  const outerM = useMemo(() => glowMaterial('#4fd8ff'), [])
  const innerM = useMemo(() => glowMaterial('#e4f8ff'), [])
  const charge = useRef(0)
  const fire = useRef(0)

  useFrame(({ clock }, delta) => {
    charge.current = THREE.MathUtils.damp(charge.current, bus.charge, 4, delta)
    fire.current = THREE.MathUtils.damp(fire.current, side === 'L' ? bus.fx.beamL : bus.fx.beamR, 22, delta)
    const f = fire.current
    const c = Math.max(charge.current, Math.min(1, f * 1.4))
    const t = clock.elapsedTime
    const pulse = reduced ? 1 : 0.85 + Math.sin(t * 5 + 1) * 0.15
    const r = bus.reveal
    const level = (0.3 + c * 0.7) * pulse * r * (0.4 + 0.6 * bus.power)
    if (core.current) {
      const s = 0.1 + c * 0.1 + f * 0.3
      core.current.scale.set(s, s, 1)
      core.current.material.opacity = Math.min(1, level * 1.15)
    }
    if (halo.current) {
      const s = 0.26 + c * 0.34 + f * 0.9
      halo.current.scale.set(s, s, 1)
      halo.current.material.opacity = Math.min(1, level * 0.7)
    }
    if (ring.current) {
      ring.current.scale.setScalar(1 + c * 0.35 + f * 0.8)
      ;(ring.current.material as THREE.MeshBasicMaterial).opacity = level * 0.8
    }
    if (light.current) light.current.intensity = (0.25 + c * 2.2 + f * 7) * pulse * r
    if (beam.current) {
      beam.current.visible = f > 0.01
      const w = 0.75 + Math.sin(t * 60) * 0.06 * f
      beam.current.scale.set(w, w, 0.25 + f * 0.75)
      outerM.uniforms.uO.value = 0.55 * f * r
      innerM.uniforms.uO.value = 1.0 * f * r
    }
  })

  return (
    <group>
      <mesh ref={ring} position={[0, 0, 0.004]}>
        <ringGeometry args={[0.052, 0.058, 32]} />
        <meshBasicMaterial color={WHITE} transparent opacity={0.6} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      <sprite ref={core} position={[0, 0, 0.03]}>
        <spriteMaterial map={coreMap} transparent opacity={0.8} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </sprite>
      <sprite ref={halo} position={[0, 0, 0.08]}>
        <spriteMaterial map={haloMap} transparent opacity={0.5} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </sprite>
      <pointLight ref={light} position={[0, 0, 0.12]} color="#6fe9ff" intensity={0.4} distance={1.6} decay={2} />
      <group ref={beam} visible={false}>
        <mesh geometry={outerGeo} material={outerM} renderOrder={5} />
        <mesh geometry={innerGeo} material={innerM} renderOrder={6} />
      </group>
    </group>
  )
}

/** Boot thruster: flame cones + glow, parented to the foot bone via a sole anchor (+Z = down). */
export function Thruster({ reduced, seed }: FxProps & { seed: number }) {
  const root = useRef<THREE.Group>(null)
  const outer = useRef<THREE.Mesh>(null)
  const inner = useRef<THREE.Mesh>(null)
  const glow = useRef<THREE.Sprite>(null)
  const light = useRef<THREE.PointLight>(null)

  const haloMap = useMemo(() => radialTexture('flame', FLAME_STOPS), [])
  const outerGeo = useMemo(() => cone(0.2, FLAME_LEN), [])
  const innerGeo = useMemo(() => cone(0.09, FLAME_LEN * 0.7), [])
  const outerM = useMemo(() => glowMaterial('#ff9a3d'), [])
  const innerM = useMemo(() => glowMaterial('#cfefff'), [])

  useFrame(({ clock }) => {
    const th = bus.fx.thrust
    if (root.current) root.current.visible = th > 0.01
    if (th <= 0.01) return
    // Exhaust always points at the floor (slightly trailing), whatever the leg/lean pose is.
    const parent = root.current?.parent
    if (root.current && parent) {
      // upright flight: straight down; cruising (body pitched): along the body, away from travel
      const cruise = Math.min(1, Math.abs(bus.view.pitch + bus.fx.pitch) / 0.5)
      _body.set(0, -1, -0.18).applyQuaternion(_rootQ.set(bus.rootQ[0], bus.rootQ[1], bus.rootQ[2], bus.rootQ[3]))
      _dir.set(0, -1, -0.18).lerp(_body, cruise).normalize()
      parent.getWorldQuaternion(_pq).invert()
      _dir.applyQuaternion(_pq)
      root.current.quaternion.setFromUnitVectors(_zAxis, _dir)
    }
    const t = clock.elapsedTime
    const flick = reduced ? 1 : 0.88 + Math.sin(t * 38 + seed) * 0.07 + Math.sin(t * 17 + seed * 2) * 0.05
    const len = th * flick
    outer.current?.scale.set(1, 1, len)
    inner.current?.scale.set(1, 1, len * 0.95)
    outerM.uniforms.uO.value = 0.75 * th * bus.reveal
    innerM.uniforms.uO.value = 1.1 * th * bus.reveal
    if (glow.current) {
      const s = (0.7 + th * 0.7) * flick
      glow.current.scale.set(s, s, 1)
      glow.current.material.opacity = 0.75 * th
    }
    if (light.current) light.current.intensity = 5 * th * flick
  })

  return (
    <group ref={root} visible={false}>
      <mesh ref={outer} geometry={outerGeo} material={outerM} renderOrder={5} />
      <mesh ref={inner} geometry={innerGeo} material={innerM} renderOrder={6} />
      <sprite ref={glow} position={[0, 0, 0.1]}>
        <spriteMaterial map={haloMap} transparent opacity={0.6} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </sprite>
      <pointLight ref={light} position={[0, 0, 0.4]} color="#ffa24a" intensity={0} distance={3.2} decay={2} />
    </group>
  )
}

/**
 * Chest unibeam, parented to the reactor anchor (+Z = out of the chest). Driven by `bus.fx.uni`
 * (cinematic `unibeam` move); a flare sprite at the reactor sells the discharge.
 */
export function Unibeam({ reduced }: FxProps) {
  const beam = useRef<THREE.Group>(null)
  const flare = useRef<THREE.Sprite>(null)
  const light = useRef<THREE.PointLight>(null)
  const coreMap = useMemo(() => radialTexture('core', CORE_STOPS), [])
  const outerGeo = useMemo(() => tube(0.08, 0.5, BEAM_LEN), [])
  const innerGeo = useMemo(() => tube(0.03, 0.14, BEAM_LEN), [])
  const outerM = useMemo(() => glowMaterial('#4fd8ff'), [])
  const innerM = useMemo(() => glowMaterial('#f2fcff'), [])
  const lvl = useRef(0)

  useFrame(({ clock }, delta) => {
    lvl.current = THREE.MathUtils.damp(lvl.current, bus.fx.uni, 18, delta)
    const u = lvl.current
    const t = clock.elapsedTime
    if (beam.current) {
      beam.current.visible = u > 0.01
      const w = 0.8 + (reduced ? 0 : Math.sin(t * 55) * 0.07 * u)
      beam.current.scale.set(w, w, 0.2 + u * 0.8)
      outerM.uniforms.uO.value = 0.7 * u * bus.reveal
      innerM.uniforms.uO.value = 1.1 * u * bus.reveal
    }
    if (flare.current) {
      flare.current.visible = u > 0.01
      const s = 0.5 + u * 1.3
      flare.current.scale.set(s, s, 1)
      flare.current.material.opacity = Math.min(1, u)
    }
    if (light.current) light.current.intensity = 10 * u * bus.reveal
  })

  return (
    <group>
      <group ref={beam} visible={false}>
        <mesh geometry={outerGeo} material={outerM} renderOrder={5} />
        <mesh geometry={innerGeo} material={innerM} renderOrder={6} />
      </group>
      <sprite ref={flare} position={[0, 0, 0.12]} visible={false}>
        <spriteMaterial map={coreMap} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </sprite>
      <pointLight ref={light} position={[0, 0, 0.3]} color="#8fefff" intensity={0} distance={3} decay={2} />
    </group>
  )
}

const STREAKS = 70

/**
 * Speed streaks for take-off / dive: thin additive lines that rush vertically past the camera.
 * `bus.fx.speed` > 0 streams them upward (the suit is falling), < 0 downward (the suit is climbing).
 */
export function SpeedStreaks() {
  const lines = useRef<THREE.LineSegments>(null)
  const data = useMemo(() => {
    const seed = (i: number, k: number) => {
      const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453
      return x - Math.floor(x)
    }
    const arr = Array.from({ length: STREAKS }, (_, i) => ({
      x: (seed(i, 1) - 0.5) * 7,
      z: (seed(i, 2) - 0.5) * 4 - 0.5,
      y: seed(i, 3) * 10 - 1,
      len: 0.8 + seed(i, 4) * 1.8,
      v: 0.6 + seed(i, 5) * 0.8,
    }))
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(STREAKS * 6), 3))
    const col = new Float32Array(STREAKS * 6)
    for (let i = 0; i < STREAKS; i++) col.set([0, 0, 0, 0.55, 0.85, 1], i * 6)
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3))
    return { arr, geo }
  }, [])

  useFrame((_, rawDelta) => {
    const l = lines.current
    if (!l) return
    const delta = Math.min(rawDelta, 0.05)
    const sp = bus.fx.speed
    const on = Math.abs(sp) > 0.02
    l.visible = on
    if (!on) return
    const dir = Math.sign(sp)
    const pos = data.geo.getAttribute('position') as THREE.BufferAttribute
    data.arr.forEach((s, i) => {
      // sp > 0: suit falling, streaks stream up; sp < 0: suit climbing, streaks stream down
      s.y += dir * Math.abs(sp) * s.v * 30 * delta
      if (s.y > 9) s.y -= 10
      if (s.y < -1) s.y += 10
      const tail = s.y - dir * s.len * Math.abs(sp)
      pos.setXYZ(i * 2, s.x, tail, s.z)
      pos.setXYZ(i * 2 + 1, s.x, s.y, s.z)
    })
    pos.needsUpdate = true
    ;(l.material as THREE.LineBasicMaterial).opacity = Math.min(0.7, Math.abs(sp) * 0.7)
  })

  return (
    <lineSegments ref={lines} geometry={data.geo} visible={false} frustumCulled={false} renderOrder={4}>
      <lineBasicMaterial vertexColors transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </lineSegments>
  )
}

/**
 * Stage-level effects (not bone-attached): the thrust ring on the floor, the scan ring that
 * sweeps up the body and the landing shockwave. They follow `bus.fx` so they stay in sync with the armour's motion.
 */
export function StageFx({ height }: { height: number }) {
  const thrust = useRef<THREE.Mesh>(null)
  const thrust2 = useRef<THREE.Mesh>(null)
  const scan = useRef<THREE.Group>(null)
  const haloMap = useMemo(() => radialTexture('halo', HALO_STOPS), [])
  const floorGlow = useRef<THREE.Mesh>(null)
  const shock = useRef<THREE.Mesh>(null)
  const shock2 = useRef<THREE.Mesh>(null)
  const flash = useRef<THREE.Mesh>(null)
  const impactT = useRef(-1)
  const lastImpact = useRef(0)

  useFrame(({ clock }, rawDelta) => {
    const { thrust: th, lift: liftY, scanP, scanA, impact } = bus.fx
    const t = clock.elapsedTime

    // landing shockwave: starts on the rising edge of the cinematic impact pulse
    if (impact > 0.6 && lastImpact.current <= 0.6) impactT.current = 0
    lastImpact.current = impact
    if (impactT.current >= 0) impactT.current += Math.min(rawDelta, 0.05)
    const it = impactT.current
    const live = it >= 0 && it < 1.2
    if (shock.current && shock2.current && flash.current) {
      shock.current.visible = shock2.current.visible = flash.current.visible = live
      if (live) {
        const a = it / 1.2
        const ease = 1 - Math.pow(1 - a, 3)
        shock.current.scale.setScalar(0.4 + ease * 4.2)
        ;(shock.current.material as THREE.MeshBasicMaterial).opacity = (1 - a) * 0.9
        const b = Math.max(0, (it - 0.12) / 1.2)
        shock2.current.scale.setScalar(0.3 + (1 - Math.pow(1 - b, 3)) * 3)
        ;(shock2.current.material as THREE.MeshBasicMaterial).opacity = (1 - b) * 0.55
        flash.current.scale.setScalar(1 + a * 1.2)
        ;(flash.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - a * 3) * 0.9
      }
    }
    const grounded = bus.view.floor
    if (thrust.current && thrust2.current && floorGlow.current) {
      const on = th > 0.01 && grounded > 0.02
      thrust.current.visible = thrust2.current.visible = floorGlow.current.visible = on
      if (on) {
        // shockwave rings radiate from beneath the boots and fade as the suit climbs
        const a = (t * 0.9) % 1
        const b = (t * 0.9 + 0.5) % 1
        const fade = th * Math.min(1, Math.max(0, 1 - liftY / 0.3)) * grounded
        thrust.current.scale.setScalar(0.5 + a * 2.3)
        ;(thrust.current.material as THREE.MeshBasicMaterial).opacity = (1 - a) * 0.7 * fade
        thrust2.current.scale.setScalar(0.5 + b * 2.3)
        ;(thrust2.current.material as THREE.MeshBasicMaterial).opacity = (1 - b) * 0.7 * fade
        ;(floorGlow.current.material as THREE.MeshBasicMaterial).opacity = 0.55 * th * grounded * (0.75 + Math.sin(t * 30) * 0.08)
      }
    }
    if (scan.current) {
      scan.current.visible = scanA > 0.01
      scan.current.position.y = 0.05 + scanP * (height + 0.1)
      const mats = scan.current.userData.mats as THREE.MeshBasicMaterial[] | undefined
      mats?.forEach((m, i) => (m.opacity = scanA * (i === 0 ? 0.9 : 0.35)))
    }
  })

  return (
    <group>
      <mesh ref={flash} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.014, 0]} visible={false}>
        <circleGeometry args={[1.6, 40]} />
        <meshBasicMaterial map={haloMap} color="#bff4ff" transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh ref={shock} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.016, 0]} visible={false}>
        <ringGeometry args={[0.92, 1, 96]} />
        <meshBasicMaterial color="#8ff0ff" transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh ref={shock2} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]} visible={false}>
        <ringGeometry args={[0.8, 1, 96]} />
        <meshBasicMaterial color="#ffb070" transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh ref={floorGlow} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} visible={false}>
        <circleGeometry args={[1.4, 40]} />
        <meshBasicMaterial map={haloMap} color="#ffa04a" transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh ref={thrust} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} visible={false}>
        <ringGeometry args={[0.95, 1, 72]} />
        <meshBasicMaterial color="#ffc27a" transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh ref={thrust2} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} visible={false}>
        <ringGeometry args={[0.95, 1, 72]} />
        <meshBasicMaterial color="#ff7a45" transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      <ScanRing refGroup={scan} />
    </group>
  )
}

function ScanRing({ refGroup }: { refGroup: React.RefObject<THREE.Group | null> }) {
  return (
    <group
      ref={(g) => {
        ;(refGroup as React.MutableRefObject<THREE.Group | null>).current = g
        if (g && !g.userData.mats) g.userData.mats = g.children.map((c) => (c as THREE.Mesh).material as THREE.MeshBasicMaterial)
      }}
      visible={false}
    >
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.98, 1.02, 96]} />
        <meshBasicMaterial color="#8ff0ff" transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.55, 1.02, 96]} />
        <meshBasicMaterial color="#35dfff" transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}
