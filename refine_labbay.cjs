const fs = require('fs');
let content = fs.readFileSync('src/components/reception/ReceptionWorkflowViews.tsx', 'utf8');

// ============================================================
// 1. Replace Pending Action Queue cards with compact list
// ============================================================
const oldPending = `      {/* Pending Action Queue */}
      <div className="rounded-2xl p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-amber-500" /> Pending Action Queue
          </h3>
          <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-mono font-bold">
            {staged.length}
          </span>
        </div>
        <div className="space-y-3">
          {staged.length === 0 ? (
            <div className="py-6 text-center text-[11px] text-slate-400 dark:text-slate-600">
              No visitors awaiting lab reception.
            </div>
          ) : (
            staged.map((vis) => {
              const initials = vis.officerName.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
              return (
                <div key={vis.id} className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-l-4 border-l-amber-500 shadow-sm transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 hover:border-slate-300/60 dark:hover:border-slate-600/60 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-amber-500/15 text-amber-500 text-[11px] font-bold">
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-bold text-slate-900 dark:text-white truncate" title={vis.officerName}>{vis.officerName}</div>
                      <div className="text-[9px] font-mono text-slate-500 dark:text-slate-400">{vis.id}</div>
                    </div>
                    <span className={\`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-[9px] font-mono font-bold whitespace-nowrap \${statusBadge[vis.status] || ''}\`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      STAGED
                    </span>
                  </div>
                  <div className="h-px bg-gradient-to-r from-amber-200/60 via-slate-200/30 to-transparent dark:from-slate-700/60 dark:via-slate-700/30 dark:to-transparent" />
                  <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-3 gap-y-2">
                  <div className="space-y-0.5">
                    <dt className="text-[9px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> Date</dt>
                    <dd className="text-[11px] font-mono text-slate-700 dark:text-slate-300">{vis.date || '—'}</dd>
                  </div>
                  <div className="space-y-0.5">
                    <dt className="text-[9px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> Time In</dt>
                    <dd className="text-[11px] font-mono text-slate-700 dark:text-slate-300">{vis.timeIn}</dd>
                  </div>
                  <div className="space-y-0.5">
                    <dt className="text-[9px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> Time Out</dt>
                    <dd className="text-[11px] font-mono text-slate-700 dark:text-slate-300">{vis.timeOut || '—'}</dd>
                  </div>
                  <div className="space-y-0.5">
                    <dt className="text-[9px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1"><FileText className="w-2.5 h-2.5" /> ID Number</dt>
                    <dd className="text-[11px] font-mono text-slate-700 dark:text-slate-300">{vis.nationalId || '—'}</dd>
                  </div>
                  <div className="space-y-0.5">
                    <dt className="text-[9px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1"><Phone className="w-2.5 h-2.5" /> Mobile</dt>
                    <dd className="text-[11px] font-mono text-slate-700 dark:text-slate-300">{vis.phone || '—'}</dd>
                  </div>
                  <div className="space-y-0.5">
                    <dt className="text-[9px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1"><Car className="w-2.5 h-2.5" /> Car Reg</dt>
                    <dd className="text-[11px] font-mono text-slate-700 dark:text-slate-300">{vis.vehicleRegistration || '—'}</dd>
                  </div>
                  <div className="space-y-0.5">
                    <dt className="text-[9px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1"><MapPin className="w-2.5 h-2.5" /> Where From</dt>
                    <dd className="text-[11px] font-mono text-slate-700 dark:text-slate-300">{vis.station}</dd>
                  </div>
                  <div className="space-y-0.5">
                    <dt className="text-[9px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1"><FlaskConical className="w-2.5 h-2.5" /> Lab to Visit</dt>
                    <dd className="text-[11px] font-mono text-slate-700 dark:text-slate-300">{vis.laboratory}</dd>
                  </div>
                  <div className="space-y-0.5">
                    <dt className="text-[9px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1"><Shield className="w-2.5 h-2.5" /> Badge</dt>
                    <dd className="text-[11px] font-mono text-slate-700 dark:text-slate-300">{vis.badgeNumber || '—'}</dd>
                  </div>
                  <div className="space-y-0.5">
                    <dt className="text-[9px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1"><Shield className="w-2.5 h-2.5" /> Type</dt>
                    <dd className="text-[11px] font-mono text-slate-700 dark:text-slate-300">{vis.visitorType === 'POLICE_OFFICER' ? 'Police Officer' : 'Normal Client'}</dd>
                  </div>
                  <div className="space-y-0.5">
                    <dt className="text-[9px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1"><CheckCircle2 className="w-2.5 h-2.5" /> Signed</dt>
                    <dd className="text-[11px] font-mono text-slate-700 dark:text-slate-300">{vis.signatureCaptured ? 'Yes' : 'No'}</dd>
                  </div>
                  <div className="space-y-0.5">
                    <dt className="text-[9px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1"><FileText className="w-2.5 h-2.5" /> Receipt</dt>
                    <dd className="text-[11px] font-mono text-slate-700 dark:text-slate-300">{vis.documentsPresented || '—'}</dd>
                  </div>
                </dl>
                <div className="mt-3 flex items-center gap-1.5">
                  <button
                    onClick={() => handleNotify(vis)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-semibold hover:bg-amber-500 hover:text-slate-950 transition-colors"
                  >
                    <Send className="w-3 h-3" /> Notify
                  </button>
                  <button
                    onClick={() => onProceedToLab(vis)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 text-[10px] font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    <ArrowRight className="w-3 h-3" /> Lab Bay
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>`;

