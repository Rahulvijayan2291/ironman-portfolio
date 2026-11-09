interface Props {
  size?: number
  className?: string
}

/** Original reactor-inspired brand mark (not a Stark Industries logo). */
export default function ReactorMark({ size = 28, className }: Props) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden focusable="false">
      <circle cx="24" cy="24" r="21" stroke="currentColor" strokeWidth="1.5" opacity="0.55" />
      <circle cx="24" cy="24" r="15" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3.2" opacity="0.8" />
      {[0, 60, 120, 180, 240, 300].map((a) => (
        <rect key={a} x="22.6" y="6.5" width="2.8" height="7" rx="1" fill="currentColor" transform={`rotate(${a} 24 24)`} opacity="0.9" />
      ))}
      <circle cx="24" cy="24" r="6" fill="currentColor" />
    </svg>
  )
}
