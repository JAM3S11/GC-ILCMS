import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import coatOfArms from '../../assets/COURTOFARMS-removebg-preview.png';
import { CERTIFICATE_LETTERHEAD } from '../../lib/certificateLetterhead';
import { DateParts, GovernmentAnalystReportData } from '../../governmentAnalystReport';
import { MM_PX } from './a4Preview';

// Page geometry (mm), close to the original report.
const PAD_X = 24;
const PAD_TOP = 8;
const PAD_BOTTOM = 12;
const BODY_MM = 297 - PAD_TOP - PAD_BOTTOM;
const SERIF = "'Times New Roman', Times, serif";
// The letterhead is set in the department's sans face, as on the printed original.
const LETTERHEAD = "'Tw Cen MT', 'Century Gothic', 'Segoe UI', Arial, sans-serif";

// This report prints the mobile number spaced, as on the original; the shared letterhead has it unspaced.
const CONTACTS = CERTIFICATE_LETTERHEAD.contacts.map((contact) =>
  contact.label === 'Mobile' ? { ...contact, value: '0111 585154' } : contact,
);

const dotted = 'border-b border-dotted border-black [box-decoration-break:clone]';
const heading = 'font-bold';

/** "15th October, 2026" with the suffix in superscript; `dayOf` writes "15th day of October, 2026". */
const PrintedDate: React.FC<{ date: DateParts | null; dayOf?: boolean }> = ({ date, dayOf }) =>
  date ? (
    <>
      {date.day}
      <sup className="text-[0.62em]">{date.suffix}</sup>
      {dayOf ? ' day of ' : ' '}
      {date.monthYear}
    </>
  ) : (
    <span className="inline-block w-[40mm]">&nbsp;</span>
  );

/** The findings, with "Cannabis" in bold italics wherever it is named. */
const Findings: React.FC<{ text: string }> = ({ text }) => (
  <>
    {text.split(/(\bCannabis\b)/).map((part, index) =>
      part === 'Cannabis' ? <strong key={index} className="italic">Cannabis</strong> : <React.Fragment key={index}>{part}</React.Fragment>,
    )}
  </>
);

type Block = { key: string; node: React.ReactNode };

const buildBlocks = (data: GovernmentAnalystReportData): Block[] => [
  {
    key: 'letterhead',
    node: (
      <div>
        <div className="flex justify-center">
          <img src={coatOfArms} alt="Coat of arms of Kenya" className="h-[27mm] w-auto object-contain" />
        </div>
        <div className="mt-[1mm] text-center font-bold leading-tight" style={{ fontFamily: LETTERHEAD }}>
          <p className="text-[13pt]">{CERTIFICATE_LETTERHEAD.officeLines[0]}</p>
          <p className="text-[14.5pt]">{CERTIFICATE_LETTERHEAD.officeLines[1]}</p>
        </div>
        <div className="mt-[5mm] flex items-start justify-between text-[6.8pt] font-bold leading-[1.25]" style={{ fontFamily: LETTERHEAD }}>
          <div>
            {CONTACTS.map((contact) => (
              <p key={contact.label}>
                {contact.label}:{' '}
                {contact.label === 'E-mail' ? <span className="text-[#1f4fd1] underline">{contact.value}</span> : contact.value}
              </p>
            ))}
          </div>
          <div className="text-center">
            {CERTIFICATE_LETTERHEAD.department.map((line) => <p key={line}>{line}</p>)}
          </div>
        </div>
        <p className="mt-[5mm] text-right text-[12pt] font-bold"><PrintedDate date={data.approvalDate} /></p>
      </div>
    ),
  },
  {
    key: 'title',
    node: (
      <div className="pt-[5mm] text-center text-[12pt] font-bold leading-snug">
        <p>REPORT OF GOVERNMENT ANALYST</p>
        <p className="italic">(The Narcotic Drugs and Psychotropic Substances (Control) Act, Cap 245)</p>
      </div>
    ),
  },
  {
    key: 'references',
    node: (
      <div className="pt-[3mm]">
        <div className="flex items-baseline justify-between gap-[4mm] text-[12pt] font-bold">
          <span>Report Reference No: {data.reportRef}</span>
          <span>Police/Client Reference No: {data.crNo}</span>
        </div>
        <p className="text-[7pt] font-bold italic">When replying please quote this reference</p>
      </div>
    ),
  },
  {
    key: 'intro',
    node: (
      <p className="pt-[4mm] text-justify">
        I <span className={dotted}>{data.analystFullName}{data.analystQualification ? `, ${data.analystQualification}.` : ''}</span>, a Government
        Analyst at the Laboratory of the Government Chemist’s Department, for the purpose of section 67 (1) of the Narcotic Drugs and
        Psychotropic Substances (Control) Act, laws of Kenya, hereby report as under:
      </p>
    ),
  },
  {
    key: 'received',
    node: (
      <div className="pt-[4mm]">
        <p className={heading}>Items Received</p>
        <p className="text-justify">
          On the <span className={dotted}>&nbsp;<PrintedDate date={data.dateReceived} dayOf />&nbsp;</span> at the laboratory of the
          Government Chemist’s Department, Nairobi, the items listed below were received from {data.submittedBy || '—'}.
        </p>
      </div>
    ),
  },
  {
    key: 'item',
    node: <p className="pl-[12mm] pt-[4mm] text-justify">{data.itemDescription}</p>,
  },
  {
    key: 'examination',
    node: (
      <div className="pt-[4mm]">
        <p className={heading}>Examination Required</p>
        <p>Analysis for Narcotic Drugs and Psychotropic Substances</p>
      </div>
    ),
  },
  {
    key: 'methods',
    node: (
      <div className="pt-[4mm]">
        <p className={heading}>Test Method</p>
        <ol>
          {data.testMethods.map((method, index) => (
            <li key={method} className="flex">
              <span className="w-[7mm] shrink-0">{index + 1}.</span>
              <span>{method}</span>
            </li>
          ))}
        </ol>
      </div>
    ),
  },
  {
    key: 'findings',
    node: (
      <div className="pt-[4mm]">
        <p className={heading}>Findings and Conclusions</p>
        <p className="whitespace-pre-wrap text-justify">{data.findings ? <Findings text={data.findings} /> : ' '}</p>
      </div>
    ),
  },
  {
    key: 'marked',
    node: <p className="pt-[5mm]">The items have been marked <strong>{data.gckNo}</strong> for identification.</p>,
  },
  {
    key: 'witness',
    node: (
      <p className="relative pt-[5mm]">
        As witness my hand this <span className={dotted}>&nbsp;<PrintedDate date={data.approvalDate} dayOf />&nbsp;</span>.
        {/* The analysing officer signs at the right end of the line, rising into the space above it
            so the page never reflows. */}
        {data.analystSignature && (
          <img
            src={data.analystSignature}
            alt=""
            className="absolute bottom-[-2mm] right-0 h-[12mm] max-w-[45mm] object-contain object-right-bottom"
          />
        )}
      </p>
    ),
  },
  {
    key: 'signature',
    node: (
      <div className="flex justify-end pt-[3mm]">
        <div className="w-[58mm]">
          <div className="h-[14mm]" />
          <p className="font-bold">{data.signatoryName}</p>
          <p className="font-bold italic underline">GOVERNMENT ANALYST</p>
        </div>
      </div>
    ),
  },
  {
    key: 'end',
    node: (
      <div className="pt-[8mm]">
        <p className="font-bold">{data.refInitials}</p>
        <p className="pt-[4mm] text-center font-bold">-End of Report-</p>
      </div>
    ),
  },
];

