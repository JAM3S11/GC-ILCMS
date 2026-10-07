import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, Search, ShieldAlert, XCircle } from 'lucide-react';
import coatOfArms from '../../assets/COURTOFARMS-removebg-preview.png';
import { ApiError, apiRequest } from '../../lib/api';
import { CertificateVerification, fieldsFromSnapshot } from '../../lib/waterCertificates';
import { WaterCertificatePreview } from '../laboratory/WaterCertificatePreview';

/** /verify/<verificationId>, or /verify alone for the typed serial + code lookup. */
const verificationIdFromPath = () => window.location.pathname.match(/^\/verify\/([0-9a-f-]{36})\/?$/i)?.[1] ?? '';

type Outcome =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'found'; data: CertificateVerification }
  | { kind: 'missing'; message: string };

const STATUS_COPY: Record<CertificateVerification['status'], { title: string; body: string; tone: string; icon: React.ReactNode }> = {
  CURRENT: {
    title: 'Genuine and current',
    body: 'This certificate was issued and signed by the Government Chemist. Check that every figure on your paper matches the certificate shown below.',
    tone: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    icon: <CheckCircle2 className="h-6 w-6 text-emerald-600" />,
  },
  SUPERSEDED: {
    title: 'Superseded',
    body: 'This certificate was genuine but has been replaced by a corrected version. Rely on the newer version only.',
    tone: 'border-amber-200 bg-amber-50 text-amber-900',
    icon: <AlertTriangle className="h-6 w-6 text-amber-600" />,
  },
  REVOKED: {
    title: 'Revoked — not valid',
    body: 'The Government Chemist has withdrawn this certificate. The paper must not be relied on.',
    tone: 'border-rose-200 bg-rose-50 text-rose-900',
    icon: <XCircle className="h-6 w-6 text-rose-600" />,
  },
  INVALID_SIGNATURE: {
    title: 'Signature check failed',
    body: 'The stored record does not match its digital signature. Do not rely on this certificate; contact the Government Chemist.',
    tone: 'border-rose-200 bg-rose-50 text-rose-900',
    icon: <ShieldAlert className="h-6 w-6 text-rose-600" />,
  },
};

const WATERMARK: Partial<Record<CertificateVerification['status'], string>> = {
  SUPERSEDED: 'SUPERSEDED',
  REVOKED: 'REVOKED',
  INVALID_SIGNATURE: 'NOT VERIFIED',
};

const formatDate = (value: string | null) => (value ? new Date(value).toLocaleString() : '—');

/**
 * The public, no-sign-in page a QR code on a certificate leads to. It shows whether the certificate is
 * genuine and current, and the signed original, so a reader can compare it with the paper in hand.
 */
