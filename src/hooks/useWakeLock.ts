import { useCallback, useEffect, useRef, useState } from 'react'

type WakeLockStatus = 'idle' | 'requesting' | 'active' | 'unavailable' | 'released' | 'error'
const ACTIVATION_TIMEOUT_MS = 5000

// Safariの初回取得はユーザー操作内で行う。許可の確認後は解放し、
// ゲーム画面のフックで保持する（開始前のキャンセルでもロックを残さない）。
export async function prepareWakeLockPermission(): Promise<void> {
  if (
    !window.isSecureContext ||
    !('wakeLock' in navigator) ||
    document.visibilityState !== 'visible'
  )
    return
  let timeout: ReturnType<typeof setTimeout> | undefined
  try {
    const preparation = navigator.wakeLock.request('screen').then((lock) => lock.release())
    await Promise.race([
      preparation,
      new Promise<void>((resolve) => {
        timeout = setTimeout(resolve, ACTIVATION_TIMEOUT_MS)
      }),
    ])
  } catch {
    // ここでは開始を妨げず、ゲーム画面で再取得した結果に応じて案内する。
  } finally {
    clearTimeout(timeout)
  }
}

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
    const timeout = setTimeout(() => {
      if (!wantedRef.current || generation !== generationRef.current) return
      generationRef.current += 1
      pendingRef.current = null
      setStatus('error')
      setError('自動消灯の防止を5秒以内に有効にできませんでした。再試行してください。')
    }, ACTIVATION_TIMEOUT_MS)
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
      clearTimeout(timeout)
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
      if (document.visibilityState === 'visible') void request()
      else {
        suspend()
        if (wantedRef.current) setStatus('released')
      }
    }
    const handlePageShow = () => void request()
    // 再読み込みでSafariの初回許可が失われても、次の通常操作で再取得する。
    // 合成イベントではユーザー操作の条件を満たせないため、実際の操作だけを扱う。
    const handleInteraction = (event: Event) => {
      if (!event.isTrusted) return
      if (event instanceof KeyboardEvent && (event.repeat || event.isComposing)) return
      void request()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pageshow', handlePageShow)
    document.addEventListener('pointerup', handleInteraction, { capture: true, passive: true })
    document.addEventListener('touchend', handleInteraction, { capture: true, passive: true })
    document.addEventListener('keydown', handleInteraction, { capture: true })
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pageshow', handlePageShow)
      document.removeEventListener('pointerup', handleInteraction, true)
      document.removeEventListener('touchend', handleInteraction, true)
      document.removeEventListener('keydown', handleInteraction, true)
      release()
    }
  }, [request, release, suspend])

  return { acquire, release, status, error }
}
