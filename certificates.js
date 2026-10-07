// Signed Certificates of Analysis of Water.
//
// When the Head approves a memo, the server freezes what the certificate prints (the snapshot),
// hashes it with SHA-256 and signs the hash with an Ed25519 key only the server holds. The paper
// carries a QR code and serial pointing at the public verify page, which shows the stored original,
// so a figure changed on paper (or a forged certificate) shows up as a mismatch.
import {
  createHash,
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  sign,
  verify,
} from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const DEV_KEY_FILE = '.keys/certificate-signing-key.pem';

/** JSON with object keys sorted at every level, so the same content always hashes the same. */
export const canonicalJson = (value) => {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .filter((key) => value[key] !== undefined)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value ?? null);
};

export const sha256Hex = (text) => createHash('sha256').update(text, 'utf8').digest('hex');

/** The first ten hash characters, e.g. 3F9A1-C07B2, printed so the certificate can be checked by typing. */
export const shortCode = (hash) => `${hash.slice(0, 5)}-${hash.slice(5, 10)}`.toUpperCase();

let signingKey = null;

/**
 * The private key comes from CERTIFICATE_SIGNING_KEY (a PEM, "\n" escapes allowed) or the file named
 * by CERTIFICATE_SIGNING_KEY_FILE. Outside production a key is generated into .keys/ the first time,
 * so the feature works on a development machine; production refuses to issue without a configured key.
 */
export const loadSigningKey = () => {
  if (signingKey) return signingKey;
  let pem = process.env.CERTIFICATE_SIGNING_KEY?.replace(/\\n/g, '\n').trim();
  const file = process.env.CERTIFICATE_SIGNING_KEY_FILE || DEV_KEY_FILE;
  if (!pem && existsSync(file)) pem = readFileSync(file, 'utf8');
  if (!pem) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('CERTIFICATE_SIGNING_KEY is not configured, so certificates cannot be signed.');
    }
    const { privateKey } = generateKeyPairSync('ed25519');
    pem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, pem, { mode: 0o600 });
    console.warn(`Generated a development certificate signing key in ${file}. Set CERTIFICATE_SIGNING_KEY in production.`);
  }
  const privateKey = createPrivateKey(pem);
  if (privateKey.asymmetricKeyType !== 'ed25519') throw new Error('The certificate signing key must be an Ed25519 key.');
  const publicKey = createPublicKey(privateKey);
  const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
  const keyId = sha256Hex(publicKey.export({ type: 'spki', format: 'der' }).toString('base64')).slice(0, 16);
  signingKey = { privateKey, publicKeyPem, keyId };
  return signingKey;
};

export const signHash = (hash) => sign(null, Buffer.from(hash, 'utf8'), loadSigningKey().privateKey).toString('base64');

export const verifyHash = (hash, signature, publicKeyPem) => {
  try {
    return verify(null, Buffer.from(hash, 'utf8'), createPublicKey(publicKeyPem), Buffer.from(signature, 'base64'));
  } catch {
    return false;
  }
};

/** Results as printed: rows left blank are not part of the certificate. */
const printedResults = (results = {}) =>
  Object.fromEntries(
    Object.entries(results)
      .map(([id, entry]) => [id, { result: String(entry?.result ?? '').trim(), report: String(entry?.report ?? '') }])
      .filter(([, entry]) => entry.result || entry.report)
      .sort(([a], [b]) => a.localeCompare(b)),
  );

/**
 * Everything the certificate prints about the exhibit and its results, from an intake row in the
 * shape of the API projection. Names match the intake fields the certificate component reads.
 */
export const certificateContent = (intake) => ({
  exhibitId: intake.exhibitId,
  labReference: intake.labReference,
  sealNumber: intake.sealNumber ?? null,
  senderName: intake.senderName,
  senderAddress: intake.senderAddress,
  sourceCategory: intake.sourceCategory ?? null,
  sourceType: intake.sourceType ?? null,
  locationFrom: intake.locationFrom ?? null,
  dischargeTo: intake.dischargeTo ?? null,
  dateReceived: intake.dateReceived ?? null,
  dateSampled: intake.dateSampled ?? null,
  testType: intake.testType ?? null,
  analysisOfficer: intake.analysisOfficer ?? null,
  results: printedResults(intake.findingsResults?.results),
  remarks: String(intake.findingsResults?.remarks ?? '').trim(),
});

export const contentHash = (intake) => sha256Hex(canonicalJson(certificateContent(intake)));

/** The frozen, signed record of one issued certificate. */
export const buildSnapshot = ({ intake, serial, version, verificationId, issuedAt, issuedDate, approvedBy }) => ({
  schema: 1,
  type: 'CERTIFICATE_OF_ANALYSIS_OF_WATER',
  certificate: { serial, version, verificationId, issuedAt, issuedDate },
  document: { ...certificateContent(intake), approvedBy },
});
