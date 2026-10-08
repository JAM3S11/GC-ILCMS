import React from 'react';
import coatOfArms from '../../assets/COURTOFARMS-removebg-preview.png';
import { SubSample } from '../../types';

/** Everything printed on the Analytical Sample Receipt Form (GCD/SOP/01/SRD/FOODS/F1). */
export interface SampleReceiptFormData {
  labSampleNo: string;
  date: string; // YYYY-MM-DD
  senderName: string;
  senderPhysicalAddress: string;
  senderPostalAddress: string;
  senderTelephone: string;
  sendersRefNo: string;
  submitterName: string;
  submitterSignature?: string | null;
  submitterIdType: 'ID' | 'POWER_OF_ENTRY';
  submitterIdNumber: string;
  subSamples: SubSample[];
  examinationRequired: string;
  feeKes: string;
  invoiceNumber: string;
  receiptNumber: string;
  receiverName: string;
  receiverSignature?: string | null;
  receivedDate: string; // YYYY-MM-DD
  stampImage?: string | null;
}

/** 2026-05-16 -> 16/05/2026, as written on the paper form. */
const paperDate = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
};

/** A label followed by a dotted line with the value written on it (blank line when empty). */
const Line: React.FC<{ label?: React.ReactNode; value?: React.ReactNode; className?: string; labelClassName?: string }> = ({
  label,
  value,
  className = '',
  labelClassName = '',
}) => (
  <div className={`flex min-w-0 items-end gap-[1.5mm] ${className}`}>
    {label && <span className={`shrink-0 whitespace-nowrap ${labelClassName}`}>{label}</span>}
    <span className="relative min-h-[6mm] min-w-0 flex-1 border-b border-dotted border-[#222] pb-[0.3mm] font-[cursive] text-[11.5pt] leading-[5.5mm] text-[#1e3a8a]">
      <span className="block truncate">{value || ' '}</span>
    </span>
  </div>
);

/** A dotted line holding an image (signature or stamp) instead of text. */
const ImageLine: React.FC<{ label: string; src?: string | null; className?: string; height?: string }> = ({ label, src, className = '', height = '9mm' }) => (
  <div className={`flex min-w-0 items-end gap-[1.5mm] ${className}`}>
    <span className="shrink-0 whitespace-nowrap">{label}</span>
    <span className="relative min-w-0 flex-1 border-b border-dotted border-[#222]" style={{ height }}>
      {src && <img src={src} alt="" className="absolute bottom-[0.5mm] left-[1mm] h-full max-w-full object-contain" />}
    </span>
  </div>
);

/** Breaks long text into dotted-line rows, padding with blank lines like the printed form. */
const textRows = (text: string, perRow: number, minRows: number) => {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const rows: string[] = [];
  let current = '';
  words.forEach((word) => {
    if ((current + ' ' + word).trim().length > perRow && current) {
      rows.push(current);
      current = word;
    } else {
      current = (current + ' ' + word).trim();
    }
  });
  if (current) rows.push(current);
  while (rows.length < minRows) rows.push('');
  return rows;
};

interface SampleReceiptFormPageProps {
  data: SampleReceiptFormData;
  /** Adds the on-screen page shadow; off for print and PDF output. */
  shadow?: boolean;
}

/**
 * The Analytical Sample Receipt Form drawn at exactly A4 portrait (210mm × 297mm),
 * laid out like the paper form it replaces. Used for the live preview, printing
 * and the PDF download, so all three always match.
 */
