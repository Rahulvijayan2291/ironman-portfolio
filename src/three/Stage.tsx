import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { AdaptiveDpr, ContactShadows, Environment, Lightformer, PerformanceMonitor, Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import Armor from './Armor'
import type { Quality } from './quality'
import { bus, setVisible } from './bus'

const SHOT_KEYS = ['look', 'fx', 'fy', 'yaw', 'pitch', 'bank', 'alpha', 'floor'] as const

/**
 * Camera rig driven by the scroll director: eases `bus.view` toward `bus.shot` and turns it into a
 * camera position, a screen-space shift (so the suit can sit right of the copy without moving the
 * camera off-axis), and the opacity of the fixed canvas layer.
 */
function Rig({ reduced }: { reduced: boolean }) {
  const { camera, size } = useThree()
  const hidden = useRef(0)
  /** 0..1: how much the suit is pulled to screen centre while a cinematic plays. */
  const centre = useRef(0)

  useFrame(({ clock }, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05)
    const s = bus.shot
    const v = bus.view
    const lam = reduced ? 1000 : 4.2
    // The flight leaves the screen on one side and re-enters on the other: snap, don't slide across.
    if (Math.abs(s.fx - v.fx) > 1.0) v.fx = s.fx
    v.dist = Math.exp(THREE.MathUtils.damp(Math.log(v.dist), Math.log(s.dist), lam, delta))
    for (const k of SHOT_KEYS) v[k] = THREE.MathUtils.damp(v[k], s[k], k === 'alpha' || k === 'floor' ? lam * 1.4 : lam, delta)

    // ---- cinematic camera: distance multiplier, look offset, orbit and shake on top of the scroll shot ----
    const c = bus.cam
    const cv = bus.camView
    cv.cd = Math.exp(THREE.MathUtils.damp(Math.log(cv.cd), Math.log(c.cd), 5, delta))
    cv.cl = THREE.MathUtils.damp(cv.cl, c.cl, 5, delta)
    cv.co = THREE.MathUtils.damp(cv.co, c.co, 5, delta)
    cv.shake = THREE.MathUtils.damp(cv.shake, c.shake, 30, delta)
    centre.current = THREE.MathUtils.damp(centre.current, bus.cinematic !== null ? 1 : 0, 3, delta)

    const cam = camera as THREE.PerspectiveCamera
    const dist = v.dist * cv.cd
    const look = v.look + cv.cl
    cam.position.set(Math.sin(cv.co) * dist, look, Math.cos(cv.co) * dist)
    cam.lookAt(0, look, 0)
    if (cv.shake > 0.005) {
      const t = clock.elapsedTime
      const a = cv.shake * 0.06
      cam.position.x += (Math.sin(t * 61) + Math.sin(t * 97)) * 0.5 * a
      cam.position.y += (Math.sin(t * 73 + 1) + Math.sin(t * 113)) * 0.5 * a
      cam.lookAt(0, look, 0)
    }
    const ox = -v.fx * (1 - centre.current) * size.width
    const oy = v.fy * (1 - centre.current * 0.5) * size.height
    if (Math.abs(ox) + Math.abs(oy) < 0.5) cam.clearViewOffset()
    else cam.setViewOffset(size.width, size.height, ox, oy, size.width, size.height)

    if (bus.layer) bus.layer.style.opacity = v.alpha.toFixed(3)

    // fully faded out and not coming back: stop rendering until the director wakes us
    if (v.alpha < 0.01 && s.alpha < 0.01) {
      hidden.current += delta
      if (hidden.current > 0.35) setVisible(false)
    } else hidden.current = 0
  })
  return null
}

/** Faux volumetric spotlight cone (edges fade by view angle) + floor rings. */
function Atmosphere() {
  const group = useRef<THREE.Group>(null)
  const disc = useRef<THREE.MeshBasicMaterial>(null)
  const ring = useRef<THREE.MeshBasicMaterial>(null)
  const uniforms = useMemo(() => ({ uOpacity: { value: 0.1 }, uColor: { value: new THREE.Color('#a9d4ff') } }), [])
  useFrame(({ clock }) => {
    const r = bus.reveal
    const fl = bus.view.floor
    uniforms.uOpacity.value = 0.12 * r * (0.35 + 0.65 * fl) * (0.92 + Math.sin(clock.elapsedTime * 0.8) * 0.06)
    if (disc.current) disc.current.opacity = 0.5 * r * fl
    if (ring.current) ring.current.opacity = 0.35 * r * fl
    if (group.current) group.current.visible = r > 0.001
  })
  return (
    <group ref={group}>
      <mesh position={[0, 4.3, -0.4]} renderOrder={-1}>
        <coneGeometry args={[2.3, 8.6, 48, 1, true]} />
        <shaderMaterial
          uniforms={uniforms}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          vertexShader={`varying vec3 vN; varying vec3 vV; varying float vY;
            void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); vY = uv.y; gl_Position = projectionMatrix * mv; }`}
          fragmentShader={`uniform float uOpacity; uniform vec3 uColor; varying vec3 vN; varying vec3 vV; varying float vY;
            void main(){ float f = pow(abs(dot(normalize(vN), normalize(vV))), 2.2); float h = smoothstep(0.0, 0.25, vY); gl_FragColor = vec4(uColor, f * h * uOpacity); }`}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]}>
        <ringGeometry args={[1.35, 1.4, 96]} />
        <meshBasicMaterial ref={disc} color="#ff4b3a" transparent opacity={0.5} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
        <ringGeometry args={[0.9, 0.915, 96]} />
        <meshBasicMaterial ref={ring} color="#35dfff" transparent opacity={0.35} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  )
}

