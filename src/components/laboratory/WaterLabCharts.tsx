import React, { useMemo, useState } from 'react';
import { createTheme, ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { GaugeContainer, GaugeReferenceArc, GaugeValueArc, gaugeClasses, useGaugeState } from '@mui/x-charts/Gauge';
import { BarChart } from '@mui/x-charts/BarChart';
import { Eye, X } from 'lucide-react';
import { useTheme } from '../../theme/ThemeProvider';
import { Portal } from '../common/Portal';

/**
 * Calm, readable charts for the Water laboratory page. Both follow the app's light and
 * dark theme through a MUI theme that mirrors it, so axes, tooltips and labels never
 * turn into dark-on-dark text. Colours are fixed per entity, never per rank.
 */

// Five categorical hues, stepped separately for light and dark surfaces (checked with the
// dataviz palette validator). Values are always printed beside the swatches, so colour is
// never the only way to tell a slice apart.
const CATEGORICAL = {
  light: ['#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#f43f5e'],
  dark: ['#0284c7', '#059669', '#d97706', '#7c3aed', '#e11d48'],
};

const useChartTheme = () => {
  const { resolvedTheme } = useTheme();
  const theme = useMemo(
    () =>
      createTheme({
        palette: { mode: resolvedTheme },
        typography: { fontFamily: 'inherit', fontSize: 12 },
      }),
    [resolvedTheme],
  );
  return { resolvedTheme, theme };
};

/* ---------------------------- Officer workload ---------------------------- */

export interface OfficerWorkload {
  id: string;
  name: string;
  /** Exhibits under analysis right now. */
  active: number;
  /** Exhibits the officer has completed. */
  done: number;
}

/** How many gauges show before the rest fold behind "Show more". */
const MAX_VISIBLE = 8;

/** A needle from the centre to the edge of the arc. */
const GaugePointer: React.FC<{ color: string }> = ({ color }) => {
  const { valueAngle, outerRadius, cx, cy } = useGaugeState();
  if (valueAngle === null) return null;
  const target = {
    x: cx + outerRadius * Math.sin(valueAngle),
    y: cy - outerRadius * Math.cos(valueAngle),
  };
  return (
    <g>
      <circle cx={cx} cy={cy} r={5} fill={color} />
      <path d={`M ${cx} ${cy} L ${target.x} ${target.y}`} stroke={color} strokeWidth={3} strokeLinecap="round" />
    </g>
  );
};

/**
 * One gauge per Analysis Officer, busiest first. The needle shows how much of the busiest
 * officer's load each person carries, so the Head sees at a glance who has the most tasks in
 * hand and who can take another exhibit. Completed work is printed under each gauge.
 */
export const OfficerWorkloadGauges: React.FC<{ officers: OfficerWorkload[] }> = ({ officers }) => {
  const { resolvedTheme, theme } = useChartTheme();
  const sorted = [...officers].sort((a, b) => b.active - a.active || b.done - a.done || a.name.localeCompare(b.name));
  const busiest = sorted[0]?.active ?? 0;
  const [expanded, setExpanded] = useState(false);
  const [selectedOfficer, setSelectedOfficer] = useState<OfficerWorkload | null>(null);

  // Officers with exhibits are shown first; officers with nothing on the bench fold away.
  const working = sorted.filter((o) => o.active > 0);
  const base = working.length > 0 ? working : sorted.slice(0, 4);
  const visible = expanded ? sorted : base.slice(0, MAX_VISIBLE);
  const hiddenCount = sorted.length - visible.length;
  const hiddenAreFree = hiddenCount > 0 && sorted.slice(visible.length).every((o) => o.active === 0);
  const arc = CATEGORICAL[resolvedTheme][0];
  const needle = resolvedTheme === 'dark' ? '#e2e8f0' : '#334155';
  const handleModalKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') setSelectedOfficer(null);
  };

  return (
    <MuiThemeProvider theme={theme}>
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {visible.map((officer) => (
          <li key={officer.id}>
            <button
              type="button"
              onClick={() => setSelectedOfficer(officer)}
              aria-label={`View workload for ${officer.name}: ${officer.active} under analysis, ${officer.done} completed`}
              className="grid w-full grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:hover:bg-slate-800/60"
            >
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-medium text-slate-900 dark:text-white" title={officer.name}>{officer.name}</span>
                {officer.active > 0 && officer.active === busiest && sorted.length > 1 && (
                  <span className="text-[11px] text-sky-600 dark:text-sky-400">Busiest</span>
                )}
              </span>
              <span className="min-w-[5.5rem] text-right">
                <span className="block text-sm font-semibold tabular-nums text-slate-900 dark:text-white">{officer.active}</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">under analysis</span>
              </span>
              <span className="min-w-[4.5rem] text-right">
                <span className="block text-sm font-semibold tabular-nums text-slate-900 dark:text-white">{officer.done}</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">completed</span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-md border border-sky-200 px-2 py-1 text-[11px] font-medium text-sky-700 dark:border-sky-800 dark:text-sky-300">
                <Eye className="h-3.5 w-3.5" />
                View
              </span>
            </button>
          </li>
        ))}
      </ul>
      {hiddenCount > 0 || expanded ? (
        <div className="mt-4 text-center">
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpanded((value) => !value)}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {expanded ? 'Show fewer' : `Show ${hiddenCount} more ${hiddenAreFree ? (hiddenCount === 1 ? 'free officer' : 'free officers') : hiddenCount === 1 ? 'officer' : 'officers'}`}
          </button>
        </div>
      ) : null}
      {selectedOfficer && (
        <Portal>
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedOfficer(null);
          }}
          onKeyDown={handleModalKeyDown}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="officer-workload-title"
            aria-describedby="officer-workload-description"
            className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <div>
                <h2 id="officer-workload-title" className="text-base font-semibold text-slate-900 dark:text-white">{selectedOfficer.name}</h2>
                <p id="officer-workload-description" className="mt-1 text-xs text-slate-500 dark:text-slate-400">Analysis Officer workload</p>
              </div>
              <button
                type="button"
                autoFocus
                aria-label="Close workload details"
                onClick={() => setSelectedOfficer(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-col items-center px-5 pb-6 pt-4">
              <div
                role="img"
                aria-label={`${selectedOfficer.name} has ${selectedOfficer.active} ${selectedOfficer.active === 1 ? 'exhibit' : 'exhibits'} under analysis`}
              >
                <GaugeContainer
                  width={260}
                  height={185}
                  startAngle={-110}
                  endAngle={110}
                  value={selectedOfficer.active}
                  valueMin={0}
                  valueMax={Math.max(busiest, 1)}
                  sx={{
                    [`& .${gaugeClasses.referenceArc}`]: { fill: resolvedTheme === 'dark' ? '#334155' : '#e2e8f0' },
                    [`& .${gaugeClasses.valueArc}`]: { fill: arc },
                  }}
                >
                  <GaugeReferenceArc />
                  <GaugeValueArc />
                  <GaugePointer color={needle} />
                </GaugeContainer>
              </div>
              <div className="-mt-6 text-4xl font-semibold tabular-nums text-slate-900 dark:text-white">{selectedOfficer.active}</div>
              <div className="text-sm text-slate-500 dark:text-slate-400">under analysis</div>
              <div className="mt-5 grid w-full grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-50 px-4 py-3 text-center dark:bg-slate-800">
                  <div className="text-xl font-semibold tabular-nums text-slate-900 dark:text-white">{selectedOfficer.active}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Under analysis</div>
                </div>
                <div className="rounded-xl bg-slate-50 px-4 py-3 text-center dark:bg-slate-800">
                  <div className="text-xl font-semibold tabular-nums text-slate-900 dark:text-white">{selectedOfficer.done}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Completed</div>
                </div>
              </div>
              {busiest > 0 && (
                <p className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
                  Gauge scale: busiest officer has {busiest} {busiest === 1 ? 'exhibit' : 'exhibits'} under analysis.
                </p>
              )}
            </div>
          </section>
        </div>
        </Portal>
      )}
    </MuiThemeProvider>
  );
};

