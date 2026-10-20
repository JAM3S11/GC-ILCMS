import { useEffect, useState } from 'react';

/* ---------------------------------------------------------------------------
 * Per-user appearance preferences beyond light/dark: the accent colour, how
 * dense the sidebar and the list tables are, and whether animations are reduced. They are
 * applied as data attributes on <html>; index.css re-points the accent ramp
 * (`--gc-amber-*`) and adjusts density and motion from those attributes.
 * --------------------------------------------------------------------------- */

export type AccentColor = 'turquoise' | 'blue' | 'indigo' | 'violet' | 'rose' | 'graphite';
export type Density = 'comfortable' | 'compact';
export type MotionPreference = 'system' | 'reduce';
export type AvatarColor = 'slate' | 'teal' | 'blue' | 'violet' | 'rose' | 'amber' | 'emerald';

export interface AppearancePreferences {
  accent: AccentColor;
  sidebarDensity: Density;
  listDensity: Density;
  motion: MotionPreference;
  avatarColor: AvatarColor;
}

export const DEFAULT_APPEARANCE: AppearancePreferences = {
  accent: 'turquoise',
  sidebarDensity: 'comfortable',
  listDensity: 'comfortable',
  motion: 'system',
  avatarColor: 'slate',
};

/** `swatch` is the colour shown in the picker; the full ramps live in index.css. */
export const ACCENT_OPTIONS: { value: AccentColor; label: string; swatch: string }[] = [
  { value: 'turquoise', label: 'GC turquoise', swatch: '#14b8a6' },
  { value: 'blue', label: 'Blue', swatch: '#3b82f6' },
  { value: 'indigo', label: 'Indigo', swatch: '#6366f1' },
  { value: 'violet', label: 'Violet', swatch: '#8b5cf6' },
  { value: 'rose', label: 'Rose', swatch: '#ec4899' },
  { value: 'graphite', label: 'Graphite', swatch: '#475569' },
];

/** Fill behind your initials in the sidebar and profile menu; index.css maps `data-avatar` to `--gc-avatar`. */
export const AVATAR_OPTIONS: { value: AvatarColor; label: string; swatch: string }[] = [
  { value: 'slate', label: 'Slate', swatch: '#1e293b' },
  { value: 'teal', label: 'Teal', swatch: '#0f766e' },
  { value: 'blue', label: 'Blue', swatch: '#2563eb' },
  { value: 'violet', label: 'Violet', swatch: '#7c3aed' },
  { value: 'rose', label: 'Rose', swatch: '#e11d48' },
  { value: 'amber', label: 'Amber', swatch: '#b45309' },
  { value: 'emerald', label: 'Emerald', swatch: '#047857' },
];

export const isAvatarColor = (value: unknown): value is AvatarColor =>
  AVATAR_OPTIONS.some((option) => option.value === value);
export const isAccentColor = (value: unknown): value is AccentColor =>
  ACCENT_OPTIONS.some((option) => option.value === value);
export const isDensity = (value: unknown): value is Density => value === 'comfortable' || value === 'compact';
export const isMotionPreference = (value: unknown): value is MotionPreference => value === 'system' || value === 'reduce';

const CHANGE_EVENT = 'gc-appearance-change';

const setAttribute = (name: string, value: string | null) => {
  const root = document.documentElement;
  if (value === null) root.removeAttribute(name);
  else root.setAttribute(name, value);
};

/** Paints the preferences onto <html>. Defaults remove the attribute, so the stylesheet's base rules apply. */
export const applyAppearance = (preferences: AppearancePreferences) => {
  setAttribute('data-accent', preferences.accent === DEFAULT_APPEARANCE.accent ? null : preferences.accent);
  setAttribute('data-sidebar-density', preferences.sidebarDensity === DEFAULT_APPEARANCE.sidebarDensity ? null : preferences.sidebarDensity);
  setAttribute('data-density', preferences.listDensity === DEFAULT_APPEARANCE.listDensity ? null : preferences.listDensity);
  setAttribute('data-motion', preferences.motion === DEFAULT_APPEARANCE.motion ? null : preferences.motion);
  setAttribute('data-avatar', preferences.avatarColor === DEFAULT_APPEARANCE.avatarColor ? null : preferences.avatarColor);
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
};

/** Back to the defaults, e.g. when nobody is signed in. */
export const clearAppearance = () => applyAppearance(DEFAULT_APPEARANCE);

const readMotion = (): MotionPreference =>
  typeof document !== 'undefined' && document.documentElement.getAttribute('data-motion') === 'reduce' ? 'reduce' : 'system';

/** The motion preference currently applied, kept up to date as the user changes it. */
export const useMotionPreference = (): MotionPreference => {
  const [motion, setMotion] = useState<MotionPreference>(readMotion);
  useEffect(() => {
    const onChange = () => setMotion(readMotion());
    window.addEventListener(CHANGE_EVENT, onChange);
    return () => window.removeEventListener(CHANGE_EVENT, onChange);
  }, []);
  return motion;
};
