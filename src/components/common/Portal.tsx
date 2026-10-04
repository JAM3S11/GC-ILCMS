import React from 'react';
import { createPortal } from 'react-dom';

/**
 * Renders children straight into <body>, outside the page layout. Pop-ups and full-screen views use
 * it so they sit above the whole app, including the top header bar, instead of being trapped inside
 * the page content's stacking context where the header would paint over them.
 */
export const Portal: React.FC<{ children: React.ReactNode }> = ({ children }) =>
  typeof document === 'undefined' ? null : createPortal(children, document.body);
