import { WaterIntake } from '../types';
import { WaterTestEntry } from '../lib/waterTestParameters';

/**
 * The sample certificate from docs/certificate-page1.png and docs/certificate-page2.png, as typed
 * data. It is a fixture for checking the certificate layout against the original; production code
 * never reads it. Reports are listed as on the printed certificate, including the rows where the
 * laboratory reported "Acceptable" although the limit is "-".
 */
const row = (result: string, report: string): WaterTestEntry => ({ result, report });

export const SAMPLE_WATER_CERTIFICATE: {
  intake: WaterIntake;
  entries: Record<string, WaterTestEntry>;
  remarks: string;
} = {
  intake: {
    id: 'sample-certificate',
    labReference: 'P/WAT/VOL.II/2026 (051)',
    exhibitId: 'W164/2026',
    senderType: 'Organisation',
    senderName: 'Moi Teaching and Refereal Hospital',
    senderAddress: 'P.O BOX 3-301000',
    receivingOfficer: 'Sample Officer',
    analysisOfficer: 'Sample Analyst',
    dateReceived: '2026-09-04',
    dateSampled: '2026-09-14',
    testType: 'Full Chemical Analysis',
    sourceCategory: 'Potable Water',
    sourceType: 'Treated portable water',
    locationFrom: 'ELDOWAS, R01 & 2:R Water',
    charges: 5000,
    status: 'Analysis Complete',
    completedDate: '2026-09-23',
    certificateIssuedAt: '2026-09-23',
    certificateIssuedBy: 'Sample Head',
  },
  entries: {
    colour: row('8.0', 'Acceptable'),
    deposit: row('Not detected', 'Acceptable'),
    ph: row('7.55', 'Acceptable'),
    turbidity: row('1.30', 'Acceptable'),
    odour: row('Not detected', 'Acceptable'),
    conductivity: row('19.07', 'Acceptable'),
    total_alkalinity: row('5.0', 'Acceptable'),
    phenolphthalein: row('BDL', 'Acceptable'),
    methyl_orange: row('5.0', 'Acceptable'),
    chloride: row('BDL', 'Acceptable'),
    sulphate: row('BDL', 'Acceptable'),
    phosphate: row('0.32', 'Acceptable'),
    nitrate: row('12.4', 'Acceptable'),
    nitrite: row('0.03', 'Acceptable'),
    fluoride: row('BDL', 'Acceptable'),
    sodium: row('4.12', 'Acceptable'),
    potassium: row('1.67', 'Acceptable'),
    calcium: row('1.0', 'Acceptable'),
    magnesium: row('0.6', 'Acceptable'),
    iron: row('0.04', 'Acceptable'),
    manganese: row('0.34', 'AAL'),
    carbonate_hardness: row('BDL', '-'),
    non_carbonate_hardness: row('BDL', '-'),
    total_hardness: row('5.0', 'Acceptable'),
    silica: row('8.0', 'Acceptable'),
    oxygen_absorbed: row('BDL', 'Acceptable'),
    tds: row('19.07', 'Acceptable'),
    ammonia: row('0.01', 'Acceptable'),
  },
  remarks: '',
};
