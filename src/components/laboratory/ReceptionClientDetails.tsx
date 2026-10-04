import React, { useEffect, useState } from 'react';
import { BadgeCheck, Building2, IdCard, Lock, MapPin, Phone, Shield, User } from 'lucide-react';

import { OfficerVisitor } from '../../types';
import { apiRequest } from '../../lib/api';

interface ReceptionClientDetailsProps {
  /** The visitor routed to this laboratory; null shows empty read-only details. */
  visitor: OfficerVisitor | null;
  /** Called with the full National ID once reception's record has been read. */
  onNationalId?: (nationalId: string) => void;
  /** Hide the P.O Box row for laboratories that don't capture it. */
  showPoBox?: boolean;
  /** Keep the P.O Box read only even when reception did not record one. */
  readOnlyPoBox?: boolean;
  /**
   * Current P.O Box value and its setter. When reception left the P.O Box
   * empty, this one field is editable so the laboratory can fill it in.
   */
  poBox?: string;
  onPoBoxChange?: (poBox: string) => void;
  poBoxInvalid?: boolean;
}

/** Who the client is — police officers by badge and station, everyone else by organisation. */
export const clientOrigin = (visitor: Pick<OfficerVisitor, 'visitorType' | 'station'>) =>
  visitor.visitorType === 'POLICE_OFFICER'
    ? { label: 'Police station', icon: Shield, value: visitor.station }
    : { label: 'Organisation', icon: Building2, value: visitor.station };

const ReadOnlyRow: React.FC<{
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  mono?: boolean;
}> = ({ label, value, icon: Icon, mono }) => (
  <div className="min-w-0">
    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
      <Icon className="h-3.5 w-3.5 text-slate-400" />
      {label}
    </div>
    <div
      aria-readonly="true"
      className={`mt-1.5 truncate rounded-lg border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm text-slate-700 select-text dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200 ${mono ? 'font-mono tracking-wider' : ''}`}
    >
      {value || '—'}
    </div>
  </div>
);

/**
 * Client details captured at reception, shown read-only on every laboratory's
 * intake so the lab cannot alter who the exhibit came from.
 */
export const ReceptionClientDetails: React.FC<ReceptionClientDetailsProps> = ({
  visitor,
  onNationalId,
  showPoBox = true,
  readOnlyPoBox = false,
  poBox,
  onPoBoxChange,
  poBoxInvalid = false,
}) => {
  // Decided from the reception record, so the field doesn't lock once typed into.
  const poBoxEditable = !readOnlyPoBox && !!onPoBoxChange && !!visitor && !visitor.poBox?.trim();
  const [nationalId, setNationalId] = useState('');
  const [error, setError] = useState('');
  const origin = visitor ? clientOrigin(visitor) : { label: 'Police station / organisation', icon: Building2, value: '' };
  const isOfficer = visitor?.visitorType === 'POLICE_OFFICER';
  const visitId = visitor?.id;

  useEffect(() => {
    let cancelled = false;
    setNationalId('');
    setError('');
    if (!visitId) return undefined;
    apiRequest<{ nationalId: string }>(`/api/reception/visits/${visitId}/national-id`)
      .then(({ nationalId: recordedId }) => {
        if (cancelled) return;
        setNationalId(recordedId);
        onNationalId?.(recordedId);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Could not load the ID number from reception.');
      });
    return () => { cancelled = true; };
    // onNationalId is a state setter in callers; the visit id is the real dependency.
  }, [visitId]);

  return (
    <div className="space-y-3 sm:col-span-2">
      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
        <Lock className="h-3 w-3" />
        {visitor ? `Captured at reception (${visitor.visitNumber}) — read only` : 'Read only — filled from reception once a client is sent to this laboratory'}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ReadOnlyRow label={isOfficer ? 'Officer name' : 'Client name'} value={visitor?.officerName ?? ''} icon={User} />
        <ReadOnlyRow label="ID number (National ID)" value={!visitor ? '' : error ? 'Unavailable' : nationalId || 'Loading…'} icon={IdCard} mono />
        {isOfficer && <ReadOnlyRow label="Badge ID No." value={visitor?.badgeNumber ?? ''} icon={BadgeCheck} mono />}
        <ReadOnlyRow label={origin.label} value={origin.value} icon={origin.icon} />
        <ReadOnlyRow label="Mobile number" value={visitor?.phone ?? ''} icon={Phone} />
        {showPoBox && (poBoxEditable ? (
          <label className="block min-w-0">
            <span className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
              <MapPin className="h-3.5 w-3.5 text-slate-400" />
              P.O Box <span className="text-rose-500">*</span>
            </span>
            <input
              value={poBox ?? ''}
              onChange={(event) => onPoBoxChange?.(event.target.value)}
              placeholder="P.O Box 40245-00100"
              className={`mt-1.5 w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 dark:bg-slate-950 dark:text-white ${
                poBoxInvalid
                  ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20'
                  : 'border-slate-300 focus:border-amber-500 focus:ring-amber-500/20 dark:border-slate-700'
              }`}
            />
            <span className={`mt-1 block text-[11px] ${poBoxInvalid ? 'text-rose-500' : 'text-slate-400'}`}>
              {poBoxInvalid ? 'Use the format P.O Box 40245-00100' : 'Not recorded at reception — enter it here'}
            </span>
          </label>
        ) : (
          <ReadOnlyRow label="P.O Box" value={visitor?.poBox ?? ''} icon={MapPin} />
        ))}
      </div>
      {error && <p role="alert" className="text-xs text-rose-500">{error}</p>}
    </div>
  );
};