export const CertificateVerifyPage: React.FC = () => {
  const [outcome, setOutcome] = useState<Outcome>({ kind: 'idle' });
  const [serial, setSerial] = useState('');
  const [code, setCode] = useState('');

  const load = async (path: string) => {
    setOutcome({ kind: 'loading' });
    try {
      const data = await apiRequest<CertificateVerification>(path);
      setOutcome({ kind: 'found', data });
    } catch (cause) {
      setOutcome({
        kind: 'missing',
        message:
          cause instanceof ApiError && cause.status === 429
            ? cause.message
            : cause instanceof Error
              ? cause.message
              : 'The certificate could not be checked.',
      });
    }
  };

  useEffect(() => {
    document.title = 'Verify a certificate · Government Chemist';
    const id = verificationIdFromPath();
    if (id) void load(`/api/public/certificates/${id}`);
  }, []);

  const lookup = (event: React.FormEvent) => {
    event.preventDefault();
    void load(`/api/public/certificates?serial=${encodeURIComponent(serial.trim())}&code=${encodeURIComponent(code.trim())}`);
  };

  const found = outcome.kind === 'found' ? outcome.data : null;
  const doc = found?.snapshot.document;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900" style={{ colorScheme: 'light' }}>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-4">
          <img src={coatOfArms} alt="" className="h-10 w-auto" />
          <div>
            <p className="text-sm font-semibold">Government Chemist&apos;s Department</p>
            <p className="text-xs text-slate-500">Certificate verification</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-5 px-4 py-6">
        <form onSubmit={lookup} className="rounded-xl border border-slate-200 bg-white p-4">
          <h1 className="text-base font-semibold">Check a Certificate of Analysis</h1>
          <p className="mt-1 text-[13px] text-slate-600">
            Scan the QR code on the certificate, or type the certificate number and the 10-character code printed at the foot of each page.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <label className="block text-[12px] font-medium text-slate-700">
              Certificate number
              <input
                value={serial}
                onChange={(event) => setSerial(event.target.value)}
                placeholder="GC-WAT-2026-000123"
                className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 font-mono text-sm uppercase outline-none focus:border-sky-500"
              />
            </label>
            <label className="block text-[12px] font-medium text-slate-700">
              Code
              <input
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="3F9A1-C07B2"
                className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 font-mono text-sm uppercase outline-none focus:border-sky-500"
              />
            </label>
            <button
              type="submit"
              disabled={outcome.kind === 'loading' || !serial.trim() || !code.trim()}
              className="inline-flex h-10 items-center justify-center gap-2 self-end rounded-md bg-slate-900 px-4 text-sm font-semibold text-white disabled:opacity-50"
            >
              <Search className="h-4 w-4" /> Check
            </button>
          </div>
        </form>

        {outcome.kind === 'loading' && (
          <p className="flex items-center gap-2 text-sm text-slate-600">
            <Loader2 className="h-4 w-4 animate-spin" /> Checking the certificate…
          </p>
        )}

        {outcome.kind === 'missing' && (
          <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-900">
            <XCircle className="h-6 w-6 shrink-0 text-rose-600" />
            <div>
              <p className="font-semibold">Not found</p>
              <p className="mt-0.5 text-[13px]">{outcome.message}</p>
            </div>
          </div>
        )}

        {found && doc && (
          <>
            <section className={`flex items-start gap-3 rounded-xl border p-4 ${STATUS_COPY[found.status].tone}`} aria-live="polite">
              {STATUS_COPY[found.status].icon}
              <div className="min-w-0">
                <p className="text-base font-semibold">{STATUS_COPY[found.status].title}</p>
                <p className="mt-0.5 text-[13px]">{STATUS_COPY[found.status].body}</p>
                {found.status === 'REVOKED' && found.revokeReason && (
                  <p className="mt-1 text-[13px]">
                    Revoked {formatDate(found.revokedAt)}: {found.revokeReason}
                  </p>
                )}
                {found.supersededBy && (
                  <a href={`/verify/${found.supersededBy.verificationId}`} className="mt-1 inline-block text-[13px] font-semibold underline">
                    Open the current version, {found.supersededBy.serial}
                  </a>
                )}
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="text-sm font-semibold">Key facts from the signed record</h2>
              <dl className="mt-3 grid gap-x-6 gap-y-2 text-[13px] sm:grid-cols-2">
                {[
                  ['Certificate number', `${found.serial}${found.version > 1 ? ` (version ${found.version})` : ''}`],
                  ['Code', found.shortCode],
                  ['Laboratory sample No.', doc.exhibitId],
                  ['Reference', doc.labReference],
                  ['Sender', doc.senderName],
                  ['Date received', doc.dateReceived ?? '—'],
                  ['Date issued', found.snapshot.certificate.issuedDate],
                  ['Approved by', doc.approvedBy],
                  ['Analysis officer', doc.analysisOfficer ?? '—'],
                  ['Seal number', doc.sealNumber ?? '—'],
                ].map(([label, value]) => (
                  <div key={label} className="grid grid-cols-[10rem_minmax(0,1fr)] gap-2">
                    <dt className="text-slate-500">{label}</dt>
                    <dd className="break-words font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
              <details className="mt-3 text-[12px] text-slate-600">
                <summary className="cursor-pointer font-medium">Digital signature details</summary>
                <dl className="mt-2 space-y-1 break-all font-mono text-[11px]">
                  <div>Signature: {found.signatureValid ? 'valid (Ed25519)' : 'INVALID'}</div>
                  <div>Key ID: {found.keyId}</div>
                  <div>SHA-256: {found.snapshotHash}</div>
                  <div>Signature: {found.signature}</div>
                </dl>
                <p className="mt-1">
                  The public keys are published at <a className="underline" href="/api/public/certificate-keys">/api/public/certificate-keys</a>.
                </p>
              </details>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-3">
              <h2 className="mb-2 px-1 text-sm font-semibold">The certificate as issued</h2>
              <div className="rounded-lg bg-slate-100 p-3">
                <WaterCertificatePreview
                  intake={fieldsFromSnapshot(found.snapshot)}
                  entries={doc.results}
                  remarks={doc.remarks}
                  issue={{
                    serial: found.serial,
                    version: found.version,
                    shortCode: found.shortCode,
                    verifyUrl: window.location.origin + `/verify/${found.verificationId}`,
                  }}
                  watermark={WATERMARK[found.status]}
                />
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
};
