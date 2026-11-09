import { useCallback, useEffect, useRef } from 'react'
import { SkipForward } from 'lucide-react'
import { bus, whenReady } from '../three/bus'
import { rememberIntro } from '../lib/session'
import { sfx } from '../lib/sound'

const BOOT_LINES = [
  ['STARK SYSTEMS // BOOT SEQUENCE', ''],
  ['CORE POWER', 'NOMINAL'],
  ['OPERATOR PROFILE', 'RAHUL VIJAYAN'],
  ['SCANNING SUIT TELEMETRY', 'OK'],
  ['INTERFACE', 'SYNCED'],
]

interface Props {
  /** Called as the overlay starts to fade, so the hero copy can animate in. */
  onFinishing: () => void
  /** Called once the overlay can be unmounted. */
  onDone: () => void
}

/**
 * Cinematic intro. It sits above an already-rendered page (never gating content),
 * lazy-loads GSAP, and can be skipped by button, Escape or by letting it finish.
 */
export default function Intro({ onFinishing, onDone }: Props) {
  const root = useRef<HTMLDivElement>(null)
  const finished = useRef(false)
  const tlRef = useRef<{ kill: () => void } | null>(null)

  const finish = useCallback(
    async (quick: boolean) => {
      if (finished.current) return
      finished.current = true
      tlRef.current?.kill()
      rememberIntro(true)
      const { gsap } = await import('gsap')
      onFinishing()
      gsap.killTweensOf(bus)
      gsap.to(bus, { reveal: 1, duration: quick ? 0.5 : 0.8, ease: 'power2.out' })
      gsap.to(root.current, { opacity: 0, duration: quick ? 0.45 : 0.8, ease: 'power1.out', onComplete: onDone })
    },
    [onDone, onFinishing],
  )

  useEffect(() => {
    let cancelled = false
    const el = root.current!
    ;(async () => {
      const { gsap } = await import('gsap')
      if (cancelled || finished.current) return
      const q = <T extends Element = HTMLElement>(s: string) => el.querySelector<T>(s)!
      const lines = gsap.utils.toArray<HTMLElement>(el.querySelectorAll('.boot-line'))
      const tl = gsap.timeline({ defaults: { ease: 'power2.out' } })
      tlRef.current = tl

      bus.reveal = 0

      tl.fromTo(q('.intro-core'), { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 1, ease: 'power3.out' }, 0.25)
        .to(q('.intro-core'), { '--pulse': 1, duration: 0.5, repeat: 5, yoyo: true, ease: 'sine.inOut' }, 0.5)
      lines.forEach((l, i) => tl.to(l, { opacity: 1, x: 0, duration: 0.3 }, 0.8 + i * 0.32))
      tl.to(q('.intro-progress i'), { scaleX: 1, duration: 2.1, ease: 'power1.inOut' }, 0.8)
        .fromTo(q('.intro-scan'), { yPercent: -110, opacity: 0 }, { yPercent: 1100, opacity: 1, duration: 1.15, ease: 'power1.inOut' }, 2.35)
        .addLabel('reveal', 3.5)
        .add(() => {
          // Wait (briefly) for the model so the reveal never plays on an empty stage.
          tl.pause()
          void whenReady(1800).then(() => {
            if (!finished.current) tl.resume()
          })
        }, 'reveal')
        .to(q('.intro-stack'), { opacity: 0, duration: 0.5 }, 'reveal+=0.05')
        .to(q('.intro-veil'), { '--hole': 96, duration: 2, ease: 'power2.inOut' }, 'reveal+=0.1')
        .to(bus, { reveal: 1, duration: 2, ease: 'power2.out' }, 'reveal+=0.1')
        .add(() => sfx.power(), 'reveal+=1.2')
        .fromTo(q('.intro-online'), { opacity: 0, letterSpacing: '0.9em' }, { opacity: 1, letterSpacing: '0.38em', duration: 1.2 }, 'reveal+=1.2')
        .add(() => void finish(false), 'reveal+=3.4')
        .to(q('.intro-online'), { opacity: 0, duration: 0.5 }, 'reveal+=3.4')
    })()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') void finish(true)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      cancelled = true
      tlRef.current?.kill()
      window.removeEventListener('keydown', onKey)
    }
  }, [finish])

  return (
    <div className="intro" ref={root} role="region" aria-label="Intro sequence">
      <div className="intro-veil" style={{ ['--hole' as string]: -22 }} />
      <div className="intro-stack">
        <p className="intro-mark">
          STARK SYSTEMS <span>// RAHUL VIJAYAN</span>
        </p>
        <div className="intro-core" aria-hidden>
          <svg viewBox="0 0 200 200" fill="none">
            <circle cx="100" cy="100" r="92" stroke="currentColor" strokeWidth="1" opacity=".35" />
            <circle className="spin-slow" cx="100" cy="100" r="74" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 8" opacity=".7" />
            <circle className="spin-rev" cx="100" cy="100" r="54" stroke="currentColor" strokeWidth="2" strokeDasharray="40 14" opacity=".9" />
            {[0, 60, 120, 180, 240, 300].map((a) => (
              <rect key={a} x="96" y="30" width="8" height="18" rx="2" fill="currentColor" opacity=".85" transform={`rotate(${a} 100 100)`} />
            ))}
            <circle className="core-dot" cx="100" cy="100" r="24" fill="currentColor" />
          </svg>
        </div>
        <ul className="intro-boot" aria-hidden>
          {BOOT_LINES.map(([k, v]) => (
            <li className="boot-line" key={k}>
              <span className="boot-k">&gt; {k}</span>
              {v && <span className="boot-dots" />}
              {v && <span className="boot-v">{v}</span>}
            </li>
          ))}
        </ul>
        <div className="intro-progress" aria-hidden>
          <i />
        </div>
      </div>
      <div className="intro-scan" aria-hidden />
      <p className="intro-online" aria-live="polite">
        STARK SYSTEMS <strong>ONLINE</strong>
      </p>
      <button type="button" className="intro-skip" onClick={() => void finish(true)}>
        <SkipForward size={14} aria-hidden /> SKIP INTRO <kbd>ESC</kbd>
      </button>
    </div>
  )
}
