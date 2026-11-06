import { useCallback, useEffect, useRef, useState } from 'react'

export type TimerSnapshot = { remainingMs: number; endAt: number | null }

export function useTimer(initialSeconds: number, initialSnapshot?: TimerSnapshot) {
  const initialMs = initialSnapshot
    ? Math.max(
        0,
        initialSnapshot.endAt === null
          ? initialSnapshot.remainingMs
          : initialSnapshot.endAt - Date.now(),
      )
    : initialSeconds * 1000
  const [remaining, setRemaining] = useState(Math.ceil(initialMs / 1000))
  const [running, setRunning] = useState(false)
  const endAtRef = useRef<number | null>(null)
  const remainingMsRef = useRef(initialMs)

  const getSnapshot = useCallback(
    (): TimerSnapshot => ({
      remainingMs:
        endAtRef.current === null
          ? remainingMsRef.current
          : Math.max(0, endAtRef.current - Date.now()),
      endAt: endAtRef.current,
    }),
    [],
  )

  const start = useCallback(() => {
    if (endAtRef.current !== null || remainingMsRef.current <= 0) return
    endAtRef.current = Date.now() + remainingMsRef.current
    setRunning(true)
  }, [])

  const stop = useCallback(() => {
    if (endAtRef.current !== null) {
      remainingMsRef.current = Math.max(0, endAtRef.current - Date.now())
      endAtRef.current = null
      setRemaining(Math.ceil(remainingMsRef.current / 1000))
    }
    setRunning(false)
  }, [])

  const reset = useCallback(() => {
    endAtRef.current = null
    remainingMsRef.current = initialSeconds * 1000
    setRunning(false)
    setRemaining(initialSeconds)
  }, [initialSeconds])

  useEffect(() => {
    if (!running) return

    const updateRemaining = () => {
      if (endAtRef.current === null) return
      const remainingMs = Math.max(0, endAtRef.current - Date.now())
      remainingMsRef.current = remainingMs
      setRemaining(Math.ceil(remainingMs / 1000))
      if (remainingMs === 0) {
        endAtRef.current = null
        setRunning(false)
      }
    }

    const interval = setInterval(updateRemaining, 1000)
    document.addEventListener('visibilitychange', updateRemaining)
    window.addEventListener('pageshow', updateRemaining)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', updateRemaining)
      window.removeEventListener('pageshow', updateRemaining)
    }
  }, [running])

  const expired = remaining === 0

  return { remaining, running, expired, start, stop, reset, getSnapshot }
}
