import React from 'react';
import { AlertCircle } from 'lucide-react';
import type { Transition } from 'motion/react';

/* Pieces shared by the landing page, the phone sign-in flow and the launch splash. */

export const EASE_OUT: Transition['ease'] = [0.22, 0.61, 0.36, 1];
/** One carousel slide; the phone sign-in drawer comes up after the same interval. */
export const SLIDE_MS = 5000;
export const TAB_SPRING: Transition = { type: 'spring', stiffness: 520, damping: 34 };

export type AuthMode = 'signin' | 'request' | 'activate' | 'forgot' | 'reset';

export type AuthCopy = { title: string; subtitle: string; switchPrompt: string; switchCta?: string; switchTo?: AuthMode };

export const FormError: React.FC<{ message: string }> = ({ message }) => (
  <p role="alert" className="flex items-center gap-1.5 text-[length:calc(12px*var(--lp-scale))] text-rose-600">
    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
    {message}
  </p>
);

export const SERIF_STACK = "'Montserrat', system-ui, -apple-system, 'Segoe UI', sans-serif";

export const PANEL_BACKGROUND =
  'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.08) 0%, transparent 55%),' +
  ' linear-gradient(165deg, #0b3a42 0%, #0d4a52 55%, #0f5860 100%)';

export const GUILLOCHE_PATTERN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='40'%3E" +
  "%3Cpath d='M0 20 Q15 2 30 20 T60 20 T90 20 T120 20' fill='none' stroke='white' stroke-opacity='0.06'/%3E" +
  "%3Cpath d='M0 20 Q15 38 30 20 T60 20 T90 20 T120 20' fill='none' stroke='white' stroke-opacity='0.06'/%3E" +
  '%3C/svg%3E")';

export const primaryBtnClass =
  'h-11 w-full cursor-pointer rounded-[8px] bg-[#5eead4] text-[length:calc(15px*var(--lp-scale))] font-bold sm:h-[38px] sm:text-[length:calc(13px*var(--lp-scale))] text-[#0b3a42] transition-colors hover:bg-[#2dd4bf] active:scale-[0.99]';
