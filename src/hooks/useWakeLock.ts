import { useCallback, useEffect, useRef, useState } from 'react'

type WakeLockStatus = 'idle' | 'requesting' | 'active' | 'unavailable' | 'released' | 'error'

export function useWakeLock() {
  const [status, setStatus] = useState<WakeLockStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const lockRef = useRef<WakeLockSentinel | null>(null)
  const wantedRef = useRef(false)
  const generationRef = useRef(0)
  const pendingRef = useRef<number | null>(null)

  const request = useCallback(async () => {
    if (
      !wantedRef.current ||
      document.visibilityState !== 'visible' ||
      (lockRef.current && !lockRef.current.released) ||
      pendingRef.current !== null
    )
      return

    if (!window.isSecureContext || !('wakeLock' in navigator)) {
      setStatus('unavailable')
      setError(
        !window.isSecureContext
          ? '自動消灯の防止にはHTTPSで開く必要があります。'
          : 'このブラウザでは自動消灯を防止できません。対応ブラウザで開いてください。',
      )
      return
    }

    const generation = generationRef.current
    pendingRef.current = generation
    setStatus('requesting')
    setError(null)
    try {
      const lock = await navigator.wakeLock.request('screen')
      // 終了後や古いセッションで取得できたロックは保持しない。
      if (
        !wantedRef.current ||
        generation !== generationRef.current ||
        document.visibilityState !== 'visible'
      ) {
        await lock.release()
        return
      }
      lockRef.current = lock
      const handleRelease = () => {
        if (lockRef.current !== lock) return
        lockRef.current = null
        setStatus('released')
      }
      lock.addEventListener('release', handleRelease, { once: true })
      if (lock.released) handleRelease()
      else setStatus('active')
    } catch (cause) {
      if (!wantedRef.current || generation !== generationRef.current) return
      setStatus('error')
      setError(
        cause instanceof Error
          ? `自動消灯の防止に失敗しました（${cause.name}: ${cause.message}）。`
          : '自動消灯の防止に失敗しました。',
      )
    } finally {
      if (pendingRef.current === generation) pendingRef.current = null
    }
  }, [])

  const acquire = useCallback(() => {
    wantedRef.current = true
    void request()
  }, [request])

  const suspend = useCallback(() => {
    generationRef.current += 1
    pendingRef.current = null
    const lock = lockRef.current
    lockRef.current = null
    if (lock) void lock.release().catch(() => {})
  }, [])

  const release = useCallback(() => {
    wantedRef.current = false
    suspend()
  }, [suspend])

  useEffect(() => {
    // バックグラウンド移行で解放されたロックを、復帰時に再取得する。
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void request()
      } else {
        // 取得待ちも無効化し、復帰後のリクエストが古いPromiseに阻まれないようにする。
        suspend()
        if (wantedRef.current) setStatus('released')
      }
    }
    const handlePageShow = () => void request()
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pageshow', handlePageShow)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pageshow', handlePageShow)
      release()
    }
  }, [request, release, suspend])

  return { acquire, release, status, error }
}