const newPending = `      {/* Pending Action Queue */}
      <div className="rounded-2xl p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-amber-500" /> Pending Action Queue
          </h3>
          <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-mono font-bold">
            {staged.length}
          </span>
        </div>
        <div className="space-y-2">
          {staged.length === 0 ? (
            <div className="py-6 text-center text-[11px] text-slate-400 dark:text-slate-600">
              No visitors awaiting lab reception.
            </div>
          ) : (
            staged.map((vis) => {
              const initials = vis.officerName.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
              const fields = [
                { label: 'Date', value: vis.date || '—' },
                { label: 'Time In', value: vis.timeIn },
                { label: 'Time Out', value: vis.timeOut || '—' },
                { label: 'ID', value: vis.nationalId || '—' },
                { label: 'Phone', value: vis.phone || '—' },
                { label: 'Vehicle', value: vis.vehicleRegistration || '—' },
                { label: 'Station', value: vis.station },
                { label: 'Lab', value: vis.laboratory },
                { label: 'Badge', value: vis.badgeNumber || '—' },
                { label: 'Type', value: vis.visitorType === 'POLICE_OFFICER' ? 'Police' : 'Client' },
                { label: 'Signed', value: vis.signatureCaptured ? 'Yes' : 'No' },
                { label: 'Receipt', value: vis.documentsPresented || '—' },
              ];
              return (
                <div key={vis.id} className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-l-4 border-l-amber-500 shadow-sm hover:border-amber-500/40 hover:shadow-md transition-all duration-200">
                  <div className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-amber-500/15 text-amber-500 text-[11px] font-bold">
                    {initials}
                  </div>
                  <div className="shrink-0 min-w-[120px]">
                    <div className="text-[13px] font-bold text-slate-900 dark:text-white truncate" title={vis.officerName}>{vis.officerName}</div>
                    <div className="text-[9px] font-mono text-slate-500 dark:text-slate-400">{vis.id}</div>
                  </div>
                  <div className="hidden lg:flex flex-1 flex-wrap gap-x-4 gap-y-1">
                    {fields.map((f) => (
                      <span key={f.label} className="inline-flex items-center gap-1 text-[10px]">
                        <span className="font-mono text-slate-400 dark:text-slate-500">{f.label}:</span>
                        <span className="font-mono text-slate-700 dark:text-slate-300 truncate max-w-[100px]" title={f.value}>{f.value}</span>
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5 ml-auto shrink-0">
                    <span className={\`hidden md:inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-[9px] font-mono font-bold whitespace-nowrap \${statusBadge[vis.status] || ''}\`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" /> STAGED
                    </span>
                    <button
                      onClick={() => handleNotify(vis)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-semibold hover:bg-amber-500 hover:text-slate-950 transition-colors"
                    >
                      <Send className="w-3 h-3" /> Notify
                    </button>
                    <button
                      onClick={() => onProceedToLab(vis)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 text-[10px] font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                      <ArrowRight className="w-3 h-3" /> Bay
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>`;

