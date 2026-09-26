import React, { useEffect, useState } from 'react';
import {
  ClipboardList,
  FilePlus2,
  UserCheck,
  Inbox,
  UserMinus,
  BellRing,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  X,
} from 'lucide-react';

type VisitorStatus = 'Awaiting Laboratory Reception' | 'In Laboratory' | 'Departed';

interface ClientInQueue {
  id: string;
  name: string;
  station: string;
  purpose: string;
  status: VisitorStatus;
}

interface SignedOutToast {
  id: string;
  name: string;
  station: string;
  time: string;
}

/**
 * VisitorTaskRail — the Government Chemist receptionist's live task sidebar.
 *
 * It surfaces three operational signals the desk must never lose sight of:
 *   1. Pending intake papers (ordered checklist — create intake form, verify
 *      identity, forward inspection exhibits).
 *   2. The live client flow through the facility: STILL IN BAY → BEING SERVED
 *      → SERVED → SIGNED OUT (mirrors the reception pipeline so staff can see
 *      at a glance who is waiting vs. actively being served).
 *   3. An automatic sign-out popup the instant a client leaves the premises so
 *      the record is closed and the bay is re-queued.
 */
export const VisitorTaskRail: React.FC<{ visitors: ClientInQueue[] }> = ({ visitors }) => {
  const [queue, setQueue] = useState<ClientInQueue[]>(() =>
    visitors.map((v) => ({ ...v }))
  );
  const [servedId, setServedId] = useState<string | null>(null); // one salesperson-style "mark served"
  const [signedOut, setSignedOut] = useState<SignedOutToast[]>([]);

  /* Seed the popup whenever a client is explicitly signed out (Departed). */
  const markServed = (id: string) => {
    setServedId(id);
    setQueue((q) => q.map((c) => (c.id === id ? { ...c, status: 'In Laboratory' } : c)));
  };

  const signOut = (id: string) => {
    const client = queue.find((c) => c.id === id);
    if (!client) return;
    setQueue((q) => q.filter((c) => c.id !== id));
    setServedId(null);
    const toast: SignedOutToast = {
      id: `signout-${Date.now()}`,
      name: client.name,
      station: client.station,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setSignedOut((t) => [...t, toast]);
  };

  const dismissToast = (id: string) => setSignedOut((t) => t.filter((x) => x.id !== id));

  /* Auto-dismiss each sign-out popup after 6s */
  useEffect(() => {
    if (signedOut.length === 0) return;
    const timer = setTimeout(() => setSignedOut((t) => t.slice(1)), 6000);
    return () => clearTimeout(timer);
  }, [signedOut]);

  const inBay = queue.filter((c) => c.status === 'Awaiting Laboratory Reception');
  const beingServed = queue.filter((c) => c.status === 'In Laboratory');
  const servedCount = queue.length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      {/* ---------- LEFT: intake task rail ---------- */}
      <div className="lg:col-span-2 space-y-4">
        {/* Pending intake papers (ordered checklist) */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <span className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <ClipboardList className="w-4 h-4" />
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Intake Forms — What To Do</h2>
                <span className="text-[9px] font-mono text-emerald-400">{inBay.length + beingServed.length} PENDING</span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Open paperwork, in priority order, for clients now in the facility</p>
            </div>
          </div>

          <ol className="space-y-2">
            {(
              [
                { label: 'Create / open case intake form', count: inBay.length, tone: 'text-sky-400', dot: 'bg-sky-400' },
                { label: 'Verify officer &amp; client identity', count: beingServed.length, tone: 'text-amber-400', dot: 'bg-amber-400' },
                { label: 'Receive &amp; voucher exhibits', count: queue.length, tone: 'text-emerald-400', dot: 'bg-emerald-400' },
              ] as const
            ).map((task, i) => (
              <li key={task.label} className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <span className={`mt-0.5 w-4 h-4 rounded-full ${task.dot} text-slate-950 text-[9px] font-bold flex items-center justify-center font-mono shrink-0`}>
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <span className="block text-xs text-slate-700 dark:text-slate-200">{task.label}</span>
                  <span className={`text-[10px] font-mono ${task.tone}`}>{task.count} clients currently</span>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400">
            <span>BAY 2 · ROOM 104 · GC-K</span>
            <span className="flex items-center gap-1 text-emerald-400"><ShieldCheck className="w-3 h-3" /> OFFICER VERIFIED</span>
          </div>
        </div>

        {/* Client flow status list (unordered — live pipeline) */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Inbox className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Client Status — Live</h2>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Still in bay · being served · served &amp; signed out</p>
            </div>
          </div>

          <div className="space-y-1.5">
            {inBay.length > 0 && (
              <div className="p-2.5 rounded-xl bg-sky-500/5 border border-sky-500/20">
                <span className="text-[9px] font-mono uppercase tracking-[0.15em] text-sky-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" /> STILL IN BAY — WAITING
                </span>
                <ul className="mt-1.5 space-y-1">
                  {inBay.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-2">
                      <span className="text-xs text-slate-700 dark:text-slate-200 truncate">{c.name}</span>
                      <button
                        onClick={() => markServed(c.id)}
                        className="px-2 py-0.5 rounded text-[10px] font-bold text-amber-600 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/10 transition-colors cursor-pointer shrink-0 flex items-center gap-1"
                      >
                        <ArrowRight className="w-3 h-3" /> SERVE
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {beingServed.length > 0 && (
              <div className="p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/20">
                <span className="text-[9px] font-mono uppercase tracking-[0.15em] text-amber-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" /> BEING SERVED NOW
                </span>
                <ul className="mt-1.5 space-y-1">
                  {beingServed.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-2">
                      <span className="text-xs text-slate-700 dark:text-slate-200 truncate">{c.name} <span className="text-slate-400">· {c.purpose}</span></span>
                      <button
                        onClick={() => signOut(c.id)}
                        className="px-2 py-0.5 rounded text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/10 transition-colors cursor-pointer shrink-0 flex items-center gap-1"
                      >
                        <UserMinus className="w-3 h-3" /> SIGN OUT
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {servedCount === 0 && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-dashed border-slate-300 dark:border-slate-700 text-center">
                <span className="text-[10px] text-slate-500 dark:text-slate-400">No clients in the facility — bay is clear</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ---------- RIGHT: recap table ---------- */}
      <div className="lg:col-span-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <UserCheck className="w-4 h-4" />
          </span>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Visitors currently in the facility</h2>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">{servedCount} visitor(s) inside · {signedOut.length} signed out today</p>
          </div>
          <span className="px-2 py-0.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[9px] font-mono text-slate-500 dark:text-slate-400">AUTO-SYNC</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs table-fixed">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-[9px] font-mono uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
                <th className="py-2 pr-2">Visitor name</th>
                <th className="py-2 pr-2">Police station / source</th>
                <th className="py-2 pr-2">Current position</th>
                <th className="py-2 text-right">Next action</th>
              </tr>
            </thead>
            <tbody>
              {queue.map((c) => {
                const active = !!servedId && servedId === c.id;
                return (
                  <tr key={c.id} className="border-b border-slate-100 dark:border-slate-800/60 last:border-0">
                    <td className="py-2 pr-2 font-medium text-slate-900 dark:text-white truncate max-w-[180px]" title={c.name}>{c.name}</td>
                    <td className="py-2 pr-2 text-slate-500 dark:text-slate-400 truncate max-w-[140px]" title={c.station}>{c.station}</td>
                    <td className="py-2 pr-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[9px] font-mono whitespace-nowrap ${
                          c.status === 'In Laboratory'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                        }`}
                      >
                        {c.status === 'In Laboratory' ? 'At laboratory' : 'Awaiting laboratory reception'}
                      </span>
                    </td>
                    <td className="py-2 text-right">
                      {active ? (
                        <button onClick={() => signOut(c.id)} className="px-2 py-0.5 rounded text-[9px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/10 cursor-pointer transition-colors">
                          Record departure
                        </button>
                      ) : (
                        <button onClick={() => markServed(c.id)} className="px-2 py-0.5 rounded text-[9px] font-bold text-amber-600 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/10 cursor-pointer transition-colors">
                          Mark as received
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {queue.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-[10px] text-slate-500 dark:text-slate-400">No visitors are currently awaiting service or departure.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------- Sign-out popup (toast) ---------- */}
      <div className="fixed right-4 bottom-4 z-50 space-y-2 w-72 sm:w-80">
        {signedOut.map((t) => (
          <div key={t.id} className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 dark:bg-emerald-500/10 backdrop-blur shadow-lg flex items-start gap-2.5 animate-slide-up">
            <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0">
              <BellRing className="w-4 h-4" />
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-emerald-400">
                <CheckCircle2 className="w-3 h-3" /> CLIENT SIGNED OUT
              </div>
              <p className="text-xs text-slate-900 dark:text-white font-bold mt-0.5">{t.name}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">{t.station} · signed out at {t.time}</p>
            </div>
            <button onClick={() => dismissToast(t.id)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer shrink-0" aria-label="Dismiss">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
