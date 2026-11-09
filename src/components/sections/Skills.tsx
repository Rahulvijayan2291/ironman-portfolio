import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { SKILLS } from '../../data/content'
import { sfx } from '../../lib/sound'
import Reveal from '../Reveal'
import SectionHead from '../SectionHead'

const R = 150 // orbit radius in the 400x400 viewBox

export default function Skills() {
  const [activeId, setActiveId] = useState(SKILLS[0].id)
  const active = SKILLS.find((s) => s.id === activeId) ?? SKILLS[0]

  const pick = (id: string) => {
    if (id !== activeId) sfx.ping()
    setActiveId(id)
  }

  return (
    <section id="skills" className="section skills" tabIndex={-1} aria-labelledby="skills-title">
      <div className="wrap">
        <SectionHead index="03" kicker="SUIT SYSTEMS" id="skills-title" title="THE TECHNOLOGY GRID" lead="Six systems, one stack. Hover, focus or tap a module to inspect it." />

        <div className="hud-skills">
          <Reveal className="hud-dial-wrap">
            <div className="hud-dial" role="group" aria-label="Skill categories">
              <svg className="hud-dial-svg" viewBox="0 0 400 400" aria-hidden>
                <circle cx="200" cy="200" r={R + 34} className="d-ring" />
                <circle cx="200" cy="200" r={R} className="d-ring d-dash" />
                <circle cx="200" cy="200" r={R - 56} className="d-ring" />
                {Array.from({ length: 72 }).map((_, i) => (
                  <line key={i} x1="200" y1={200 - (R + 34)} x2="200" y2={200 - (R + (i % 6 === 0 ? 24 : 29))} className="d-tick" transform={`rotate(${i * 5} 200 200)`} />
                ))}
              </svg>
              <div className="dial-core" aria-hidden>
                <span>{active.code}</span>
                <strong>{active.items.length}</strong>
                <small>MODULES</small>
              </div>
              {SKILLS.map((s, i) => {
                const a = (i / SKILLS.length) * Math.PI * 2 - Math.PI / 2
                return (
                  <button
                    key={s.id}
                    type="button"
                    className={`node${s.id === activeId ? ' is-active' : ''}`}
                    style={{ left: `${50 + ((Math.cos(a) * R) / 400) * 100}%`, top: `${50 + ((Math.sin(a) * R) / 400) * 100}%` }}
                    onMouseEnter={() => pick(s.id)}
                    onFocus={() => pick(s.id)}
                    onClick={() => pick(s.id)}
                    aria-pressed={s.id === activeId}
                  >
                    <span className="node-code">{s.code}</span>
                    <span className="node-label">{s.label}</span>
                  </button>
                )
              })}
            </div>
          </Reveal>

          <Reveal className="hud-readout" delay={0.1}>
            <div className="readout" aria-live="polite">
              <AnimatePresence mode="wait">
                <motion.div key={active.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
                  <p className="readout-code">{active.code} // ONLINE</p>
                  <h3>{active.label}</h3>
                  <p className="readout-blurb">{active.blurb}</p>
                  <ul className="chips">
                    {active.items.map((it) => (
                      <li key={it}>{it}</li>
                    ))}
                  </ul>
                </motion.div>
              </AnimatePresence>
            </div>

            <details className="skills-all">
              <summary>View all skills as a list</summary>
              <dl>
                {SKILLS.map((s) => (
                  <div key={s.id}>
                    <dt>{s.label}</dt>
                    <dd>{s.items.join(', ')}</dd>
                  </div>
                ))}
              </dl>
            </details>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
