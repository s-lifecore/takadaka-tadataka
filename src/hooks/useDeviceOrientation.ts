import { useCallback, useEffect, useState } from 'react'

type MotionConstructor = typeof DeviceMotionEvent & {
  requestPermission?: () => Promise<'granted' | 'denied'>
}

type Status = 'unsupported' | 'permission-required' | 'listening' | 'denied' | 'error'
const MOVING_ACCELERATION = 3 // m/s²。重力を除いた3軸の合成加速度。
const STATIONARY_DURATION_MS = 3000
const SENSOR_TIMEOUT_MS = 2000

function initialStatus(): Status {
  if (!window.isSecureContext || typeof DeviceMotionEvent === 'undefined') return 'unsupported'
  return (DeviceMotionEvent as MotionConstructor).requestPermission
    ? 'permission-required'
    : 'listening'
}

// 呼び出し名は維持するが、地図の表示制御には角度ではなく加速度を使う。
export function useDeviceOrientation() {
  const [isShaking, setIsShaking] = useState(false)
  const [isStationary, setIsStationary] = useState(false)
  const [status, setStatus] = useState<Status>(initialStatus)
  const [isRequesting, setIsRequesting] = useState(false)

  useEffect(() => {
    if (status !== 'listening') return
    let previousGravity: { x: number; y: number; z: number } | null = null
    let quietSince: number | null = null
    let lastSampleTime: number | null = null
    let timeout: ReturnType<typeof setTimeout> | null = null

    function resetStationary() {
      quietSince = null
      lastSampleTime = null
      previousGravity = null
      setIsStationary(false)
    }

    function handleMotion(event: DeviceMotionEvent) {
      if (document.visibilityState === 'hidden') return
      const acceleration = event.acceleration
      const hasAcceleration =
        acceleration &&
        [acceleration.x, acceleration.y, acceleration.z].every(
          (value) => value !== null && Number.isFinite(value),
        )
      const source = hasAcceleration ? acceleration : event.accelerationIncludingGravity
      if (
        !source ||
        source.x === null ||
        source.y === null ||
        source.z === null ||
        ![source.x, source.y, source.z].every(Number.isFinite) ||
        !Number.isFinite(event.timeStamp)
      ) {
        resetStationary()
        return
      }
      const now = event.timeStamp
      if (lastSampleTime !== null) {
        if (now <= lastSampleTime) return
        if (now - lastSampleTime >= SENSOR_TIMEOUT_MS) resetStationary()
      }
      lastSampleTime = now
      if (timeout !== null) clearTimeout(timeout)
      // 通知が途絶えただけでは、止まったことにしない。
      timeout = setTimeout(resetStationary, SENSOR_TIMEOUT_MS)

      const vector = { x: source.x, y: source.y, z: source.z }
      let magnitude: number
      if (hasAcceleration) magnitude = Math.hypot(vector.x, vector.y, vector.z)
      else {
        // 重力込みの値しかない端末では、前回値との差で重力の定常成分を除く。
        const previous = previousGravity
        previousGravity = vector
        if (!previous) return
        magnitude = Math.hypot(vector.x - previous.x, vector.y - previous.y, vector.z - previous.z)
      }
      if (magnitude >= MOVING_ACCELERATION) {
        quietSince = null
        setIsShaking(true)
        setIsStationary(false)
      } else {
        quietSince ??= now
        if (now - quietSince >= STATIONARY_DURATION_MS) {
          setIsShaking(false)
          setIsStationary(true)
        }
      }
    }

    window.addEventListener('devicemotion', handleMotion)
    document.addEventListener('visibilitychange', resetStationary)
    return () => {
      window.removeEventListener('devicemotion', handleMotion)
      document.removeEventListener('visibilitychange', resetStationary)
      if (timeout !== null) clearTimeout(timeout)
    }
  }, [status])

  // iOSではユーザー操作から直接呼び出す。
  const requestPermission = useCallback(async () => {
    if (typeof DeviceMotionEvent === 'undefined' || !window.isSecureContext) {
      setStatus('unsupported')
      return
    }
    setIsRequesting(true)
    try {
      const request = (DeviceMotionEvent as MotionConstructor).requestPermission
      const result = request ? await request.call(DeviceMotionEvent) : 'granted'
      setIsStationary(false)
      setStatus(result === 'granted' ? 'listening' : 'denied')
    } catch {
      setStatus('error')
    } finally {
      setIsRequesting(false)
    }
  }, [])

  return { isShaking, isStationary, status, isRequesting, requestPermission }
}
