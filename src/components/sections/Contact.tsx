import { useId, useState } from 'react'
import { ArrowUpRight, Check, FileText, Github, Linkedin, Mail, Send } from 'lucide-react'
import { LINKS, MANIFESTO } from '../../data/content'
import { sfx } from '../../lib/sound'
import Reveal from '../Reveal'

type Fields = { name: string; email: string; message: string }
type Errors = Partial<Record<keyof Fields, string>>
type Status = 'idle' | 'sending' | 'sent' | 'drafted' | 'error'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function validate(v: Fields): Errors {
  const e: Errors = {}
  if (v.name.trim().length < 2) e.name = 'Please enter your name (2+ characters).'
  if (!EMAIL_RE.test(v.email.trim())) e.email = 'Enter a valid email address, e.g. name@company.com.'
  if (v.message.trim().length < 10) e.message = 'Tell me a little more (10+ characters).'
  else if (v.message.length > 2000) e.message = 'Please keep the message under 2000 characters.'
  return e
}

export default function Contact() {
  const uid = useId()
  const [values, setValues] = useState<Fields>({ name: '', email: '', message: '' })
  const [honeypot, setHoneypot] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [touched, setTouched] = useState<Partial<Record<keyof Fields, boolean>>>({})
  const [status, setStatus] = useState<Status>('idle')

  const endpoint = import.meta.env.VITE_FORM_ENDPOINT?.trim()

  const set = (k: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const next = { ...values, [k]: e.target.value }
    setValues(next)
    if (touched[k]) setErrors(validate(next))
  }
  const blur = (k: keyof Fields) => () => {
    setTouched((t) => ({ ...t, [k]: true }))
    setErrors(validate(values))
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate(values)
    setErrors(errs)
    setTouched({ name: true, email: true, message: true })
    if (Object.keys(errs).length) {
      const first = (Object.keys(errs) as Array<keyof Fields>)[0]
      document.getElementById(`${uid}-${first}`)?.focus()
      return
    }
    if (honeypot) return // bots fill hidden fields

    if (endpoint) {
      setStatus('sending')
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(values),
        })
        if (!res.ok) throw new Error(String(res.status))
        setStatus('sent')
        sfx.power()
        setValues({ name: '', email: '', message: '' })
        setTouched({})
      } catch {
        setStatus('error')
      }
      return
    }

    // No backend configured: open a prefilled draft in the visitor's mail client.
    const subject = encodeURIComponent(`Portfolio enquiry from ${values.name.trim()}`)
    const body = encodeURIComponent(`${values.message.trim()}\n\n— ${values.name.trim()} (${values.email.trim()})`)
    window.location.href = `mailto:${LINKS.email}?subject=${subject}&body=${body}`
    setStatus('drafted')
  }

  const field = (k: keyof Fields) => ({
    id: `${uid}-${k}`,
    name: k,
    value: values[k],
    onChange: set(k),
    onBlur: blur(k),
    'aria-invalid': errors[k] ? (true as const) : undefined,
    'aria-describedby': errors[k] ? `${uid}-${k}-err` : undefined,
    required: true,
  })

  return (
    <section id="contact" className="section contact" tabIndex={-1} aria-labelledby="contact-title">
      <div className="wrap">
        <Reveal className="section-head">
          <p className="kicker">
            <span className="kicker-index">06</span>
            <span className="kicker-line" aria-hidden />
            <span>OPEN CHANNEL</span>
          </p>
          <h2 id="contact-title">LET&rsquo;S BUILD SOMETHING EXTRAORDINARY.</h2>
        </Reveal>

        <div className="contact-grid" data-gutter>
          <Reveal className="contact-links" delay={0.05}>
            <ul>
              <li>
                <a href={`mailto:${LINKS.email}`}>
                  <Mail size={18} aria-hidden />
                  <span>
                    <small>EMAIL</small>
                    {LINKS.email}
                  </span>
                  <ArrowUpRight size={16} aria-hidden />
                </a>
              </li>
              <li>
                <a href={LINKS.github} target="_blank" rel="noopener noreferrer">
                  <Github size={18} aria-hidden />
                  <span>
                    <small>GITHUB</small>
                    github.com/Rahulvijayan2291
                  </span>
                  <ArrowUpRight size={16} aria-hidden />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              </li>
              <li>
                <a href={LINKS.resume} target="_blank" rel="noopener noreferrer">
                  <FileText size={18} aria-hidden />
                  <span>
                    <small>RESUME</small>
                    View on Google Drive
                  </span>
                  <ArrowUpRight size={16} aria-hidden />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              </li>
              <li>
                {LINKS.linkedin ? (
                  <a href={LINKS.linkedin} target="_blank" rel="noopener noreferrer">
                    <Linkedin size={18} aria-hidden />
                    <span>
                      <small>LINKEDIN</small>
                      Connect on LinkedIn
                    </span>
                    <ArrowUpRight size={16} aria-hidden />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                ) : (
                  <div className="placeholder-row" title="Set VITE_LINKEDIN_URL before launch">
                    <Linkedin size={18} aria-hidden />
                    <span>
                      <small>LINKEDIN</small>
                      LINKEDIN URL — REPLACE BEFORE LAUNCH
                    </span>
                  </div>
                )}
              </li>
            </ul>
            <a className="btn btn-ghost btn-block" href={LINKS.resumeDownload} target="_blank" rel="noopener noreferrer">
              <FileText size={16} aria-hidden /> Download Resume<span className="sr-only"> (opens in a new tab)</span>
            </a>
          </Reveal>

          <Reveal delay={0.1}>
            <form className="console" onSubmit={submit} noValidate aria-labelledby={`${uid}-title`}>
              <div className="console-bar">
                <span id={`${uid}-title`}>COMMUNICATION CONSOLE</span>
                <span className="status status-sm"><i aria-hidden /> SECURE CHANNEL</span>
              </div>

              <div className="field">
                <label htmlFor={`${uid}-name`}>NAME</label>
                <input type="text" autoComplete="name" placeholder="Your name" {...field('name')} />
                {errors.name && <p className="field-err" id={`${uid}-name-err`} role="alert">{errors.name}</p>}
              </div>

              <div className="field">
                <label htmlFor={`${uid}-email`}>EMAIL</label>
                <input type="email" autoComplete="email" inputMode="email" placeholder="you@company.com" {...field('email')} />
                {errors.email && <p className="field-err" id={`${uid}-email-err`} role="alert">{errors.email}</p>}
              </div>

              <div className="field">
                <label htmlFor={`${uid}-message`}>MESSAGE</label>
                <textarea rows={5} placeholder="What are we building?" {...field('message')} />
                {errors.message && <p className="field-err" id={`${uid}-message-err`} role="alert">{errors.message}</p>}
              </div>

              <div className="hp" aria-hidden>
                <label>
                  Leave this field empty
                  <input type="text" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
                </label>
              </div>

              <div className="console-foot">
                <button className="btn btn-primary" type="submit" disabled={status === 'sending'}>
                  {status === 'sending' ? 'TRANSMITTING…' : endpoint ? 'TRANSMIT MESSAGE' : 'COMPOSE EMAIL'} <Send size={15} aria-hidden />
                </button>
                <p className="console-status" role="status" aria-live="polite">
                  {status === 'sent' && (<><Check size={14} aria-hidden /> Message received. I&rsquo;ll reply soon.</>)}
                  {status === 'drafted' && 'Your email app should open with a prefilled draft.'}
                  {status === 'error' && 'Transmission failed. Please email me directly at the address on the left.'}
                  {status === 'idle' && !endpoint && 'Opens a prefilled draft in your email app.'}
                </p>
              </div>
            </form>
          </Reveal>
        </div>

        <Reveal>
          <p className="closing">{MANIFESTO}</p>
        </Reveal>
      </div>
    </section>
  )
}
