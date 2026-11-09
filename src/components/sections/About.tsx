import { Bug, Gauge, Layers, Network, Sparkles, Users, type LucideIcon } from 'lucide-react'
import { ABOUT, MANIFESTO } from '../../data/content'
import Reveal from '../Reveal'
import SectionHead from '../SectionHead'

const ICONS: Record<string, LucideIcon> = { layers: Layers, network: Network, bug: Bug, gauge: Gauge, sparkles: Sparkles, users: Users }

export default function About() {
  return (
    <section id="about" className="section about" tabIndex={-1} aria-labelledby="about-title">
      <div className="wrap">
        <SectionHead index="01" kicker="ABOUT" id="about-title" title={ABOUT.title} lead={ABOUT.intro} />

        <div className="about-grid">
          <Reveal className="identity" delay={0.05}>
            <figure className="identity-frame">
              <div className="identity-photo">
                <img
                  src={`${import.meta.env.BASE_URL}profile.jpg`}
                  width={720}
                  height={960}
                  alt="Portrait of Rahul Vijayan"
                  loading="lazy"
                  decoding="async"
                />
                <span className="corner tl" />
                <span className="corner tr" />
                <span className="corner bl" />
                <span className="corner br" />
              </div>
              <dl className="identity-data">
                {ABOUT.identity.map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            </figure>
          </Reveal>

          <ul className="capabilities">
            {ABOUT.highlights.map((h, i) => {
              const Icon = ICONS[h.icon]
              return (
                <li key={h.title}>
                  <Reveal delay={0.05 * i} y={18}>
                    <div className="cap">
                      <span className="cap-icon">
                        <Icon size={20} aria-hidden />
                      </span>
                      <div>
                        <h3>{h.title}</h3>
                        <p>{h.text}</p>
                      </div>
                    </div>
                  </Reveal>
                </li>
              )
            })}
          </ul>
        </div>

        <Reveal className="manifesto">
          <blockquote>{MANIFESTO}</blockquote>
        </Reveal>
      </div>
    </section>
  )
}
