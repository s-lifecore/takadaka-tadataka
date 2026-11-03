import { useCallback, useEffect, useRef, useState } from 'react'

export function useTimer(initialSeconds: number) {
  const [remaining, setRemaining] = useState(initialSeconds)
  const [running, setRunning] = useState(false)
  const endAtRef = useRef<number | null>(null)
  const remainingMsRef = useRef(initialSeconds * 1000)

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

    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          setRunning(false)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [running])

  const expired = remaining === 0

  return { remaining, running, expired, start, stop, reset }
}
