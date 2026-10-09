import { OfficerVisitor } from '../../types';

/* Time helpers for reception visits. Visits store an ISO `date` and 12-hour
   clock times ("09:42 AM") for `timeIn` / `timeOut`. */

/** Clients waiting at reception longer than this are flagged (service charter). */
export const WAIT_LIMIT_MINUTES = 30;

/** Office hours, 08:00–17:00, in minutes after midnight. */
export const OFFICE_OPEN_MINUTES = 8 * 60;
export const OFFICE_CLOSE_MINUTES = 17 * 60;

/** Minutes after midnight as a 12-hour clock time, e.g. 1022 → "05:02 PM". */
export const formatClock = (minutes: number) => {
  const hours = Math.floor(minutes / 60) % 24;
  return `${String(hours % 12 || 12).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')} ${hours < 12 ? 'AM' : 'PM'}`;
};

/** Today (offset 0) or another day as YYYY-MM-DD, in local time. */
export const isoDay = (offset = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

/** "09:42 AM" → minutes after midnight. */
export const clockMinutes = (value?: string) => {
  const match = value?.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 1 || hours > 12 || minutes > 59) return null;
  return ((hours % 12) + (match[3].toUpperCase() === 'PM' ? 12 : 0)) * 60 + minutes;
};

/** "HH:MM" (from an <input type="time">) → minutes after midnight. */
export const inputTimeMinutes = (value: string) => {
  const match = value.match(/^(\d{2}):(\d{2})$/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
};

export function getDurationInMinutes(timeIn: string, timeOut?: string): number | null {
  if (!timeOut) return null;
  const start = clockMinutes(timeIn);
  const end = clockMinutes(timeOut);
  if (start === null || end === null) return null;
  const duration = end >= start ? end - start : end + 24 * 60 - start;
  return duration > 0 ? duration : null;
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours === 0) return `${remainingMinutes}m`;
  return `${hours}h ${remainingMinutes}m`;
}

export const nowMinutes = () => {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
};

/** How long the client has been (or was) on the premises, in minutes; null when unknown. */
export const minutesOnSite = (visitor: OfficerVisitor, now: number, today: string) => {
  if (visitor.status === 'Departed') return getDurationInMinutes(visitor.timeIn, visitor.timeOut);
  if (visitor.date !== today) return null;
  const start = clockMinutes(visitor.timeIn);
  return start === null ? null : Math.max(0, now - start);
};

export const formatDay = (iso: string, style: 'long' | 'short' = 'long') => {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(
    'en-GB',
    style === 'long' ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' } : { day: 'numeric', month: 'short', year: 'numeric' },
  );
};
