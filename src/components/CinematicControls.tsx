import { useEffect, useState, useSyncExternalStore } from 'react'
import { Clapperboard, Square } from 'lucide-react'
import { bus, cancelCinematic, getStatus, playCinematic, playReel, subscribeStatus } from '../three/bus'
import { MOVE_LABEL, REEL, type CinematicMove } from '../three/cinematic'
import { getPhase, subscribePhase } from '../three/director'

/**
 * Cinematic reel controls: play the whole sequence or any single move.
 * Shown only with the full-body hero shot, and only when the 3D scene is live.
 */
export default function CinematicControls() {
  const status = useSyncExternalStore(subscribeStatus, getStatus)
  const phase = useSyncExternalStore(subscribePhase, getPhase)
  const [playing, setPlaying] = useState<CinematicMove | null>(bus.cinematic)

  useEffect(() => {
    bus.cinematicListeners.add(setPlaying)
    return () => {
      bus.cinematicListeners.delete(setPlaying)
    }
  }, [])

  // leaving the full-body hero shot ends the cinematic so it never plays out of frame
  useEffect(() => {
    if (phase !== 2) cancelCinematic()
  }, [phase])

  if (status !== 'ready' || phase !== 2) return null

  return (
    <div className="scene-dock cine-dock">
      <p className="scene-hint" aria-live="polite">
        {playing ? `CINEMATIC // ${MOVE_LABEL[playing]}` : 'STARK CINEMATICS'}
      </p>
      <div className="scene-controls" role="group" aria-label="Cinematic suit sequences">
        <button type="button" className="chip" aria-pressed={playing !== null} onClick={() => (playing ? cancelCinematic() : playReel())}>
          {playing ? <Square size={14} aria-hidden /> : <Clapperboard size={14} aria-hidden />}
          {playing ? 'STOP' : 'PLAY FULL REEL'}
        </button>
        {REEL.map((m) => (
          <button key={m} type="button" className="chip" aria-pressed={playing === m} onClick={() => playCinematic(m)}>
            {MOVE_LABEL[m]}
          </button>
        ))}
      </div>
    </div>
  )
}
