import React from 'react';
import { NarcoticsIntake } from '../../types';
import { OfficialPrintDocument, printCell as cell } from '../common/print/OfficialPrintDocument';

/**
 * The Narcotics memo (report of analysis) on the official A4 letterhead. Hidden
 * on screen; printed with printOfficialDocument('portrait') once the Head has
 * approved it.
 */
export const NarcoticsMemoPrint: React.FC<{ intake: NarcoticsIntake }> = ({ intake }) => {
  const row = (label: string, value?: React.ReactNode) => (
    <tr>
      <th className={`${cell} w-[32%] bg-slate-100 text-left font-semibold`}>{label}</th>
      <td className={cell}>{value || '—'}</td>
    </tr>
  );

  return (
    <OfficialPrintDocument
      office="Narcotics Laboratory"
      title="Memo — Report of analysis"
      scope={<>Lab reference <strong>{intake.labReference}</strong> · CR <strong>{intake.crNumber}</strong></>}
      entries={1}
      signOff={[
        `Analysed by (Analysis Officer): ${intake.analysisOfficer ?? ''}`,
        `Approved by (Head of Narcotics): ${intake.memoApprovedBy ?? ''}`,
      ]}
      notes={
        intake.memoApprovedDate ? (
          <span>Memo approved {intake.memoApprovedDate} by {intake.memoApprovedBy}.</span>
        ) : undefined
      }
    >
      <table className="w-full border-collapse">
        <tbody>
          {row('Submitting officer', `${intake.officerName} · Badge ${intake.badgeNumber}`)}
          {row('Police station', intake.policeStation)}
          {row('Officer mobile', intake.officerMobile)}
          {row('Date and time received', `${intake.dateReceived} at ${intake.timeReceived} · by ${intake.receivingOfficer}`)}
          {row('Documents received', intake.documentsReceived.join(', '))}
          {row('Exhibit', `${intake.exhibitType} · ${intake.numberOfItems} item${intake.numberOfItems === 1 ? '' : 's'} · ${intake.packaging}`)}
          {row('Seal', [intake.sealCondition, intake.sealNumber].filter(Boolean).join(' · '))}
          {row('Markings', intake.markings)}
          {row('Declared weight / quantity', intake.declaredWeight)}
          {row('Description as received', <span className="whitespace-pre-wrap">{intake.description}</span>)}
        </tbody>
      </table>

      <div className="mt-4 mb-1 text-[11px] font-bold uppercase tracking-wider">Analysis</div>
      <table className="w-full border-collapse">
        <tbody>
          {row('Tests performed', intake.testsPerformed?.join(', '))}
          {row('Net weight found', intake.netWeight)}
          {row('Substance identified', <strong>{intake.substanceIdentified}</strong>)}
          {row('Findings', <span className="whitespace-pre-wrap">{intake.findings}</span>)}
          {row('Analysed', intake.findingsRecordedAt ? `${intake.findingsRecordedAt} · ${intake.findingsRecordedBy ?? ''}` : '')}
        </tbody>
      </table>
    </OfficialPrintDocument>
  );
};
