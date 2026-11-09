import { Suspense, lazy, useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { bus, getStatus, markReady, setStatus, subscribeStatus, triggerAction, type ActionState } from '../three/bus'
import { ACTION_LABEL } from '../three/actions'
import { getPhase, subscribePhase } from '../three/director'
import { detectQuality } from '../three/quality'
import { sfx } from '../lib/sound'

const Stage = lazy(() => import('../three/Stage'))

interface Props {
  reduced: boolean
  /** True when there is no pinned scroll story (reduced motion / no WebGL): the poster is the full-body shot. */
  isStatic: boolean
}

/**
 * Page-wide 3D layer. One fixed canvas sits behind the whole page; the scroll director
 * (`three/director.ts`) moves the camera and the suit between shots as the visitor scrolls.
 * Until WebGL is ready (and whenever it is unavailable) a poster of the same model is shown,
 * so the page content never depends on 3D.
 */
export default function SceneLayer({ reduced, isStatic }: Props) {
  const layer = useRef<HTMLDivElement>(null)
  const status = useSyncExternalStore(subscribeStatus, getStatus)
  const phase = useSyncExternalStore(subscribePhase, getPhase)
  const [quality] = useState(detectQuality)
  const [action, setAction] = useState<ActionState>('idle')
  // Mount the heavy 3D chunk only after the poster (LCP) has painted and the browser is idle.
  const [mount, setMount] = useState(false)

  useEffect(() => {
    bus.layer = layer.current
    return () => {
      bus.layer = null
    }
  }, [])

  useEffect(() => {
    if (status === 'fallback') return
    let cancelled = false
    const go = () => !cancelled && setMount(true)
    const schedule = () => {
      const idle = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback
      if (idle) idle(go, { timeout: 1200 })
      else setTimeout(go, 250)
    }
    if (document.readyState === 'complete') schedule()
    else window.addEventListener('load', schedule, { once: true })
    return () => {
      cancelled = true
      window.removeEventListener('load', schedule)
    }
  }, [status])

  // Action state -> UI label + sound (sound is opt-in and off by default).
  useEffect(() => {
    const l = (a: ActionState) => {
      setAction(a)
      if (a !== 'idle') sfx[a]()
    }
    bus.actionListeners.add(l)
    return () => {
      bus.actionListeners.delete(l)
    }
  }, [])

  const onReady = useCallback(() => {
    setStatus('ready')
    markReady()
  }, [])
  const onError = useCallback(() => setStatus('fallback'), [])

  // Pointer-driven head tracking (mouse only; touch devices keep native scrolling).
  useEffect(() => {
    if (reduced) return
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      bus.pointer.x = (e.clientX / window.innerWidth) * 2 - 1
      bus.pointer.y = (e.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener('pointermove', move, { passive: true })
    return () => window.removeEventListener('pointermove', move)
  }, [reduced])

  // Drag to turn the suit; a click (no drag) fires the repulsors.
  const drag = useRef<{ x: number; y: number; yaw: number; moved: boolean } | null>(null)
  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    drag.current = { x: e.clientX, y: e.clientY, yaw: bus.dragYaw, moved: false }
    bus.dragging = true
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.x
    if (Math.abs(dx) > 6) d.moved = true
    if (d.moved) bus.dragYaw = Math.max(-1.6, Math.min(1.6, d.yaw + dx * 0.009))
  }
  const onUp = () => {
    const d = drag.current
    drag.current = null
    bus.dragging = false
    if (d && !d.moved) triggerAction('fire')
  }

  const shown = status !== 'fallback' && mount

  return (
    <div className="scene-layer" ref={layer} data-status={status} data-static={isStatic ? '1' : '0'}>
      <div className="scene-backdrop" aria-hidden>
        <span className="grid-floor" />
        <span className="hud-ring hud-ring-a" />
        <span className="hud-ring hud-ring-b" />
      </div>

      {isStatic || status === 'fallback' ? (
        <img
          className="scene-poster scene-poster-full"
          src={`${import.meta.env.BASE_URL}poster.webp`}
          width={900}
          height={1000}
          alt="Iron Man Mark VII-style armour standing under a spotlight with a glowing arc reactor on the chest."
          decoding="async"
          fetchPriority="high"
        />
      ) : null}

      {shown && (
        <div className="scene-canvas" aria-hidden>
          <Suspense fallback={null}>
            <Stage quality={quality} reduced={reduced} onReady={onReady} onError={onError} />
          </Suspense>
        </div>
      )}

      {/* Moves with the suit (positioned by the camera rig); only active when the suit stands in a free area. */}
      {status === 'ready' && phase === 2 && (
        <div
          className="scene-hit"
          aria-hidden
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        />
      )}

      {status === 'loading' && mount && (
        <p className="scene-loading" role="status">
          <span className="spinner" aria-hidden /> INITIALISING ARMOR…
        </p>
      )}

      <p className="sr-only" role="status" aria-live="polite">
        {action === 'idle' ? '' : ACTION_LABEL[action]}
      </p>
    </div>
  )
}
