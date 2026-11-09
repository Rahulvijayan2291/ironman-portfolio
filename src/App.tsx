import { useCallback, useEffect, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import Intro from './components/Intro'
import Navbar from './components/Navbar'
import Cursor from './components/Cursor'
import SceneLayer from './components/SceneLayer'
import Hero from './components/sections/Hero'
import About from './components/sections/About'
import Experience from './components/sections/Experience'
import Skills from './components/sections/Skills'
import Projects from './components/sections/Projects'
import Achievements from './components/sections/Achievements'
import Contact from './components/sections/Contact'
import ReactorMark from './components/ReactorMark'
import { introSeen } from './lib/session'
import { bus } from './three/bus'
import { startDirector } from './three/director'

export default function App() {
  const reduced = Boolean(useReducedMotion())
  // The page is always rendered underneath; the intro is only an overlay.
  const [showIntro, setShowIntro] = useState(() => !introSeen())
  const [entered, setEntered] = useState(() => !showIntro)

  // While the intro plays, hero chrome (nav, HUD tags, copy) stays hidden so it can't clash with the reveal.
  useEffect(() => {
    const el = document.documentElement
    if (showIntro && !entered) el.dataset.intro = 'on'
    else delete el.dataset.intro
    return () => {
      delete el.dataset.intro
    }
  }, [showIntro, entered])

  // Scroll director: drives the page-wide 3D layer from the scroll position.
  useEffect(() => startDirector({ staticLayout: reduced, reduced }), [reduced])

  const onFinishing = useCallback(() => setEntered(true), [])
  const onDone = useCallback(() => {
    setShowIntro(false)
    bus.reveal = 1
  }, [])

  return (
    <>
      <a className="skip-link" href="#about">Skip to content</a>
      {showIntro && !reduced && <Intro onFinishing={onFinishing} onDone={onDone} />}
      <Cursor />
      <Navbar />
      <SceneLayer reduced={reduced} isStatic={reduced} />
      <main id="main">
        <Hero isStatic={reduced} />
        <About />
        <Experience />
        <Skills />
        <Projects />
        <Achievements />
        <Contact />
      </main>
      <footer className="footer">
        <div className="wrap footer-inner">
          <p className="footer-brand">
            <ReactorMark size={20} /> STARK SYSTEMS <span>Powered by Rahul Vijayan</span>
          </p>
          <p className="footer-note">&copy; {new Date().getFullYear()} Rahul Vijayan. An original design inspired by the Iron Man universe; not affiliated with Marvel or Disney.</p>
        </div>
      </footer>
    </>
  )
}
