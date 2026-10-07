import React, { useEffect, useState } from 'react';
import { CheckCircle2, Send } from 'lucide-react';
import { OfficerVisitor } from '../../types';
import { Button } from '../common/Dashboard';
import { Portal } from '../common/Portal';

interface IntakeHandoverDialogProps {
  visitor: OfficerVisitor;
  /** Tells reception the visitor can be checked out; resolves true when sent. */
  onNotifyReception: (visitorId: string) => Promise<boolean>;
  onClose: () => void;
}

/**
 * Shown right after a lab officer registers a visitor's exhibit intake: the
 * visitor no longer needs to wait, so the officer can tell reception to check
 * them out and release them while the analysis continues in the laboratory.
 */
export const IntakeHandoverDialog: React.FC<IntakeHandoverDialogProps> = ({ visitor, onNotifyReception, onClose }) => {
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !sending) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, sending]);

  const send = async () => {
    setSending(true);
    try {
      if (await onNotifyReception(visitor.id)) onClose();
    } finally {
      setSending(false);
    }
  };

  return (
    <Portal>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="intake-handover-title"
        className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-sm"
      >
        <div className="w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start gap-3 px-5 py-5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 id="intake-handover-title" className="text-sm font-semibold text-slate-900 dark:text-white">
                Exhibit intake registered
              </h2>
              <p className="mt-1 text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">
                The intake for <span className="font-medium text-slate-900 dark:text-white">{visitor.officerName}</span>{' '}
                (<span className="font-mono">{visitor.visitNumber}</span>) is recorded. Let reception know the client can be
                checked out and go home while the analysis continues in the laboratory?
              </p>
            </div>
          </div>
          <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3.5 sm:flex-row sm:justify-end dark:border-slate-800 dark:bg-slate-950/40">
            <Button onClick={onClose} disabled={sending}>
              Not now
            </Button>
            <Button variant="primary" icon={Send} onClick={() => void send()} disabled={sending}>
              {sending ? 'Notifying…' : 'Notify reception — ready for checkout'}
            </Button>
          </div>
        </div>
      </div>
    </Portal>
  );
};