/* ------------------------------ Sample mix ------------------------------ */

/** A horizontal bar chart with labels and counts for each sample-mix value. */
export const BreakdownBarChart: React.FC<{ title: string; entries: [string, number][] }> = ({ title, entries }) => {
  const { resolvedTheme, theme } = useChartTheme();
  const palette = CATEGORICAL[resolvedTheme];
  const total = entries.reduce((sum, [, count]) => sum + count, 0);
  const labels = entries.map(([label]) => label);
  const values = entries.map(([, value]) => value);

  return (
    <div className="min-w-0">
      <div className="mb-1 flex items-center justify-between gap-3">
        <div className="text-xs font-medium text-slate-500 dark:text-slate-400">{title}</div>
        <div className="text-[11px] tabular-nums text-slate-500 dark:text-slate-400">{total} {total === 1 ? 'exhibit' : 'exhibits'}</div>
      </div>
      <div
        className="overflow-x-auto"
        role="img"
        aria-label={`${title}: ${entries.map(([label, count]) => `${label}, ${count} ${count === 1 ? 'exhibit' : 'exhibits'}`).join('; ')}`}
      >
        <MuiThemeProvider theme={theme}>
            <BarChart
              width={450}
              height={Math.max(180, entries.length * 44 + 64)}
              xAxis={[{ min: 0, label: 'Exhibits', tickLabelStyle: { fontSize: 10 } }]}
              yAxis={[{ scaleType: 'band', data: labels, width: 140, tickLabelStyle: { fontSize: 10 } }]}
              series={[{ id: title, label: title, data: values, color: palette[0] }]}
              layout="horizontal"
              grid={{ vertical: true }}
              hideLegend
              margin={{ left: 0, right: 16, top: 12, bottom: 32 }}
              skipAnimation
            />
          </MuiThemeProvider>
      </div>
    </div>
  );
};