export const SampleReceiptFormPage = React.forwardRef<HTMLDivElement, SampleReceiptFormPageProps>(({ data, shadow = true }, ref) => {
  const samples = data.subSamples.length ? data.subSamples : [{ subSampleNo: '', description: '' }];
  const sampleRows = [...samples, ...Array.from({ length: Math.max(0, 3 - samples.length) }, () => null)];
  const examinationRows = textRows(data.examinationRequired, 70, 4);
  const senderLine1 = [data.senderName, data.senderPhysicalAddress].filter(Boolean).join(', ');
  const senderLine2 = [data.senderPostalAddress, data.senderTelephone && `Tel: ${data.senderTelephone}`].filter(Boolean).join(', ');
  const isPowerOfEntry = data.submitterIdType === 'POWER_OF_ENTRY';

  return (
    <div
      ref={ref}
      className={`receipt-form-page relative box-border flex h-[297mm] w-[210mm] flex-col overflow-hidden bg-white px-[18mm] pb-[14mm] pt-[12mm] font-serif text-[11pt] leading-snug text-[#111] ${
        shadow ? 'shadow-[0_4px_24px_rgba(15,23,42,0.28)]' : ''
      }`}
      aria-label="Analytical sample receipt form"
    >
      {/* Letterhead */}
      <div className="flex justify-center">
        <img src={coatOfArms} alt="Coat of arms of Kenya" className="h-[22mm] w-auto object-contain" />
      </div>
      <h1 className="mt-[2mm] text-center font-serif text-[15pt] font-bold tracking-[0.02em]">
        MINISTRY OF INTERIOR AND NATIONAL ADMINISTRATION
      </h1>
      <div className="mt-[2mm] flex items-start justify-between gap-[6mm] text-[9.5pt]">
        <div className="space-y-[0.5mm]">
          <div><span className="font-bold">Telephone:</span> +254 20-2336300; 20-2336214</div>
          <div className="pl-[19mm]">+254 20 2725806/7; 20 2725873/4</div>
          <div><span className="font-bold">Email:</span> gchemist@interior.go.ke</div>
        </div>
        <div className="text-right">
          <div>Government Chemists Department</div>
          <div>P.O. Box 20753 - 00202</div>
          <div className="font-bold underline">NAIROBI</div>
        </div>
      </div>

      <h2 className="mt-[6mm] text-center text-[11.5pt] font-bold underline underline-offset-[1mm]">ANALYTICAL SAMPLE RECEIPT FORM</h2>

      {/* Body */}
      <div className="mt-[6mm] flex flex-1 flex-col gap-[3.2mm]">
        <div className="flex gap-[4mm]">
          <Line label="LAB. SAMPLE NO:" value={data.labSampleNo} className="flex-[3]" />
          <Line label="DATE:" value={paperDate(data.date)} className="flex-[2]" />
        </div>

        <div className="flex gap-[4mm]">
          <span className="whitespace-nowrap">SENDER <span className="text-[9.5pt]">(Name: Physical &amp; Postal address: Tel No.)</span></span>
          <Line label="SENDER'S REF. NO" value={data.sendersRefNo} className="flex-1" />
        </div>
        <Line value={senderLine1} />
        <Line value={senderLine2} />

        <div className="mt-[1mm]">NAME AND IDENTIFICATION OF PERSON SUBMITTING THE SAMPLE</div>
        <div className="flex gap-[4mm]">
          <Line label="NAME" value={data.submitterName} className="flex-[3]" />
          <ImageLine label="SIGN." src={data.submitterSignature} className="flex-[2]" />
        </div>
        <Line
          label={
            <>
              <span className={isPowerOfEntry ? 'line-through' : ''}>ID</span> /
              <span className={isPowerOfEntry ? '' : 'line-through'}>POWER OF ENTRY</span>{' '}
              <span className="text-[9.5pt]">(delete what is not applicable)</span>
            </>
          }
          value={data.submitterIdNumber}
        />

        <div className="mt-[1mm]">DESCRIPTION OF SAMPLE/S <span className="text-[9.5pt]">(Including source and Location)</span></div>
        {sampleRows.map((row, index) => (
          <Line
            key={index}
            label={row ? `(${index + 1})` : undefined}
            value={row ? [row.subSampleNo, row.description].filter(Boolean).join(' – ') : ''}
          />
        ))}

        <Line label="EXAMINATION REQUIRED:" value={examinationRows[0]} />
        {examinationRows.slice(1).map((row, index) => (
          <Line key={index} value={row} />
        ))}

        <div className="mt-[1mm] flex gap-[3mm]">
          <Line label="FEE: Kshs." value={data.feeKes} className="flex-[2]" />
          <Line label="INVOICE NO." value={data.invoiceNumber} className="flex-[2]" />
          <Line label="RECEIPT NO." value={data.receiptNumber} className="flex-[2]" />
        </div>

        <div className="mt-[1mm]">SAMPLE RECEIVED BY:</div>
        <div className="relative flex gap-[3mm]">
          <Line label="NAME" value={data.receiverName} className="flex-[3]" />
          <ImageLine label="SIGN." src={data.receiverSignature} className="flex-[2]" />
          <Line label="DATE & STAMP" value={paperDate(data.receivedDate)} className="flex-[2]" />
          {data.stampImage && (
            <img
              src={data.stampImage}
              alt="Department stamp"
              className="pointer-events-none absolute -top-[22mm] right-0 h-[32mm] w-[32mm] object-contain opacity-90"
            />
          )}
        </div>
      </div>

      {/* Document control box */}
      <div className="mt-[6mm] grid grid-cols-[1fr_auto] border border-[#222] text-[9.5pt]">
        <div className="flex items-end border-r border-[#222] px-[2mm] py-[1.5mm]">SAMPLE RECEIPT FORM</div>
        <div className="min-w-[62mm]">
          <div className="border-b border-[#222] px-[2mm] py-[0.8mm]">GCD/SOP/01/SRD/FOODS/F1</div>
          <div className="border-b border-[#222] px-[2mm] py-[0.8mm]">VERSION: 1</div>
          <div className="px-[2mm] py-[0.8mm]">PAGES: Page 1 of 1</div>
        </div>
      </div>
    </div>
  );
});
SampleReceiptFormPage.displayName = 'SampleReceiptFormPage';
