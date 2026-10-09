import React from 'react';
import { OfficialPrintDocument, printCell as cell, printOfficialDocument } from '../../common/print/OfficialPrintDocument';
import { AgedRow, RegisterColumns, RegisterStatus, formatDate } from './types';

/** Prints the case register as shown, A4 landscape. */
export const printRegister = () => printOfficialDocument('landscape');

interface RegisterPrintProps<S extends string> {
  laboratory: string;
  columns: RegisterColumns;
  statuses: RegisterStatus<S>[];
  rows: AgedRow<S>[];
  /** Human description of the filters in force, e.g. "Status: Under Analysis · Officer: All". */
  scope: string;
}

/** The case register as an official document; the header row repeats on every page. */
export function RegisterPrint<S extends string>({ laboratory, columns, statuses, rows, scope }: RegisterPrintProps<S>) {
  return (
    <OfficialPrintDocument
      office={`${laboratory} Laboratory`}
      title="Case register"
      scope={scope}
      entries={rows.length}
      notes={
        <>
          {statuses.map((status) => (
            <span key={status.value}>
              <strong>{status.value}:</strong> {rows.filter((row) => row.status === status.value).length}
            </span>
          ))}
          {rows.some((row) => row.overdue) && <span>* Open longer than the turnaround time</span>}
        </>
      }
    >
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-slate-200">
            {['S/No.', columns.reference, 'Date received', 'Days', columns.party, columns.subject, columns.officer, 'Status'].map((heading) => (
              <th key={heading} className={`${cell} text-left font-semibold`}>{heading}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.key} className="break-inside-avoid">
              <td className={`${cell} text-center`}>{i + 1}</td>
              <td className={`${cell} font-mono`}>
                {row.reference}
                {row.secondaryRef && <div className="text-[8.5px] text-slate-600">{row.secondaryRef}</div>}
              </td>
              <td className={`${cell} whitespace-nowrap`}>{formatDate(row.received)}</td>
              <td className={`${cell} text-center`}>{row.age ?? '—'}{row.overdue ? ' *' : ''}</td>
              <td className={cell}>
                {row.party}
                {row.partySub && <div className="text-[8.5px] text-slate-600">{row.partySub}</div>}
              </td>
              <td className={cell}>
                {row.subject}
                {row.subjectSub && <div className="text-[8.5px] text-slate-600">{row.subjectSub}</div>}
              </td>
              <td className={cell}>{row.officer ?? 'Not assigned'}</td>
              <td className={cell}>{row.status}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td className={`${cell} py-4 text-center`} colSpan={8}>No entries for this scope.</td>
            </tr>
          )}
        </tbody>
      </table>
    </OfficialPrintDocument>
  );
}
