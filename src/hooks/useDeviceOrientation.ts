import { useCallback, useEffect, useRef, useState } from 'react'

type MotionConstructor = typeof DeviceMotionEvent & {
  requestPermission?: () => Promise<'granted' | 'denied'>
}

type Status = 'unsupported' | 'permission-required' | 'listening' | 'denied' | 'error'
const MOVING_ACCELERATION = 3 // m/s²。重力を除いた3軸の合成加速度。
const STATIONARY_DURATION_MS = 3000
const SENSOR_TIMEOUT_MS = 2000
const ACTIVATION_TIMEOUT_MS = 5000
let permissionStatus: Status | null = null
let pendingPermission: Promise<Status> | null = null

// 開始ボタンのクリック内から、awaitより前にブラウザの許可要求を実行する。
export function prepareMotionPermission(): Promise<Status> {
  if (pendingPermission) return pendingPermission
  if (!window.isSecureContext || typeof DeviceMotionEvent === 'undefined')
    return Promise.resolve('unsupported')
  const request = (DeviceMotionEvent as MotionConstructor).requestPermission
  if (!request) return Promise.resolve('listening')
  let timeout: ReturnType<typeof setTimeout>
  try {
    const permission = request.call(DeviceMotionEvent).then(
      (result): Status => (result === 'granted' ? 'listening' : 'denied'),
      (): Status => 'error',
    )
    pendingPermission = Promise.race([
      permission,
      new Promise<Status>((resolve) => {
        timeout = setTimeout(() => resolve('error'), ACTIVATION_TIMEOUT_MS)
      }),
    ])
  } catch {
    pendingPermission = Promise.resolve('error')
  }
  pendingPermission = pendingPermission.then((status) => {
    clearTimeout(timeout)
    permissionStatus = status
    pendingPermission = null
    return status
  })
  return pendingPermission
}

function initialStatus(): Status {
  if (!window.isSecureContext || typeof DeviceMotionEvent === 'undefined') return 'unsupported'
  return (
    permissionStatus ??
    ((DeviceMotionEvent as MotionConstructor).requestPermission
      ? 'permission-required'
      : 'listening')
  )
}

// 呼び出し名は維持するが、地図の表示制御には角度ではなく加速度を使う。
export function useDeviceOrientation() {
  const [isShaking, setIsShaking] = useState(false)
  const [isStationary, setIsStationary] = useState(false)
  const [status, setStatus] = useState<Status>(initialStatus)
  const [isRequesting, setIsRequesting] = useState(false)
  const [hasSample, setHasSample] = useState(false)
  const requestingRef = useRef(false)

  const requestPermission = useCallback(async () => {
    if (requestingRef.current) return
    requestingRef.current = true
    setIsRequesting(true)
    setHasSample(false)
    const result = await prepareMotionPermission()
    setIsStationary(false)
    setIsShaking(false)
    setStatus(result)
    setIsRequesting(false)
    requestingRef.current = false
  }, [])

  useEffect(() => {
    if (status === 'permission-required') void requestPermission()
  }, [status, requestPermission])

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

    function handleSensorTimeout() {
      resetStationary()
      setHasSample(false)
      if (document.visibilityState === 'visible') setStatus('error')
    }

    function handleVisibilityChange() {
      resetStationary()
      setHasSample(false)
      if (timeout !== null) clearTimeout(timeout)
      if (document.visibilityState === 'visible')
        timeout = setTimeout(handleSensorTimeout, ACTIVATION_TIMEOUT_MS)
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
      setHasSample(true)
      if (timeout !== null) clearTimeout(timeout)
      // 通知が途絶えただけでは、止まったことにしない。
      timeout = setTimeout(handleSensorTimeout, SENSOR_TIMEOUT_MS)

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
    handleVisibilityChange()
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      window.removeEventListener('devicemotion', handleMotion)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (timeout !== null) clearTimeout(timeout)
    }
  }, [status])

  return {
    isShaking,
    isStationary,
    status,
    isRequesting,
    requestPermission,
    isReady: status === 'listening' && hasSample && !isRequesting,
  }
}
