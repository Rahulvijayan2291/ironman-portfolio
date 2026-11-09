const KEY = 'stark:intro'

export const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** The intro is skipped for the rest of the session once it has played or been skipped. */
export function introSeen(): boolean {
  if (prefersReducedMotion()) return true
  try {
    return sessionStorage.getItem(KEY) === 'done'
  } catch {
    return false
  }
}

export function rememberIntro(done: boolean) {
  try {
    if (done) sessionStorage.setItem(KEY, 'done')
    else sessionStorage.removeItem(KEY)
  } catch {
    /* storage unavailable */
  }
}
