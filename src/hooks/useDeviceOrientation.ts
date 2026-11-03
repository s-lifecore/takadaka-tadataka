import { useCallback, useEffect, useState } from 'react'

type OrientationConstructor = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<'granted' | 'denied'>
}

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
  const [status, setStatus] = useState<Status>(initialStatus)
  const [isRequesting, setIsRequesting] = useState(false)

  useEffect(() => {
    if (status !== 'listening') return

    function handleOrientation(event: DeviceOrientationEvent) {
      if (event.beta === null || !Number.isFinite(event.beta)) return
      setIsLooking(Math.abs(event.beta) < 30)
    }

    window.addEventListener('deviceorientation', handleOrientation)
    return () => window.removeEventListener('deviceorientation', handleOrientation)
  }, [status])

  // iOS requires this call to run directly from a user gesture.
  const requestPermission = useCallback(async () => {
    const request = (DeviceOrientationEvent as OrientationConstructor).requestPermission
    if (!request) return

    setIsRequesting(true)
    try {
      const result = await request.call(DeviceOrientationEvent)
      setStatus(result === 'granted' ? 'listening' : 'denied')
    } catch {
      setStatus('error')
    } finally {
      setIsRequesting(false)
    }
  }, [])

  return { isLooking, status, isRequesting, requestPermission }
}
