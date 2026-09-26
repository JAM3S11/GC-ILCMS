/* Uniform refactor: route every view's hand-rolled intro band onto shared PageHeader.
 * Byte-exact band swaps; each fails loudly on mismatch. */
const fs = require('fs');

const R = 'src/components';
const OUT = { ok: [], fail: [] };

function patch(file, oldBand, newBand) {
  const p = `${R}/${file}`;
  let s = fs.readFileSync(p, 'utf8');
  const i = s.indexOf(oldBand);
  if (i < 0) throw new Error(`BAND NOT FOUND in ${file}`);
  s = s.slice(0, i) + newBand + s.slice(i + oldBand.length);

  // ensure PageHeader import
  if (!s.includes("import { PageHeader } from '../common/PageHeader'")) {
    const anchor = "from 'lucide-react';";
    const j = s.indexOf(anchor);
    if (j < 0) throw new Error(`NO lucide import anchor in ${file}`);
    const nl = s.indexOf('\n', j);
    const indent = s.slice(s.lastIndexOf('\n', j) + 1).match(/^[ \t]*/)[0];
    s = s.slice(0, nl + 1) + `${indent}import { PageHeader } from '../common/PageHeader';\n` + s.slice(nl + 1);
  }
  fs.writeFileSync(p, s);
  return file;
}

/* ---------------- ReferDatabaseView (reference) ---------------- */
patch(
  'reference/ReferenceDatabaseView.tsx',
  `      {/* Header Banner */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Database className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                Local Scientific Reference Database &amp; Spectral Decision Support
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Certified reference standards &amp; regional monographs for controlled substances and forensic reagents
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-emerald-400 font-mono text-xs flex items-center gap-1">
            <Database className="w-3.5 h-3.5" /> {SCIENTIFIC_REFERENCES.length} VERIFIED STANDARDS
          </span>
        </div>
      </div>`,
  `      <PageHeader
        icon={Database}
        eyebrow="GC-ILCMS / GO-K / REFERENCE"
        title="Local Scientific Reference Database &amp; Spectral Decision Support"
        subtitle="Certified reference standards &amp; regional monographs for controlled substances and forensic reagents — decision-support only, never auto-authored court certificates."
        accent="violet"
        actions={
          <span className="px-2.5 py-1 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-emerald-400 font-mono text-xs flex items-center gap-1">
            <Database className="w-3.5 h-3.5" /> {SCIENTIFIC_REFERENCES.length} VERIFIED STANDARDS
          </span>
        }
      />`
);

console.log(JSON.stringify({ ok: ['ReferenceDatabaseView'], fail: [] }, null, 2));
