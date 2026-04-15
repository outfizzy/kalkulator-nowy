import { useState, useEffect, useRef, useCallback } from 'react';

const IDLE_TIMEOUT = 15 * 60 * 1000; // 15 minutes
const WARNING_BEFORE = 2 * 60 * 1000; // Show warning 2 min before logout
const EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'] as const;
const THROTTLE_MS = 5000; // Throttle activity sensing to avoid excessive resets

/**
 * Hook that detects user inactivity and triggers auto-logout.
 * Shows a warning modal 2 minutes before the timeout.
 * 
 * Fixed issues from v1:
 * - Uses refs for showWarning check to avoid stale closures in event handlers
 * - Throttled activity handler to avoid excessive timer resets
 * - Warning state is ref-based to correctly block auto-dismiss during warning
 */
export function useIdleTimer(onLogout: () => void) {
    const [showWarning, setShowWarning] = useState(false);
    const [remainingSeconds, setRemainingSeconds] = useState(120);
    
    // Refs to avoid stale closures
    const showWarningRef = useRef(false);
    const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const throttleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const onLogoutRef = useRef(onLogout);
    
    // Keep onLogout ref fresh
    onLogoutRef.current = onLogout;

    const clearAllTimers = useCallback(() => {
        if (warningTimerRef.current) { clearTimeout(warningTimerRef.current); warningTimerRef.current = null; }
        if (logoutTimerRef.current) { clearTimeout(logoutTimerRef.current); logoutTimerRef.current = null; }
        if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
    }, []);

    const startTimers = useCallback(() => {
        clearAllTimers();
        showWarningRef.current = false;
        setShowWarning(false);

        // Warning fires 2 min before logout
        warningTimerRef.current = setTimeout(() => {
            showWarningRef.current = true;
            setShowWarning(true);
            setRemainingSeconds(Math.round(WARNING_BEFORE / 1000));

            // Countdown
            countdownRef.current = setInterval(() => {
                setRemainingSeconds(prev => {
                    if (prev <= 1) {
                        if (countdownRef.current) clearInterval(countdownRef.current);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }, IDLE_TIMEOUT - WARNING_BEFORE);

        // Actual logout
        logoutTimerRef.current = setTimeout(() => {
            clearAllTimers();
            showWarningRef.current = false;
            setShowWarning(false);
            onLogoutRef.current();
        }, IDLE_TIMEOUT);
    }, [clearAllTimers]);

    // "Stay logged in" button handler
    const stayActive = useCallback(() => {
        startTimers(); // Resets everything
    }, [startTimers]);

    useEffect(() => {
        const handleActivity = () => {
            // If throttled, skip
            if (throttleRef.current) return;

            // CRITICAL: If warning is showing, user must click "Stay" button.
            // Random mouse movement during warning should NOT reset the timer.
            if (showWarningRef.current) return;

            // Throttle: ignore events for next 5s
            throttleRef.current = setTimeout(() => {
                throttleRef.current = null;
            }, THROTTLE_MS);

            startTimers();
        };

        // Register listeners (passive for performance)
        for (const event of EVENTS) {
            window.addEventListener(event, handleActivity, { passive: true });
        }

        // Initial timer start
        startTimers();

        return () => {
            for (const event of EVENTS) {
                window.removeEventListener(event, handleActivity);
            }
            clearAllTimers();
            if (throttleRef.current) { clearTimeout(throttleRef.current); throttleRef.current = null; }
        };
    }, [startTimers, clearAllTimers]);

    return { showWarning, remainingSeconds, stayActive };
}
