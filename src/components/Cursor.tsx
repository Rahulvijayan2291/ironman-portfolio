import { useEffect, useRef, useState } from 'react'

/**
 * Desktop-only cursor accent. The native cursor is never hidden, so pointing,
 * text selection and accessibility tooling keep working. Skipped on touch devices
 * and when reduced motion is requested.
 */
export default function Cursor() {
  const ring = useRef<HTMLDivElement>(null)
  const dot = useRef<HTMLDivElement>(null)
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)')
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setEnabled(fine.matches && !reduced.matches)
    sync()
    fine.addEventListener('change', sync)
    reduced.addEventListener('change', sync)
    return () => {
      fine.removeEventListener('change', sync)
      reduced.removeEventListener('change', sync)
    }
  }, [])

  useEffect(() => {
    if (!enabled) return
    let x = -100
    let y = -100
    let rx = x
    let ry = y
    let raf = 0
    let visible = false
    const interactive = 'a, button, input, textarea, select, summary, [role="button"], [data-cursor]'

    const move = (e: PointerEvent) => {
      x = e.clientX
      y = e.clientY
      if (!visible) {
        visible = true
        document.documentElement.dataset.cursor = 'on'
      }
      const hot = (e.target as Element | null)?.closest(interactive)
      ring.current?.classList.toggle('is-hot', Boolean(hot))
      if (!raf) raf = requestAnimationFrame(tick)
    }
    const tick = () => {
      rx += (x - rx) * 0.2
      ry += (y - ry) * 0.2
      if (dot.current) dot.current.style.transform = `translate3d(${x}px,${y}px,0)`
      if (ring.current) ring.current.style.transform = `translate3d(${rx}px,${ry}px,0)`
      raf = Math.abs(x - rx) + Math.abs(y - ry) > 0.1 ? requestAnimationFrame(tick) : 0
    }
    const leave = () => {
      visible = false
      delete document.documentElement.dataset.cursor
    }
    window.addEventListener('pointermove', move, { passive: true })
    document.documentElement.addEventListener('pointerleave', leave)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', move)
      document.documentElement.removeEventListener('pointerleave', leave)
      delete document.documentElement.dataset.cursor
    }
  }, [enabled])

  if (!enabled) return null
  return (
    <>
      <div className="cursor-ring" ref={ring} aria-hidden />
      <div className="cursor-dot" ref={dot} aria-hidden />
    </>
  )
}