/** Greedy page packing from measured block heights. */
const paginate = (heights: number[]) => {
  const limit = BODY_MM * MM_PX;
  const pages: number[][] = [[]];
  let used = 0;
  heights.forEach((height, index) => {
    if (used + height > limit && pages[pages.length - 1].length) {
      pages.push([]);
      used = 0;
    }
    pages[pages.length - 1].push(index);
    used += height;
  });
  return pages;
};

/**
 * The Report of Government Analyst as A4 pages, laid out like docs/government-analyst-report.png.
 * A long report flows onto a second page, with "-End of Report-" at the end. Used for the live
 * preview, printing and the PDF.
 */
export const GovernmentAnalystReportPages: React.FC<{
  data: GovernmentAnalystReportData;
  shadow?: boolean;
  onPageCount?: (count: number) => void;
}> = ({ data, shadow = true, onPageCount }) => {
  const blocks = useMemo(() => buildBlocks(data), [data]);
  const measureRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<number[][]>([blocks.map((_, i) => i)]);

  useLayoutEffect(() => {
    const root = measureRef.current;
    if (!root) return undefined;
    const repack = () => {
      const next = paginate(Array.from(root.children).map((child) => (child as HTMLElement).offsetHeight));
      setPages((previous) => (JSON.stringify(previous) === JSON.stringify(next) ? previous : next));
    };
    repack();
    const observer = new ResizeObserver(repack);
    Array.from(root.children).forEach((child) => observer.observe(child));
    return () => observer.disconnect();
  }, [blocks]);

  useLayoutEffect(() => {
    onPageCount?.(pages.length);
  }, [pages.length, onPageCount]);

  const body = 'text-[12pt] leading-[1.22] text-black';
  return (
    <>
      <div
        ref={measureRef}
        aria-hidden="true"
        className={`pointer-events-none invisible fixed -left-[10000px] top-0 ${body}`}
        style={{ width: `${210 - PAD_X * 2}mm`, fontFamily: SERIF }}
      >
        {blocks.map((block) => <div key={block.key}>{block.node}</div>)}
      </div>

      {pages.map((indices, pageIndex) => (
        <div
          key={pageIndex}
          className={`worksheet-page relative box-border h-[297mm] w-[210mm] shrink-0 overflow-hidden bg-white ${body} ${
            shadow ? 'shadow-[0_4px_24px_rgba(15,23,42,0.28)]' : ''
          }`}
          style={{ padding: `${PAD_TOP}mm ${PAD_X}mm ${PAD_BOTTOM}mm`, fontFamily: SERIF }}
        >
          {indices.map((index) => blocks[index] && <div key={blocks[index].key}>{blocks[index].node}</div>)}
          {pages.length > 1 && (
            <div className="absolute inset-x-[24mm] bottom-[6mm] text-center text-[9pt]">Page {pageIndex + 1} of {pages.length}</div>
          )}
        </div>
      ))}
    </>
  );
};