function Lights() {
  const key = useRef<THREE.SpotLight>(null)
  const rimR = useRef<THREE.DirectionalLight>(null)
  const rimB = useRef<THREE.DirectionalLight>(null)
  const fill = useRef<THREE.HemisphereLight>(null)
  useFrame(() => {
    const r = bus.reveal
    if (key.current) key.current.intensity = 260 * r
    if (rimR.current) rimR.current.intensity = 3.2 * r
    if (rimB.current) rimB.current.intensity = 3.6 * r
    if (fill.current) fill.current.intensity = 0.35 * r
  })
  return (
    <>
      <hemisphereLight ref={fill} args={['#9db8ff', '#1a0c10', 0.35]} />
      <spotLight ref={key} position={[1.6, 8.5, 4.2]} angle={0.42} penumbra={0.9} intensity={260} color="#fff1e0" decay={2} distance={30} target-position={[0, 1.7, 0]} />
      <directionalLight ref={rimR} position={[-5, 3.2, -3.5]} color="#ff3b2f" intensity={3.2} />
      <directionalLight ref={rimB} position={[5, 2.4, -3]} color="#3fb6ff" intensity={3.6} />
    </>
  )
}

function Studio() {
  // Procedural studio reflections: no HDR download needed, keeps the metal reading as metal.
  return (
    <Environment resolution={256} frames={1}>
      <color attach="background" args={['#05070b']} />
      <Lightformer form="rect" intensity={5} color="#ffffff" position={[0, 5, 3]} scale={[8, 2.2, 1]} />
      <Lightformer form="rect" intensity={3} color="#ffd2a0" position={[-5, 2, 3]} rotation-y={Math.PI / 3} scale={[3, 6, 1]} />
      <Lightformer form="rect" intensity={3.4} color="#7cc4ff" position={[5, 2, 2]} rotation-y={-Math.PI / 3} scale={[3, 6, 1]} />
      <Lightformer form="rect" intensity={2.4} color="#ff5a45" position={[0, 1, -6]} scale={[10, 3, 1]} />
      <Lightformer form="ring" intensity={2} color="#ffffff" position={[0, -3, 4]} scale={4} />
    </Environment>
  )
}

/** Contact shadow only while the suit is on the ground (hidden in flight, when it would float). */
function GroundShadow() {
  const g = useRef<THREE.Group>(null)
  useFrame(() => {
    if (g.current) g.current.visible = bus.view.floor > 0.45 && bus.fx.lift < 0.2
  })
  return (
    <group ref={g}>
      <ContactShadows position={[0, 0.005, 0]} opacity={0.75} scale={7} blur={2.4} far={2.2} resolution={512} frames={1} color="#000000" />
    </group>
  )
}

/** Renders only while the suit is on screen and the tab is visible. */
function useActiveFrameloop() {
  const [visible, setV] = useState(bus.visible)
  const [tabVisible, setTab] = useState(!document.hidden)
  useEffect(() => {
    bus.visibleListeners.add(setV)
    setV(bus.visible)
    const vis = () => setTab(!document.hidden)
    document.addEventListener('visibilitychange', vis)
    return () => {
      bus.visibleListeners.delete(setV)
      document.removeEventListener('visibilitychange', vis)
    }
  }, [])
  return visible && tabVisible
}

interface StageProps {
  quality: Quality
  reduced: boolean
  onReady: () => void
  onError: () => void
}

export default function Stage({ quality, reduced, onReady, onError }: StageProps) {
  const active = useActiveFrameloop()
  const [dpr, setDpr] = useState(Math.min(quality.dpr[1], window.devicePixelRatio || 1))
  const ready = useCallback(() => onReady(), [onReady])

  return (
    <Canvas
      frameloop={active ? 'always' : 'never'}
      dpr={dpr}
      shadows={false}
      camera={{ fov: 30, near: 0.1, far: 60, position: [0, bus.view.look, bus.view.dist] }}
      gl={{ antialias: quality.antialias, alpha: true, powerPreference: 'high-performance', toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0)
        gl.domElement.addEventListener('webglcontextlost', (e) => {
          e.preventDefault()
          onError()
        })
      }}
      aria-hidden
    >
      <PerformanceMonitor
        flipflops={3}
        onDecline={() => setDpr(quality.dpr[0])}
        onIncline={() => setDpr(Math.min(quality.dpr[1], window.devicePixelRatio || 1))}
      />
      <AdaptiveDpr pixelated={false} />
      <Lights />
      <Suspense fallback={null}>
        <Studio />
        <Armor url={quality.modelFile} reduced={reduced} onReady={ready} />
        <GroundShadow />
        {quality.sparkles > 0 && !reduced && (
          <Sparkles count={quality.sparkles} scale={[5, 4.4, 3]} position={[0, 2.2, 0]} size={2.2} speed={0.25} opacity={0.55} color="#ffb48a" />
        )}
      </Suspense>
      <Atmosphere />
      <Rig reduced={reduced} />
    </Canvas>
  )
}
