import { ACHIEVEMENTS, type Achievement } from '../../data/content'
import { useCountUp } from '../../hooks/useCountUp'
import Reveal from '../Reveal'
import SectionHead from '../SectionHead'

function Metric({ a, feature = false }: { a: Achievement; feature?: boolean }) {
  const { ref, value } = useCountUp(a.value ?? 0)
  return (
    <div className={`metric${feature ? ' metric-feature' : ''}`}>
      <p className="metric-value" ref={ref as React.RefObject<HTMLParagraphElement>}>
        <span className="sr-only">
          {a.prefix}
          {a.value}
          {a.suffix}
        </span>
        <span aria-hidden>
          {a.prefix}
          {value}
          {a.suffix}
        </span>
      </p>
      <p className="metric-label">{a.label}</p>
      <p className="metric-detail">{a.detail}</p>
    </div>
  )
}

function Compare({ a }: { a: Achievement }) {
  return (
    <div className="metric metric-compare">
      <div className="compare" role="img" aria-label="A batch job reduced from over 10 hours to approximately 10 seconds">
        <div className="compare-row">
          <span>BEFORE</span>
          <div className="bar bar-before"><i /></div>
          <b>10+ hours</b>
        </div>
        <div className="compare-row">
          <span>AFTER</span>
          <div className="bar bar-after"><i /></div>
          <b>~10 seconds</b>
        </div>
      </div>
      <p className="metric-label">{a.label}</p>
      <p className="metric-detail">{a.detail}</p>
    </div>
  )
}

export default function Achievements() {
  // Unverified claims (e.g. "top 1%") stay hidden until flagged `verified` in content.ts.
  const items = ACHIEVEMENTS.filter((a) => a.verified)
  const lead = items.find((a) => a.id === 'lc')!
  const batch = items.find((a) => a.kind === 'compare')
  const rest = items.filter((a) => a.id !== 'lc' && a.kind !== 'compare')

  return (
    <section id="achievements" className="section achievements" tabIndex={-1} aria-labelledby="achievements-title">
      <div className="wrap">
        <SectionHead index="05" kicker="HOLOGRAPHIC DISPLAY" id="achievements-title" title="MEASURABLE IMPACT" lead="Figures as supplied in Rahul's profile and resume details." />

        <Reveal>
          <div className="holo">
            <span className="holo-scan" aria-hidden />
            <div className="holo-top">
              <Metric a={lead} feature />
              {batch && <Compare a={batch} />}
            </div>
            <div className="holo-grid">
              {rest.map((a) => (
                <Metric key={a.id} a={a} />
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
