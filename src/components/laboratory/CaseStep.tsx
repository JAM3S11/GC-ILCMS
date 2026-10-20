import React, { createContext, useContext, useState } from 'react';
import { Eye, EyeOff, LucideIcon } from 'lucide-react';
import { Tone } from '../common/Dashboard';
import { ScaledPage } from './a4Preview';
import { StatusText } from './workspace/ui';

export type CaseStepState = 'done' | 'current' | 'pending';

interface CaseStepProps {
  /** Anchor id; other documents switch to it with openCaseStep(id). */
  id: string;
  /** Kept for the reading order. */
  step?: number;
  icon: LucideIcon;
  title: string;
  /** What the document is for, shown under its title. */
  description?: React.ReactNode;
  status?: { label: string; tone: Tone };
  /** Kept for callers; the folder shows the state in its document list. */
  state?: CaseStepState;
  /** The live A4 page, shown beside the form on wide screens. */
  preview?: { content: React.ReactNode; pages?: number; /** The content scales itself to the width it is given. */ selfScaling?: boolean };
  /** Save / submit / approve buttons, kept in a bar that sticks to the bottom of the screen. */
  footer?: React.ReactNode;
  children: React.ReactNode;
}

const OPEN_EVENT = 'case-step:open';

/** Opens a case-file document (CaseFileLayout switches to it). */
export const openCaseStep = (id: string) => {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: id }));
};

/** Listens for openCaseStep calls. */
export const useCaseStepOpen = (onOpen: (id: string) => void) => {
  React.useEffect(() => {
    const listener = (event: Event) => onOpen((event as CustomEvent<string>).detail);
    window.addEventListener(OPEN_EVENT, listener);
    return () => window.removeEventListener(OPEN_EVENT, listener);
  }, [onOpen]);
};

/** The document the folder has open; outside a folder every step shows. */
export const CaseFolderContext = createContext<{ active: string | null }>({ active: null });

const PREVIEW_KEY = 'case-file:preview-hidden';
const readPreviewHidden = () => {
  try {
    return window.localStorage.getItem(PREVIEW_KEY) === '1';
  } catch {
    return false;
  }
};

/**
 * One document of a case file. Only the document the folder has open is shown;
 * the others stay mounted (hidden), so unsaved edits survive switching between
 * them and printing still finds every page.
 */
export const CaseStep: React.FC<CaseStepProps> = ({ id, icon: Icon, title, description, status, preview, footer, children }) => {
  const { active } = useContext(CaseFolderContext);
  const [previewHidden, setPreviewHidden] = useState(readPreviewHidden);
  const shown = active === null || active === id;
  const showPreview = !!preview && !previewHidden;

  const togglePreview = () => {
    setPreviewHidden((hidden) => {
      try {
        window.localStorage.setItem(PREVIEW_KEY, hidden ? '0' : '1');
      } catch {
        /* Storage blocked; the choice lasts for this page only. */
      }
      return !hidden;
    });
  };

  return (
    <section id={id} hidden={!shown} data-case-step className="min-w-0 rounded-xl border border-slate-200 dark:border-slate-800">
      <header className="flex flex-wrap items-start gap-x-4 gap-y-2 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold text-slate-900 dark:text-white">
            <Icon className="h-4 w-4 text-slate-400" aria-hidden="true" />
            {title}
          </h2>
          {description && <p className="mt-1 text-[12.5px] text-slate-500 dark:text-slate-400">{description}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {status && <StatusText tone={status.tone}>{status.label}</StatusText>}
          {preview && (
            <button
              type="button"
              onClick={togglePreview}
              className="hidden cursor-pointer items-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-xs text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-800 xl:inline-flex print:hidden dark:text-slate-400 dark:hover:border-slate-700 dark:hover:text-slate-100"
            >
              {previewHidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              {previewHidden ? 'Show preview' : 'Hide preview'}
            </button>
          )}
        </div>
      </header>

      <div className={showPreview ? 'xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]' : ''}>
        <div className="min-w-0">{children}</div>
        {showPreview && (
          <aside aria-label={`${title} A4 preview`} className="hidden border-l border-slate-200 xl:block print:hidden dark:border-slate-800">
            <div className="sticky top-0 max-h-[calc(100vh-8rem)] overflow-y-auto">
              {preview.selfScaling ? <div className="p-3">{preview.content}</div> : <ScaledPage pages={preview.pages}>{preview.content}</ScaledPage>}
            </div>
          </aside>
        )}
      </div>

      {footer && (
        <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-2 rounded-b-xl border-t border-slate-200 bg-white/95 px-5 py-3 backdrop-blur print:hidden dark:border-slate-800 dark:bg-slate-950/95">
          {footer}
        </div>
      )}
    </section>
  );
};
