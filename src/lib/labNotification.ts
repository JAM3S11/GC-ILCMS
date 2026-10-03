import { useEffect, useState } from 'react';

export const LAB_NOTIFICATION_RESEND_AFTER_MS = 60_000;

/** Seconds left before a lab notification may be resent (0 = allowed now). */
export function useResendCountdown(sentAt?: string | null): number {
  const [now, setNow] = useState(() => Date.now());
  const sentMs = sentAt ? Date.parse(sentAt) : NaN;
  const remainingMs = Number.isNaN(sentMs) ? 0 : sentMs + LAB_NOTIFICATION_RESEND_AFTER_MS - now;

  useEffect(() => {
    setNow(Date.now());
  }, [sentAt]);

  useEffect(() => {
    if (remainingMs <= 0) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [remainingMs > 0]);

  return Math.max(0, Math.ceil(remainingMs / 1000));
}
