import { ArrowUpRight, Github, Link2 } from 'lucide-react'
import { PROJECTS } from '../../data/content'
import Reveal from '../Reveal'
import SectionHead from '../SectionHead'

export default function Projects() {
  return (
    <section id="projects" className="section projects" tabIndex={-1} aria-labelledby="projects-title">
      <div className="wrap">
        <SectionHead index="04" kicker="MISSION BRIEFINGS" id="projects-title" title="SELECTED MISSIONS" lead="Three builds from the lab, briefed the way an engineer would hand them over." />

        <div className="briefings">
          {PROJECTS.map((p, i) => (
            <Reveal key={p.id} delay={0.04}>
              <article className="briefing" aria-labelledby={`${p.id}-name`}>
                <header className="briefing-head">
                  <p className="briefing-code">
                    <span>{p.code}</span>
                    <i aria-hidden />
                    <span>STATUS: ACTIVE</span>
                  </p>
                  <span className="briefing-no" aria-hidden>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </header>

                <div className="briefing-main">
                  <div>
                    <h3 id={`${p.id}-name`}>{p.name}</h3>
                    <p className="briefing-type">{p.type}</p>
                    <p className="briefing-summary">{p.summary}</p>
                  </div>

                  <div className="briefing-detail">
                    <p className="label">OBJECTIVES</p>
                    <ul className="ticks">
                      {p.features.map((f) => (
                        <li key={f}>{f}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <footer className="briefing-foot">
                  {p.tech.length > 0 && (
                    <ul className="chips chips-sm" aria-label={`${p.name} technology`}>
                      {p.tech.map((t) => (
                        <li key={t}>{t}</li>
                      ))}
                    </ul>
                  )}
                  <div className="briefing-links">
                    {p.links.map((l) =>
                      l.href ? (
                        <a key={l.label} className="link-arrow" href={l.href} target="_blank" rel="noopener noreferrer">
                          <Github size={15} aria-hidden /> {l.label} <ArrowUpRight size={14} aria-hidden />
                          <span className="sr-only"> (opens in a new tab)</span>
                        </a>
                      ) : (
                        <span key={l.label} className="link-placeholder" title="Replace with a verified URL in src/data/content.ts">
                          <Link2 size={14} aria-hidden /> {l.placeholder}
                        </span>
                      ),
                    )}
                  </div>
                </footer>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
