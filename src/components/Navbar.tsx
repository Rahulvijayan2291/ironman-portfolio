import { useEffect, useState, useSyncExternalStore } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Menu, Volume2, VolumeX, X } from 'lucide-react'
import { NAV } from '../data/content'
import { isSoundOn, setSound, sfx, subscribeSound } from '../lib/sound'
import ReactorMark from './ReactorMark'

function useActiveSection(ids: string[]) {
  const [active, setActive] = useState(ids[0])
  useEffect(() => {
    const els = ids.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[]
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (hit) setActive(hit.target.id)
      },
      { rootMargin: '-35% 0px -55% 0px', threshold: [0, 0.2, 0.6] },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [ids])
  return active
}

const IDS = NAV.map((n) => n.id) as string[]

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const active = useActiveSection(IDS)
  const sound = useSyncExternalStore(subscribeSound, isSoundOn)

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])

  useEffect(() => {
    document.body.classList.toggle('menu-open', open)
    if (!open) return
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', esc)
    return () => {
      window.removeEventListener('keydown', esc)
      document.body.classList.remove('menu-open')
    }
  }, [open])

  const go = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault()
    setOpen(false)
    sfx.ping()
    const el = document.getElementById(id)
    if (!el) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
    history.replaceState(null, '', `#${id}`)
    // move focus so keyboard / screen-reader users land in the new section
    window.setTimeout(() => el.focus({ preventScroll: true }), reduce ? 0 : 600)
  }

  return (
    <header className={`nav${scrolled ? ' is-scrolled' : ''}`}>
      <a className="nav-brand" href="#home" onClick={go('home')} aria-label="Stark Systems — Rahul Vijayan, back to top">
        <ReactorMark size={26} />
        <span className="nav-brand-text">
          STARK SYSTEMS<small>POWERED BY RAHUL VIJAYAN</small>
        </span>
      </a>

      <nav className="nav-links" aria-label="Primary">
        {NAV.map((n) => (
          <a key={n.id} href={`#${n.id}`} onClick={go(n.id)} aria-current={active === n.id ? 'true' : undefined}>
            {n.label}
          </a>
        ))}
      </nav>

      <div className="nav-tools">
        <span className="status" role="status">
          <i aria-hidden /> SYSTEM ONLINE
        </span>
        <button type="button" className="icon-btn" onClick={() => setSound(!sound)} aria-pressed={sound} aria-label={sound ? 'Turn interface sounds off' : 'Turn interface sounds on'}>
          {sound ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </button>
        <button type="button" className="icon-btn nav-burger" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="mobile-menu" aria-label={open ? 'Close menu' : 'Open menu'}>
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div id="mobile-menu" className="mobile-menu" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <nav aria-label="Mobile">
              {NAV.map((n, i) => (
                <motion.a key={n.id} href={`#${n.id}`} onClick={go(n.id)} aria-current={active === n.id ? 'true' : undefined} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.04 * i, duration: 0.35 }}>
                  <small>{String(i + 1).padStart(2, '0')}</small>
                  {n.label}
                </motion.a>
              ))}
            </nav>
            <p className="mobile-status">
              <i aria-hidden /> SYSTEM ONLINE
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
