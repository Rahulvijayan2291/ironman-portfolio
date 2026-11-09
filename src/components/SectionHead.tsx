import type { ReactNode } from 'react'
import Reveal from './Reveal'

interface Props {
  index: string
  kicker: string
  title: ReactNode
  id: string
  lead?: ReactNode
}

export default function SectionHead({ index, kicker, title, id, lead }: Props) {
  return (
    <Reveal className="section-head">
      <p className="kicker">
        <span className="kicker-index">{index}</span>
        <span className="kicker-line" aria-hidden />
        <span>{kicker}</span>
      </p>
      <h2 id={id}>{title}</h2>
      {lead && <p className="lead">{lead}</p>}
    </Reveal>
  )
}
