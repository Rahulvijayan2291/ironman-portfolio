import { EXPERIENCE } from '../../data/content'
import Reveal from '../Reveal'
import SectionHead from '../SectionHead'

export default function Experience() {
  return (
    <section id="experience" className="section experience" tabIndex={-1} aria-labelledby="experience-title">
      <div className="wrap">
        <SectionHead index="02" kicker="MISSION LOG" id="experience-title" title="FIELD OPERATIONS" lead="Where the engineering happens: enterprise platforms, production systems and the teams around them." />

        <ol className="timeline" data-gutter>
          {EXPERIENCE.map((p, i) => (
            <li key={p.id} className={`posting${p.current ? ' is-current' : ''}`}>
              <Reveal delay={0.04} y={22}>
                <div className="posting-node" aria-hidden>
                  <span>{String(i + 1).padStart(2, '0')}</span>
                </div>
                <article className="posting-body">
                  <header>
                    <div>
                      <p className="posting-org">{p.org}</p>
                      <h3>{p.role ?? 'Role to be confirmed'}</h3>
                    </div>
                    <p className="posting-period" data-placeholder={p.period ? undefined : ''}>
                      {p.current && <em className="pill">CURRENT</em>}
                      {p.period ?? 'DATES — TO BE CONFIRMED'}
                    </p>
                  </header>

                  {p.note && <p className="posting-note">{p.note}</p>}
                  {p.summary && <p className="posting-summary">{p.summary}</p>}

                  {p.missions && (
                    <div className="missions">
                      {p.missions.map((m) => (
                        <section key={m.title} className="mission-block" aria-label={m.title}>
                          <p className="mission-tag">{m.tag}</p>
                          <h4>{m.title}</h4>
                          <ul className="ticks">
                            {m.points.map((pt) => (
                              <li key={pt}>{pt}</li>
                            ))}
                          </ul>
                        </section>
                      ))}
                    </div>
                  )}

                  {p.points && (
                    <ul className="ticks ticks-cols">
                      {p.points.map((pt) => (
                        <li key={pt}>{pt}</li>
                      ))}
                    </ul>
                  )}
                </article>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
