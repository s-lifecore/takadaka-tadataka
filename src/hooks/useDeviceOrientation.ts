import { useCallback, useEffect, useState } from 'react'

type OrientationConstructor = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<'granted' | 'denied'>
}

type MotionConstructor = typeof DeviceMotionEvent & {
  requestPermission?: () => Promise<'granted' | 'denied'>
}

const SHAKE_ACCELERATION = 3 // m/s²
const SHAKE_HOLD_MS = 2000

type Status = 'unsupported' | 'permission-required' | 'listening' | 'denied' | 'error'

function initialStatus(): Status {
  if (!window.isSecureContext || typeof DeviceOrientationEvent === 'undefined') {
    return 'unsupported'
  }
  return (DeviceOrientationEvent as OrientationConstructor).requestPermission
    ? 'permission-required'
    : 'listening'
}

export function useDeviceOrientation() {
  const [isLooking, setIsLooking] = useState(false)
  const [isShaking, setIsShaking] = useState(false)
  const [motionAllowed, setMotionAllowed] = useState(
    () =>
      typeof DeviceMotionEvent !== 'undefined' &&
      !(DeviceMotionEvent as MotionConstructor).requestPermission,
  )
  const [hasOrientation, setHasOrientation] = useState(false)
  const [status, setStatus] = useState<Status>(initialStatus)
  const [isRequesting, setIsRequesting] = useState(false)

  useEffect(() => {
    if (status !== 'listening') return

    function handleOrientation(event: DeviceOrientationEvent) {
      const { beta, gamma } = event
      if (beta === null || gamma === null || !Number.isFinite(beta) || !Number.isFinite(gamma))
        return
      // 画面の法線と鉛直方向の角度。横持ちでも画面を起こした姿勢を検知する。
      const upward = Math.cos((beta * Math.PI) / 180) * Math.cos((gamma * Math.PI) / 180)
      const angle = (Math.acos(Math.max(-1, Math.min(1, upward))) * 180) / Math.PI
      setHasOrientation(true)
      setIsLooking(angle <= 80)
    }

    window.addEventListener('deviceorientation', handleOrientation)
    return () => window.removeEventListener('deviceorientation', handleOrientation)
  }, [status])

  useEffect(() => {
    if (status !== 'listening' || !motionAllowed) return
    let previousGravity: { x: number; y: number; z: number } | null = null
    let lastShake: number | null = null
    let timer: ReturnType<typeof setTimeout> | null = null
    function handleMotion(event: DeviceMotionEvent) {
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
        ![source.x, source.y, source.z].every(Number.isFinite)
      )
        return
      const vector = { x: source.x, y: source.y, z: source.z }
      let magnitude: number
      if (hasAcceleration) magnitude = Math.hypot(vector.x, vector.y, vector.z)
      else {
        const previous = previousGravity
        previousGravity = vector
        if (!previous) return
        magnitude = Math.hypot(vector.x - previous.x, vector.y - previous.y, vector.z - previous.z)
      }
      if (magnitude < SHAKE_ACCELERATION) return
      const now = event.timeStamp
      // 単発の振動では確定せず、1秒以内に2回検知したら歩行として扱う。
      if (lastShake !== null && now > lastShake && now - lastShake <= 1000) {
        setIsShaking(true)
        if (timer !== null) clearTimeout(timer)
        timer = setTimeout(() => {
          setIsShaking(false)
          lastShake = null
        }, SHAKE_HOLD_MS)
      }
      lastShake = now
    }
    window.addEventListener('devicemotion', handleMotion)
    return () => {
      window.removeEventListener('devicemotion', handleMotion)
      if (timer !== null) clearTimeout(timer)
    }
  }, [status, motionAllowed])

  // iOS requires this call to run directly from a user gesture.
  const requestPermission = useCallback(async () => {
    const request = (DeviceOrientationEvent as OrientationConstructor).requestPermission
    if (!request) return

    setIsRequesting(true)
    try {
      // 両方の許可要求をユーザー操作中に開始する（最初のawaitより前）。
      const orientationRequest = request.call(DeviceOrientationEvent)
      const motionRequest =
        typeof DeviceMotionEvent !== 'undefined'
          ? (DeviceMotionEvent as MotionConstructor).requestPermission
          : undefined
      const motionPromise = motionRequest
        ? motionRequest.call(DeviceMotionEvent).then(
            (result) => result === 'granted',
            () => false,
          )
        : Promise.resolve(typeof DeviceMotionEvent !== 'undefined')
      const [result, allowed] = await Promise.all([orientationRequest, motionPromise])
      setMotionAllowed(allowed)
      setStatus(result === 'granted' ? 'listening' : 'denied')
    } catch {
      setStatus('error')
    } finally {
      setIsRequesting(false)
    }
  }, [])

  return { isLooking, isShaking, hasOrientation, status, isRequesting, requestPermission }
}
