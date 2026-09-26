import React, { useState } from 'react';
import { Activity, CheckCircle2, AlertCircle, Info, Sparkles } from 'lucide-react';
import { UVVisResult } from '../../types';

interface UVVisViewerProps {
  uvVisResult: UVVisResult;
}

export const UVVisViewer: React.FC<UVVisViewerProps> = ({ uvVisResult }) => {
  const svgWidth = 720;
  const svgHeight = 220;
  const padding = { left: 55, right: 25, top: 25, bottom: 35 };

  const minWl = 200;
  const maxWl = 350;
  const maxAbs = 1.6;

  const getX = (wl: number) => {
    return (
      padding.left +
      ((wl - minWl) / (maxWl - minWl)) * (svgWidth - padding.left - padding.right)
    );
  };

  const getY = (val: number) => {
    return (
      svgHeight -
      padding.bottom -
      (val / maxAbs) * (svgHeight - padding.top - padding.bottom)
    );
  };

  const points = uvVisResult.spectrumData.filter(
    (d) => d.wavelength >= minWl && d.wavelength <= maxWl
  );

  const pathD = points.reduce((acc, curr, idx) => {
    const x = getX(curr.wavelength);
    const y = getY(curr.absorbance);
    return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  return (
    <div className="space-y-6">
      {/* Distinction Header */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
        <div className="flex items-center gap-2 font-mono text-sky-400 font-bold uppercase tracking-wider text-[11px]">
          <Activity className="w-4 h-4 text-sky-400" />
          <span>SWGDRUG Category B Technique: Ultraviolet-Visible Spectrophotometry</span>
        </div>
        <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
          Provides confirmatory chromophore absorbance profiling. Combined with Category A (GC-MS) data, this satisfies international SWGDRUG forensic identification guidelines.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-[11px] font-mono text-center">
          <div className="p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
            <span className="text-[9px] text-slate-500 dark:text-slate-400 block">MEASURED RESULT</span>
            <strong>λmax 233 nm, 274 nm</strong>
          </div>
          <div className="p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
            <span className="text-[9px] text-slate-500 dark:text-slate-400 block">REFERENCE PROFILE</span>
            <strong>Cocaine HCl Standard</strong>
          </div>
          <div className="p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-emerald-300">
            <span className="text-[9px] text-slate-500 dark:text-slate-400 block">COMPARISON MATCH</span>
            <strong>CONCORDANT</strong>
          </div>
          <div className="p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-amber-300">
            <span className="text-[9px] text-slate-500 dark:text-slate-400 block">INTERPRETATION</span>
            <strong>Cocaine Hydrochloride</strong>
          </div>
        </div>
      </div>

      {/* Spectrum Chart */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 font-bold">
                RUN: {uvVisResult.runId}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                Instrument: {uvVisResult.instrumentId} • Solvent: {uvVisResult.solvent}
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-1">
              UV-Vis Absorbance Spectrum Scan (200 - 350 nm)
            </h3>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Baseline Corrected
            </span>
          </div>
        </div>

        <div className="relative bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 p-2 overflow-x-auto">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-auto select-none"
            style={{ minWidth: '600px' }}
          >
            {/* Horizontal Grid */}
            {[0, 0.4, 0.8, 1.2, 1.6].map((val) => (
              <g key={val}>
                <line
                  x1={padding.left}
                  y1={getY(val)}
                  x2={svgWidth - padding.right}
                  y2={getY(val)}
                  stroke="#1e293b"
                  strokeDasharray="3 3"
                />
                <text
                  x={padding.left - 8}
                  y={getY(val) + 3}
                  textAnchor="end"
                  fill="#64748b"
                  fontSize="9"
                  fontFamily="monospace"
                >
                  {val.toFixed(1)}
                </text>
              </g>
            ))}

            {/* Vertical Wavelength Ticks */}
            {[200, 225, 250, 275, 300, 325, 350].map((wl) => (
              <g key={wl}>
                <line
                  x1={getX(wl)}
                  y1={padding.top}
                  x2={getX(wl)}
                  y2={svgHeight - padding.bottom}
                  stroke="#1e293b"
                  strokeDasharray="2 2"
                />
                <text
                  x={getX(wl)}
                  y={svgHeight - padding.bottom + 15}
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  {wl} nm
                </text>
              </g>
            ))}

            {/* UV Spectrum Path */}
            <path d={pathD} fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />

            {/* Peak Annotations */}
            {uvVisResult.absorbancePeaks.map((peak, idx) => {
              const px = getX(peak.wavelength);
              const py = getY(peak.absorbance);
              return (
                <g key={idx}>
                  <circle cx={px} cy={py} r="4" fill="#38bdf8" stroke="#0f172a" strokeWidth="1.5" />
                  <rect
                    x={px - 34}
                    y={py - 22}
                    width="68"
                    height="16"
                    rx="3"
                    fill="#0369a1"
                    stroke="#38bdf8"
                  />
                  <text
                    x={px}
                    y={py - 11}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="9"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    λ {peak.wavelength} nm
                  </text>
                </g>
              );
            })}

            {/* Y axis title */}
            <text
              x={15}
              y={svgHeight / 2}
              transform={`rotate(-90 15 ${svgHeight / 2})`}
              textAnchor="middle"
              fill="#64748b"
              fontSize="9"
              fontFamily="monospace"
            >
              Absorbance (A)
            </text>

            {/* X axis title */}
            <text
              x={svgWidth / 2}
              y={svgHeight - 6}
              textAnchor="middle"
              fill="#64748b"
              fontSize="9"
              fontFamily="monospace"
            >
              Wavelength λ (nm)
            </text>
          </svg>
        </div>

        {/* Comparison table */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
            <span className="font-semibold text-slate-900 dark:text-white block">Measured Absorbance Maxima:</span>
            <ul className="space-y-1 font-mono text-slate-600 dark:text-slate-300 text-[11px]">
              <li>• Primary Band: 233 nm (Absorbance: 1.452 A)</li>
              <li>• Secondary Shoulder: 274 nm (Absorbance: 0.684 A)</li>
            </ul>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
            <span className="font-semibold text-slate-900 dark:text-white block">Certified Reference Concordance:</span>
            <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed font-sans">
              {uvVisResult.referenceComparison}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
