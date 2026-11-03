import { useCallback, useEffect, useRef, useState } from 'react';
// 画面の法線と鉛直方向の角度。横持ちでも同じ基準で判定する。
const ENTER_ANGLE = 60;
const EXIT_ANGLE = 70;
export function useWalkingWarning(onWarningChange) {
    const [status, setStatus] = useState('idle');
    const [warning, setWarning] = useState(false);
    const warningRef = useRef(false);
    const callbackRef = useRef(onWarningChange);
    const timeoutRef = useRef(null);
    useEffect(() => { callbackRef.current = onWarningChange; }, [onWarningChange]);
    const handleOrientation = useCallback((event) => {
        const { beta, gamma } = event;
        if (beta === null || gamma === null || !Number.isFinite(beta) || !Number.isFinite(gamma))
            return;
        if (timeoutRef.current !== null)
            clearTimeout(timeoutRef.current);
        setStatus('active');
        const upward = Math.cos(beta * Math.PI / 180) * Math.cos(gamma * Math.PI / 180);
        const angle = Math.acos(Math.max(-1, Math.min(1, upward))) * 180 / Math.PI;
        const next = angle < (warningRef.current ? EXIT_ANGLE : ENTER_ANGLE);
        if (next !== warningRef.current) {
            warningRef.current = next;
            callbackRef.current(next);
            setWarning(next);
        }
    }, []);
    const listen = useCallback(() => {
        window.removeEventListener('deviceorientation', handleOrientation);
        window.addEventListener('deviceorientation', handleOrientation);
        setStatus('waiting');
        if (timeoutRef.current !== null)
            clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setStatus('unavailable'), 5000);
    }, [handleOrientation]);
    // iOSではクリックから直接呼び出す必要がある。
    const enable = useCallback(async () => {
        if (!window.isSecureContext || typeof DeviceOrientationEvent === 'undefined') {
            setStatus('unavailable');
            return;
        }
        try {
            const api = DeviceOrientationEvent;
            if (api.requestPermission && await api.requestPermission() !== 'granted') {
                setStatus('denied');
                return;
            }
            listen();
        }
        catch {
            setStatus('denied');
        }
    }, [listen]);
    useEffect(() => {
        if (!window.isSecureContext || typeof DeviceOrientationEvent === 'undefined') {
            setStatus('unavailable');
        }
        else if (!DeviceOrientationEvent.requestPermission) {
            listen();
        }
        return () => {
            window.removeEventListener('deviceorientation', handleOrientation);
            if (timeoutRef.current !== null)
                clearTimeout(timeoutRef.current);
        };
    }, [handleOrientation, listen]);
    return { warning, status, enable };
}
