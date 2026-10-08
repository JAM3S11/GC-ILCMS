import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Download, Printer, X } from 'lucide-react';
import { Button } from '../common/Dashboard';
import { Portal } from '../common/Portal';

/** A4 portrait at CSS 96 dpi. */
export const A4_WIDTH_PX = (210 / 25.4) * 96;
export const A4_HEIGHT_PX = (297 / 25.4) * 96;
export const MM_PX = 96 / 25.4;

/** Shrinks true-size A4 pages to the width available, keeping their proportions. */
export const ScaledPage: React.FC<{ children: React.ReactNode; pages?: number }> = ({ children, pages = 1 }) => {
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return undefined;
    const measure = () => setScale(Math.min(1, (frame.clientWidth - 24) / A4_WIDTH_PX));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);
  const gap = 16;
  return (
    <div ref={frameRef} className="w-full bg-slate-200 p-3 dark:bg-slate-950">
      <div
        className="mx-auto overflow-hidden"
        style={{ width: A4_WIDTH_PX * scale, height: (A4_HEIGHT_PX * pages + gap * (pages - 1)) * scale }}
      >
        <div
          className="flex flex-col"
          style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: A4_WIDTH_PX, gap }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

/** Pop-up live preview of one or more A4 pages, with Print and Download PDF. */
export const A4PreviewDialog: React.FC<{
  title: string;
  pages?: number;
  onClose: () => void;
  onPrint: () => void;
  onDownload: () => void;
  downloading: boolean;
  children: React.ReactNode;
}> = ({ title, pages = 1, onClose, onPrint, onDownload, downloading, children }) => {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" onClick={onClose}>
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="flex max-h-[95vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <span className="text-sm font-semibold text-slate-900 dark:text-white">
              {title}
              {pages > 1 && <span className="ml-2 font-normal text-slate-500 dark:text-slate-400">{pages} pages</span>}
            </span>
            <div className="flex items-center gap-2">
              <Button size="sm" icon={Printer} onClick={onPrint}>Print</Button>
              <Button size="sm" variant="primary" icon={Download} disabled={downloading} onClick={onDownload}>
                {downloading ? 'Preparing…' : 'Download PDF'}
              </Button>
              <button type="button" onClick={onClose} aria-label="Close preview" className="rounded-md p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="overflow-y-auto">
            <ScaledPage pages={pages}>{children}</ScaledPage>
          </div>
        </div>
      </div>
    </Portal>
  );
};

/** Prints only the element mounted with the matching target (see the print rules in index.css). */
export const usePrintTarget = (printing: boolean, target: string, onDone: () => void) => {
  useEffect(() => {
    if (!printing) return undefined;
    document.body.dataset.printTarget = target;
    window.addEventListener('afterprint', onDone);
    const timer = window.setTimeout(() => window.print(), 50);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('afterprint', onDone);
      if (document.body.dataset.printTarget === target) delete document.body.dataset.printTarget;
    };
  }, [printing, target, onDone]);
};

/** Renders each full-size A4 page element into one page of a PDF and saves it. */
export const downloadA4Pdf = async (pages: HTMLElement[], fileName: string) => {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  for (let index = 0; index < pages.length; index += 1) {
    const canvas = await html2canvas(pages[index], { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false });
    if (index > 0) pdf.addPage('a4', 'portrait');
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 210, 297);
  }
  pdf.save(fileName);
};
