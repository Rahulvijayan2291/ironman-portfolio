import { useEffect, useRef, useSyncExternalStore } from 'react'
import { ArrowUpRight, FileText, Github, Mouse } from 'lucide-react'
import { HERO, LINKS } from '../../data/content'
import { sfx } from '../../lib/sound'
import { getPhase, subscribePhase } from '../../three/director'
import CinematicControls from '../CinematicControls'

interface Props {
  /** True when there is no pinned scroll story (reduced motion): all hero copy is simply visible. */
  isStatic: boolean
}

/**
 * Hero = a pinned scroll story over the page-wide 3D layer:
 *   phase 0  helmet close-up, eyes ignite, name + titles
 *   phase 1  the camera starts to pull back, the main copy fades in
 *   phase 2  full-body suit on the right, controls available
 * The 3D itself is rendered by <SceneLayer/>; this component only owns the text.
 */
export default function Hero({ isStatic }: Props) {
  const phase = useSyncExternalStore(subscribePhase, getPhase)
  const copy = useRef<HTMLDivElement>(null)

  const jump = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault()
    sfx.ping()
    document.getElementById(id)?.scrollIntoView({ behavior: isStatic ? 'auto' : 'smooth' })
  }

  // Keyboard users can tab into the copy before it has faded in: bring the story to that point.
  useEffect(() => {
    const el = copy.current
    if (!el || isStatic) return
    const onFocus = () => {
      const hero = document.getElementById('home')
      if (!hero || getPhase() >= 1) return
      const span = hero.offsetHeight - window.innerHeight
      window.scrollTo({ top: span * 0.8, behavior: 'auto' })
    }
    el.addEventListener('focusin', onFocus)
    return () => el.removeEventListener('focusin', onFocus)
  }, [isStatic])

  return (
    <section id="home" className="hero" data-static={isStatic ? '1' : '0'} data-phase={phase} tabIndex={-1} aria-labelledby="hero-title">
      <div className="hero-pin">
        {!isStatic && (
          <div className="hero-face" aria-hidden>
            <p className="face-tag">
              <span className="eyebrow-dot" /> STARK SYSTEMS // OPERATOR 001
            </p>
            <p className="face-name">
              <span>RAHUL</span>
              <span>VIJAYAN</span>
            </p>
            <p className="face-roles">
              {HERO.roles.map((r, i) => (
                <span key={r}>
                  {i > 0 && <b> | </b>}
                  {r}
                </span>
              ))}
            </p>
            <p className="face-scroll">
              <Mouse size={14} /> SCROLL TO POWER UP
            </p>
          </div>
        )}

        <ul className="hud-tags" aria-label="Core technologies">
          {HERO.hudLabels.map((l, i) => (
            <li key={l} className={`hud-tag hud-tag-${i + 1}`} style={{ animationDelay: `${i * -1.3}s` }}>
              <i aria-hidden />
              {l}
            </li>
          ))}
        </ul>

        <div className="hero-copy" ref={copy}>
          <p className="eyebrow">
            <span className="eyebrow-dot" aria-hidden /> STARK SYSTEMS // OPERATOR 001
          </p>

          <h1 id="hero-title">
            <span className="sr-only">{HERO.name} — </span>
            <span className="h1-line">ENGINEERING THE FUTURE,</span>
            <span className="h1-line h1-accent">ONE SYSTEM AT A TIME.</span>
          </h1>

          <div className="hero-id">
            <p className="hero-name">{HERO.name}</p>
            <p className="hero-roles">
              {HERO.roles.map((r, i) => (
                <span key={r}>
                  {i > 0 && <b aria-hidden> | </b>}
                  {r}
                </span>
              ))}
            </p>
          </div>

          <p className="hero-desc">{HERO.description}</p>

          <div className="hero-actions">
            <a className="btn btn-primary" href="#about" onClick={jump('about')}>
              Explore My Universe <ArrowUpRight size={16} aria-hidden />
            </a>
            <a className="btn btn-ghost" href={LINKS.resume} target="_blank" rel="noopener noreferrer">
              <FileText size={16} aria-hidden /> View Resume<span className="sr-only"> (opens in a new tab)</span>
            </a>
            <a className="btn btn-ghost" href={LINKS.github} target="_blank" rel="noopener noreferrer">
              <Github size={16} aria-hidden /> GitHub<span className="sr-only"> (opens in a new tab)</span>
            </a>
          </div>

          <div className="hero-xp">
            <strong>{HERO.experience.value}</strong>
            <span>{HERO.experience.label}</span>
          </div>
        </div>

        <a className="scroll-cue" href="#about" onClick={jump('about')} aria-label="Scroll to the about section">
          <Mouse size={16} aria-hidden /> <span>SCROLL</span>
        </a>

        {!isStatic && <CinematicControls />}
      </div>
    </section>
  )
}