if (!content.includes(oldPending)) {
  console.error('PENDING QUEUE NOT FOUND');
  process.exit(1);
}
content = content.replace(oldPending, newPending);

// ============================================================
// 2. Replace Recent Intake with timeline style
// ============================================================
const oldRecent = `      {/* Recent Intake */}
      <div className="rounded-2xl p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <h3 className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <Activity className="w-3 h-3 text-emerald-500" /> Recent Intake
        </h3>
        <div className="mt-3 space-y-3">
          {recentIntake.length === 0 ? (
            <div className="py-6 text-center text-[11px] text-slate-400 dark:text-slate-600">
              No visitors registered yet today.
            </div>
          ) : (
            recentIntake.map((vis) => (
              <div key={vis.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <span className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 shrink-0">
                  <User className="w-4 h-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-1">
                    <div className="space-y-0.5">
                      <dt className="text-[8px] font-mono uppercase tracking-wider text-slate-400">Name</dt>
                      <dd className="text-[11px] font-semibold text-slate-900 dark:text-white truncate" title={vis.officerName}>{vis.officerName}</dd>
                    </div>
                    <div className="space-y-0.5">
                      <dt className="text-[8px] font-mono uppercase tracking-wider text-slate-400">ID</dt>
                      <dd className="text-[11px] font-mono text-slate-700 dark:text-slate-300">{vis.nationalId || '—'}</dd>
                    </div>
                    <div className="space-y-0.5">
                      <dt className="text-[8px] font-mono uppercase tracking-wider text-slate-400">Station</dt>
                      <dd className="text-[11px] text-slate-600 dark:text-slate-400 truncate">{vis.station}</dd>
                    </div>
                    <div className="space-y-0.5">
                      <dt className="text-[8px] font-mono uppercase tracking-wider text-slate-400">Time In</dt>
                      <dd className="text-[11px] font-mono text-slate-500 dark:text-slate-400">{vis.timeIn}</dd>
                    </div>
                  </dl>
                </div>
                <span className={\`px-1.5 py-0.5 rounded text-[9px] font-mono border whitespace-nowrap \${statusBadge[vis.status] || ''}\`}>{vis.status}</span>
              </div>
            ))
          )}
        </div>
      </div>`;

const newRecent = `      {/* Recent Intake */}
      <div className="rounded-2xl p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <h3 className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <Activity className="w-3 h-3 text-emerald-500" /> Recent Intake
        </h3>
        <div className="mt-3 relative pl-6">
          <div className="absolute left-[14px] top-2 bottom-2 w-px bg-slate-200 dark:bg-slate-800" />
          {recentIntake.length === 0 ? (
            <div className="py-6 text-center text-[11px] text-slate-400 dark:text-slate-600">
              No visitors registered yet today.
            </div>
          ) : (
            recentIntake.map((vis, idx) => (
              <div key={vis.id} className="relative pb-3 last:pb-0">
                <div className="absolute left-[-22px] top-1 w-3 h-3 rounded-full border-2 border-emerald-500 bg-emerald-500/20 dark:border-emerald-600 dark:bg-emerald-900/30" />
                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-slate-300/50 transition-colors">
                  <span className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 shrink-0">
                    <User className="w-3.5 h-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[12px] font-bold text-slate-900 dark:text-white truncate" title={vis.officerName}>{vis.officerName}</div>
                      <span className="text-[9px] font-mono text-slate-500 dark:text-slate-400">{vis.timeIn}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">{vis.nationalId || '—'}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{vis.station}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                      <span className="text-[10px] font-mono text-slate-600 dark:text-slate-400">{vis.laboratory}</span>
                    </div>
                  </div>
                  <span className={\`px-1.5 py-0.5 rounded text-[9px] font-mono border whitespace-nowrap \${statusBadge[vis.status] || ''}\`}>{vis.status}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>`;

if (!content.includes(oldRecent)) {
  console.error('RECENT INTAKE NOT FOUND');
  process.exit(1);
}
content = content.replace(oldRecent, newRecent);

fs.writeFileSync('src/components/reception/ReceptionWorkflowViews.tsx', content);
console.log('Done!');
