import React, { useState } from 'react';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Layers,
  Microscope,
  Search,
  Sparkles,
  Info,
  Sliders,
  Maximize2,
} from 'lucide-react';
import { GCMSResult, GCMSPeak } from '../../types';

interface GCMSViewerProps {
  gcmsResult: GCMSResult;
  onUpdatePeakInterpretation?: (peakNumber: number, interpretation: string) => void;
}

export const GCMSViewer: React.FC<GCMSViewerProps> = ({
  gcmsResult,
  onUpdatePeakInterpretation,
}) => {
  const [selectedPeakNumber, setSelectedPeakNumber] = useState<number>(3); // Cocaine peak by default
  const [zoomRange, setZoomRange] = useState<[number, number]>([4.0, 12.0]);
  const [hoveredPoint, setHoveredPoint] = useState<{ time: number; intensity: number } | null>(null);

  const selectedPeak = gcmsResult.peaks.find((p) => p.peakNumber === selectedPeakNumber) || gcmsResult.peaks[0];

  // SVG dimensions for chromatogram
  const svgWidth = 720;
  const svgHeight = 220;
  const padding = { left: 55, right: 25, top: 25, bottom: 35 };

  const minTime = 2.0;
  const maxTime = 14.0;
  const maxIntensity = 11000;

  const getX = (t: number) => {
    return (
      padding.left +
      ((t - minTime) / (maxTime - minTime)) * (svgWidth - padding.left - padding.right)
    );
  };

  const getY = (val: number) => {
    return (
      svgHeight -
      padding.bottom -
      (val / maxIntensity) * (svgHeight - padding.top - padding.bottom)
    );
  };

  // Generate path string
  const points = gcmsResult.rawChromatogramData.filter(
    (d) => d.time >= minTime && d.time <= maxTime
  );

  const pathD = points.reduce((acc, curr, idx) => {
    const x = getX(curr.time);
    const y = getY(curr.intensity);
    return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  // Fill area under curve
  const areaD = `${pathD} L ${getX(points[points.length - 1]?.time || maxTime)} ${getY(
    0
  )} L ${getX(points[0]?.time || minTime)} ${getY(0)} Z`;

  return (
    <div className="space-y-6">
      {/* MANDATORY SCIENTIFIC INTEGRITY DISTINCTION BANNER */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border-2 border-amber-500/40 space-y-2 text-xs">
        <div className="flex items-center gap-2 font-mono text-amber-400 font-bold uppercase tracking-wider text-[11px]">
          <AlertCircle className="w-4 h-4 text-amber-400" />
          <span>Forensic Scientific Principle: Mandatory Analytical Distinction</span>
        </div>
        <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
          The GC-ILCMS enforces a strict forensic separation of automated instrument observation from human scientific findings. Automated library matches represent candidate spectral similarities and <strong className="text-amber-300">do not constitute final identification</strong> until evaluated and verified by a gazetted Government Analyst.
        </p>

        {/* The 5 distinct steps bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 text-[11px] font-mono text-center">
          <div className="p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
            <span className="text-[9px] text-slate-500 dark:text-slate-400 block">STEP 1</span>
            <strong>INSTRUMENT OBSERVATION</strong>
          </div>
          <div className="p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sky-300">
            <span className="text-[9px] text-slate-500 dark:text-slate-400 block">STEP 2</span>
            <strong>LIBRARY MATCH</strong>
          </div>
          <div className="p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-purple-300">
            <span className="text-[9px] text-slate-500 dark:text-slate-400 block">STEP 3</span>
            <strong>SCIENTIFIC REFERENCE</strong>
          </div>
          <div className="p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-amber-300">
            <span className="text-[9px] text-slate-500 dark:text-slate-400 block">STEP 4</span>
            <strong>ANALYST INTERPRETATION</strong>
          </div>
          <div className="p-2 rounded bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 col-span-2 sm:col-span-1">
            <span className="text-[9px] text-emerald-400 block">STEP 5</span>
            <strong>FINAL FINDING</strong>
          </div>
        </div>
      </div>

      {/* CHROMATOGRAM VISUALIZER */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                RUN: {gcmsResult.runId}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                Instrument: {gcmsResult.instrumentId} ({gcmsResult.instrumentModel})
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-1">
              Total Ion Chromatogram (TIC) — Sample {gcmsResult.sampleId}
            </h3>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> QC: PASS (Nominal Drift)
            </span>
            <span className="text-slate-500 dark:text-slate-400">Method: {gcmsResult.method}</span>
          </div>
        </div>

        {/* SVG Chromatogram Chart */}
        <div className="relative bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 p-2 overflow-x-auto">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-auto select-none"
            style={{ minWidth: '600px' }}
          >
            {/* Grid lines */}
            {[0, 2500, 5000, 7500, 10000].map((val) => (
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
                  {val.toLocaleString()}
                </text>
              </g>
            ))}

            {/* X-axis time ticks */}
            {[2, 4, 6, 8, 10, 12, 14].map((t) => (
              <g key={t}>
                <line
                  x1={getX(t)}
                  y1={padding.top}
                  x2={getX(t)}
                  y2={svgHeight - padding.bottom}
                  stroke="#1e293b"
                  strokeDasharray="2 2"
                />
                <text
                  x={getX(t)}
                  y={svgHeight - padding.bottom + 15}
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  {t}.0 min
                </text>
              </g>
            ))}

            {/* Area under curve */}
            <path d={areaD} fill="url(#chromaGrad)" opacity="0.4" />

            {/* Main chromatogram curve */}
            <path d={pathD} fill="none" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round" />

            <defs>
              <linearGradient id="chromaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Peak Annotations */}
            {gcmsResult.peaks.map((peak) => {
              const px = getX(peak.retentionTime);
              const py = getY(peak.peakNumber === 3 ? 9950 : peak.peakNumber === 1 ? 3950 : 1600);
              const isSelected = peak.peakNumber === selectedPeakNumber;

              return (
                <g
                  key={peak.peakNumber}
                  className="cursor-pointer"
                  onClick={() => setSelectedPeakNumber(peak.peakNumber)}
                >
                  {/* Vertical drop line */}
                  <line
                    x1={px}
                    y1={py}
                    x2={px}
                    y2={svgHeight - padding.bottom}
                    stroke={isSelected ? '#38bdf8' : '#e2e8f0'}
                    strokeWidth={isSelected ? '1.5' : '1'}
                    strokeDasharray={isSelected ? 'none' : '2 2'}
                  />
                  {/* Indicator circle */}
                  <circle
                    cx={px}
                    cy={py}
                    r={isSelected ? 5 : 3.5}
                    fill={isSelected ? '#38bdf8' : '#f59e0b'}
                    stroke="#0f172a"
                    strokeWidth="1.5"
                  />
                  {/* Peak label */}
                  <rect
                    x={px - 32}
                    y={py - 22}
                    width="64"
                    height="16"
                    rx="3"
                    fill={isSelected ? '#0369a1' : '#1e293b'}
                    stroke={isSelected ? '#38bdf8' : '#475569'}
                  />
                  <text
                    x={px}
                    y={py - 11}
                    textAnchor="middle"
                    fill={isSelected ? '#ffffff' : '#f1f5f9'}
                    fontSize="9"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    RT {peak.retentionTime}
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
              Abundance / Intensity (counts)
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
              Retention Time (Minutes)
            </text>
          </svg>
        </div>
      </div>

      {/* DETECTED PEAKS & CANDIDATE MATCH TABLE */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Chromatographic Peaks &amp; Library Comparison</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select a peak to inspect mass fragmentation and candidate comparisons
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
            Total Resolved Peaks: 3 (Area Sum: 100.0%)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse table-fixed">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                <th className="py-2.5 px-3">Peak #</th>
                <th className="py-2.5 px-3">Retention Time</th>
                <th className="py-2.5 px-3">Peak Area</th>
                <th className="py-2.5 px-3">Area %</th>
                <th className="py-2.5 px-3">Library Candidate Match</th>
                <th className="py-2.5 px-3">CAS Number</th>
                <th className="py-2.5 px-3">Similarity</th>
                <th className="py-2.5 px-3">Confidence Label</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60 font-mono">
              {gcmsResult.peaks.map((peak) => (
                <tr
                  key={peak.peakNumber}
                  onClick={() => setSelectedPeakNumber(peak.peakNumber)}
                  className={`cursor-pointer transition-colors ${
                    peak.peakNumber === selectedPeakNumber
                      ? 'bg-amber-500/10 text-amber-200 font-medium'
                      : 'hover:bg-slate-100/40 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <td className="py-2.5 px-3 font-bold">
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
                      #{peak.peakNumber}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">{peak.retentionTime} min</td>
                  <td className="py-2.5 px-3">{peak.peakArea.toLocaleString()}</td>
                  <td className="py-2.5 px-3 font-bold">{peak.areaPercent}%</td>
                  <td className="py-2.5 px-3 font-sans font-medium text-slate-900 dark:text-slate-100">
                    <span className="block truncate" title={`${peak.detectedCompound} (RT ${peak.retentionTime} min)`}>
                      {peak.detectedCompound}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">
                    <span className="block truncate" title={peak.casNumber}>{peak.casNumber}</span>
                  </td>
                  <td className="py-2.5 px-3 text-emerald-400">{peak.matchScore}%</td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        peak.confidenceLevel === 'HIGH'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {peak.confidenceLevel}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-sans">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPeakNumber(peak.peakNumber);
                      }}
                      className="text-amber-400 hover:underline text-[11px]"
                    >
                      Inspect Candidate
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SELECTED PEAK SCIENTIFIC INSPECTION & ANALYST DECISION PANEL */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400">
              <Microscope className="w-4 h-4" />
            </span>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Peak #{selectedPeak.peakNumber} Candidate Evaluation — RT {selectedPeak.retentionTime} min
            </h4>
          </div>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            Selected Substance: {selectedPeak.detectedCompound}
          </span>
        </div>

        {/* Candidate Evaluation Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Left: Instrumental Data vs Library Match */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 uppercase font-semibold">
              Instrument Observation &amp; Mass Spectrometry
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Retention Time Observed:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{selectedPeak.retentionTime} min</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Relative Peak Area:</span>
                <span className="font-mono text-slate-900 dark:text-white">{selectedPeak.areaPercent}% of total ion count</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Characteristic Fragment Ions (m/z):</span>
                <span className="font-mono text-amber-300">
                  {selectedPeak.peakNumber === 3
                    ? 'm/z 82 (base peak), 182, 303, 105, 77'
                    : selectedPeak.peakNumber === 1
                    ? 'm/z 109 (base peak), 179, 137, 81'
                    : 'm/z 86 (base peak), 234, 120, 58'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Primary Library Reference:</span>
                <span className="text-slate-600 dark:text-slate-300">{selectedPeak.referenceLibrary}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Spectral Match Index:</span>
                <span className="font-mono text-emerald-400 font-bold">{selectedPeak.matchScore}%</span>
              </div>
            </div>
          </div>

          {/* Right: Local Relevance & Scientific Note */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="text-[11px] font-mono text-purple-400 uppercase font-semibold">
              Local Forensic Relevance &amp; Statutory Classification
            </div>
            <div className="text-slate-600 dark:text-slate-300 leading-relaxed space-y-2">
              <p>
                {selectedPeak.peakNumber === 3 && (
                  <>
                    <strong className="text-slate-900 dark:text-white">Cocaine (Benzoylmethylecgonine):</strong> Prohibited Narcotic Substance scheduled under Part I, First Schedule of the Narcotic Drugs and Psychotropic Substances (Control) Act No. 4 of 1994, Laws of Kenya.
                  </>
                )}
                {selectedPeak.peakNumber === 1 && (
                  <>
                    <strong className="text-slate-900 dark:text-white">Phenacetin:</strong> Analgesic agent withdrawn from clinical use; frequently utilized by illicit trafficking syndicates in East Africa as a cutting/diluting adulterant in cocaine powder.
                  </>
                )}
                {selectedPeak.peakNumber === 2 && (
                  <>
                    <strong className="text-slate-900 dark:text-white">Lidocaine:</strong> Synthetic amino-amide local anesthetic added as an adulterant to mimic the characteristic tongue/mucosal numbing effect of cocaine.
                  </>
                )}
              </p>
              <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-slate-600 dark:text-slate-300">Statutory Notice: </span>
                Presence of adulterants does not mitigate the legal threshold of the primary controlled narcotic.
              </div>
            </div>
          </div>
        </div>

        {/* Analyst Interpretation Box */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
            Analyst Scientific Interpretation for Peak #{selectedPeak.peakNumber} ({selectedPeak.detectedCompound})
          </label>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-200">
            <p className="italic text-amber-200 font-mono">
              "{selectedPeak.analystInterpretation || 'Awaiting formal recorded interpretation by analyst.'}"
            </p>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            This interpretation will be carried directly into Section 9 (Scientific Interpretation) and Section 10 (Findings) of the Draft Report without retyping.
          </p>
        </div>
      </div>
    </div>
  );
};
