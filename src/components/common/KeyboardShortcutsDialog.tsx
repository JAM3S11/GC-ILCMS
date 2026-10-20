import React from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { Keyboard, X } from 'lucide-react';
import { Kbd, isMacPlatform } from './GlobalSearchModal';

/* The shortcuts the app already supports, opened from the profile menu or with "?". */

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsDialog: React.FC<KeyboardShortcutsDialogProps> = ({ open, onClose }) => {
  const mod = isMacPlatform() ? '⌘' : 'Ctrl';
  const groups: { title: string; items: { keys: string[]; label: string }[] }[] = [
    {
      title: 'Anywhere',
      items: [
        { keys: [mod, 'K'], label: 'Search cases, exhibits and pages' },
        { keys: [mod, 'B'], label: 'Show or hide the sidebar' },
        { keys: ['?'], label: 'Show these shortcuts' },
      ],
    },
    {
      title: 'In a case file',
      items: [
        { keys: [']'], label: 'Next document' },
        { keys: ['['], label: 'Previous document' },        { keys: ['Esc'], label: 'Back to the register' },
      ],
    },
  ];

  return (
    <Dialog open={open} onClose={onClose} className="relative z-[60]">
      <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-[1px]" aria-hidden="true" />
      <div className="fixed inset-0 flex items-start justify-center overflow-y-auto p-4 pt-[12vh]">
        <DialogPanel className="w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3.5 dark:border-slate-800">
            <DialogTitle className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
              <Keyboard className="h-4 w-4 text-slate-400" /> Keyboard shortcuts
            </DialogTitle>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-5 px-5 py-4">
            {groups.map((group) => (
              <section key={group.title}>
                <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">{group.title}</h3>
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {group.items.map((item) => (
                    <li key={item.label} className="flex items-center justify-between gap-3 py-2 text-[13px] text-slate-700 dark:text-slate-200">
                      <span>{item.label}</span>
                      <span className="flex shrink-0 items-center gap-1">
                        {item.keys.map((key) => <Kbd key={key}>{key}</Kbd>)}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
};
