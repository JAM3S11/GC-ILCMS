import 'dotenv/config';
import express from 'express';
import rateLimit from 'express-rate-limit';
import nodemailer from 'nodemailer';
import pg from 'pg';
import {
  createHash,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const app = express();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const SESSION_COOKIE = 'gcilcms_session';
const SESSION_HOURS = 8;
const INVITE_MINUTES = 15;
const RESET_MINUTES = 30;
const validRoles = new Set([
  'CEO', 'VICE_CEO', 'ADMINISTRATOR', 'CLERK', 'ACCOUNTANT', 'HR', 'RECEPTIONIST',
  'HEAD_OF_DEPARTMENT', 'SENIOR_CHEMIST', 'ANALYST', 'INTERN', 'ATTACHEE',
  'QUALITY_MANAGER',
]);
const adminCreatableRoles = new Set([...validRoles, 'SUPER_ADMIN']);
const validDepartments = new Set([
  'Narcotics', 'Food & Drugs', 'Criminalistic', 'DNA', 'Instruments',
  'Water', 'Toxicology', 'Procurement', 'General Administration',
]);
// Mirrors src/lib/departments.ts. Keep the two in step: that file cannot be
// imported here because server.js runs outside the React tree.
const labScopedRoles = new Set([
  'ANALYST', 'SENIOR_CHEMIST', 'INTERN', 'ATTACHEE', 'HEAD_OF_DEPARTMENT',
]);
const GENERAL_ADMINISTRATION = 'General Administration';
const laboratoryDepartments = new Set(
  [...validDepartments].filter((name) => name !== GENERAL_ADMINISTRATION),
);
const departmentsForRole = (role) =>
  (labScopedRoles.has(role) ? laboratoryDepartments : new Set([GENERAL_ADMINISTRATION]));

app.set('trust proxy', 1);
app.use((_req, res, next) => {
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});
app.use(express.json({ limit: '20kb' }));
app.use('/api', (req, res, next) => {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
  const origin = req.get('origin');
  if (!origin) return next();
  try {
    if (new URL(origin).origin !== `${req.protocol}://${req.get('host')}`) {
      return res.status(403).json({ error: 'Cross-origin requests are not allowed.' });
    }
  } catch {
    return res.status(403).json({ error: 'Invalid request origin.' });
  }
  next();
});

const hashToken = (token) => createHash('sha256').update(token).digest('hex');
const normalizeEmail = (email) => email.trim().toLowerCase();

// A department is mandatory and must belong to the one the role works in:
// laboratory roles take one of the eight labs, institution-wide roles take
// General Administration.
const isValidProfile = ({ fullName, email, role, department }, allowedRoles = validRoles) =>
  typeof fullName === 'string' && fullName.trim().length >= 2 && fullName.trim().length <= 150 &&
  typeof email === 'string' && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
  allowedRoles.has(role) &&
  typeof department === 'string' &&
  departmentsForRole(role).has(department);
const publicUser = (row) => ({
  id: row.id,
  name: row.full_name,
  email: row.email,
  role: row.role,
  department: row.department ?? undefined,
});

// A department has exactly one non-disabled Head of Department. Returns the
// conflicting row, if any, excluding `exceptId` (used when re-checking a role
// change for the account already being edited).
const findDepartmentHead = (db, department, exceptId = null) =>
  db.query(
    `SELECT id, full_name, email FROM users
     WHERE role = 'HEAD_OF_DEPARTMENT' AND department = $1 AND status <> 'DISABLED'
       AND ($2::uuid IS NULL OR id <> $2)
     LIMIT 1`,
    [department, exceptId],
  );
const departmentHeadError = (department, head) =>
  `${department} already has a Head of Department (${head.email}). Change that account's role first.`;

const passwordHash = async (password) => {
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, 64, {
    N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024,
  });
  return `scrypt$32768$8$1$${salt.toString('hex')}$${derived.toString('hex')}`;
};

const verifyPassword = async (password, encoded) => {
  const [algorithm, n, r, p, saltHex, hashHex] = (encoded ?? '').split('$');
  if (algorithm !== 'scrypt' || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = await scrypt(password, Buffer.from(saltHex, 'hex'), expected.length, {
    N: Number(n), r: Number(r), p: Number(p), maxmem: 64 * 1024 * 1024,
  });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
};

const audit = (db, actorId, actorEmail, action, recordType, recordId, details = {}) =>
  db.query(
    `INSERT INTO audit_log (actor_user_id, actor_email, action, record_type, record_id, details)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
    [actorId ?? null, actorEmail, action, recordType, recordId ?? null, JSON.stringify(details)],
  );

const createAdminNotification = (db, {
  title,
  message,
  type = 'info',
  linkAction,
  recordType = null,
  recordId = null,
}) => db.query(
  `INSERT INTO admin_notifications (title, message, type, link_action, record_type, record_id)
   VALUES ($1, $2, $3, $4, $5, $6)`,
  [title, message, type, linkAction, recordType, recordId],
);

const makeMailer = () => {
  const required = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD', 'MAIL_FROM', 'APP_URL'];
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length) throw new Error(`Email configuration is incomplete: ${missing.join(', ')}`);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER.trim(),
      pass: process.env.SMTP_PASSWORD.replace(/\s/g, ''),
    },
  });
};

const sendInvite = async (email, fullName, token, expiresAt) => {
  const url = new URL('/activate', process.env.APP_URL);
  url.searchParams.set('token', token);
  url.searchParams.set('expires', new Date(expiresAt).toISOString());
  await makeMailer().sendMail({
    from: process.env.MAIL_FROM,
    to: email,
    subject: 'Activate your GC-ILCMS account',
    text: `Hello ${fullName},\n\nYour GC-ILCMS account is ready to activate. This one-time link expires in 15 minutes:\n\n${url.toString()}\n\nIf you did not expect this invitation, contact your system administrator.`,
    html: `<p>Hello ${escapeHtml(fullName)},</p><p>Your GC-ILCMS account is ready to activate. This one-time link expires in <strong>15 minutes</strong>.</p><p><a href="${escapeHtml(url.toString())}">Activate account</a></p><p>If you did not expect this invitation, contact your system administrator.</p>`,
  });
};

const escapeHtml = (value) => value.replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));

// Issues a one-time reset token and mails the link. forcedBy is null for a
// self-service request and the acting admin id when a super-admin forces one.
// Any outstanding unused token is revoked first so only the newest link works.
const createPasswordReset = async (db, user, forcedBy = null) => {
  const token = randomBytes(32).toString('hex');
  await db.query(
    `UPDATE password_reset_tokens SET revoked_at = NOW()
     WHERE user_id = $1 AND used_at IS NULL AND revoked_at IS NULL`,
    [user.id],
  );
  const { rows } = await db.query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, forced_by)
     VALUES ($1, $2, NOW() + ($4::int * INTERVAL '1 minute'), $3) RETURNING expires_at`,
    [user.id, hashToken(token), forcedBy, RESET_MINUTES],
  );
  return { token, expiresAt: rows[0].expires_at };
};

const sendPasswordReset = async (email, fullName, token, expiresAt, forcedByName) => {
  const url = new URL('/reset-password', process.env.APP_URL);
  url.searchParams.set('token', token);
  url.searchParams.set('expires', new Date(expiresAt).toISOString());
  const opening = forcedByName
    ? `Your GC-ILCMS password was reset at the request of ${forcedByName}. Use the link below to choose a new one.`
    : 'We received a request to reset your GC-ILCMS password. Use the link below to choose a new one.';
  await makeMailer().sendMail({
    from: process.env.MAIL_FROM,
    to: email,
    subject: forcedByName ? 'Your GC-ILCMS password was reset' : 'Reset your GC-ILCMS password',
    text: `Hello ${fullName},\n\n${opening} This one-time link expires in ${RESET_MINUTES} minutes:\n\n${url.toString()}\n\nIf you did not expect this, contact your system administrator immediately and keep your current password.`,
    html: `<p>Hello ${escapeHtml(fullName)},</p><p>${escapeHtml(opening)} This one-time link expires in <strong>${RESET_MINUTES} minutes</strong>.</p><p><a href="${escapeHtml(url.toString())}">Choose a new password</a></p><p>If you did not expect this, contact your system administrator immediately and keep your current password.</p>`,
  });
};

const deliverPasswordReset = async (user, reset, forcedByName = null) => {
  if (!reset) return true;
  try {
    await sendPasswordReset(user.email, user.full_name, reset.token, reset.expiresAt, forcedByName);
    return true;
  } catch (error) {
    console.error('Password reset email delivery failed', {
      email: user.email,
      code: error.code,
      responseCode: error.responseCode,
      command: error.command,
    });
    return false;
  }
};

const createInvite = async (db, user, admin) => {
  const token = randomBytes(32).toString('hex');
  await db.query(
    `UPDATE account_invites SET revoked_at = NOW()
     WHERE user_id = $1 AND used_at IS NULL AND revoked_at IS NULL`,
    [user.id],
  );
  const { rows } = await db.query(
    `INSERT INTO account_invites (user_id, token_hash, expires_at, created_by)
     VALUES ($1, $2, NOW() + ($4::int * INTERVAL '1 minute'), $3) RETURNING expires_at`,
    [user.id, hashToken(token), admin.id, INVITE_MINUTES],
  );
  return { token, expiresAt: rows[0].expires_at };
};

const deliverInvite = async (user, invitation) => {
  if (!invitation) return true;
  try {
    await sendInvite(user.email, user.full_name, invitation.token, invitation.expiresAt);
    return true;
  } catch (error) {
    console.error('Invitation email delivery failed', {
      email: user.email,
      code: error.code,
      responseCode: error.responseCode,
      command: error.command,
    });
    return false;
  }
};

const requireSession = async (req, res, next) => {
  try {
    const token = req.cookies?.[SESSION_COOKIE] ?? readCookie(req.headers.cookie, SESSION_COOKIE);
    if (!token) return res.status(401).json({ error: 'Sign in is required.' });
    const { rows } = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.role, u.department
       FROM auth_sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = $1 AND s.expires_at > NOW() AND u.status = 'ACTIVE'`,
      [hashToken(token)],
    );
    if (!rows.length) {
      res.clearCookie(SESSION_COOKIE);
      return res.status(401).json({ error: 'Your session has expired. Sign in again.' });
    }
    req.user = rows[0];
    req.sessionHash = hashToken(token);
    next();
  } catch (error) {
    next(error);
  }
};

const requireSuperAdmin = (req, res, next) => {
  if (req.user?.role !== 'SUPER_ADMIN') return res.status(403).json({ error: 'Super-admin access is required.' });
  next();
};
const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

const receptionLabRoles = new Set(['ANALYST', 'SENIOR_CHEMIST', 'HEAD_OF_DEPARTMENT']);
const receptionReadRoles = new Set(['RECEPTIONIST', 'ADMINISTRATOR', 'CLERK', 'CEO', 'SUPER_ADMIN']);
const receptionWriteRoles = new Set(['RECEPTIONIST', 'ADMINISTRATOR', 'CLERK']);
const receptionCheckOutRoles = new Set([...receptionWriteRoles, 'CEO']);
const waterLabRoles = new Set(['ANALYST', 'SENIOR_CHEMIST', 'INTERN', 'ATTACHEE', 'HEAD_OF_DEPARTMENT']);
const waterTestTypes = new Set(['Full Chemical Analysis', 'Specific Chemical Analysis']);
const waterSourceTypes = {
  'Potable Water': new Set(['Municipal / Tap Supply', 'Borehole', 'Well', 'Spring', 'Bottled Water', 'Water Vending Point']),
  'Effluent Water': new Set(['Industrial', 'Domestic / Municipal Sewage', 'Hospital', 'Agricultural', 'Commercial']),
};
const waterCharges = {
  'Full Chemical Analysis': { Individual: 3000, Organisation: 5000 },
  'Specific Chemical Analysis': { Individual: 1000, Organisation: 1500 },
};
const WATER_STORAGE_LOCATION = 'Water & Environment Sample Store — Cold Room W-01';
const canReadReceptionVisit = (user, department) =>
  receptionReadRoles.has(user.role) ||
  (receptionLabRoles.has(user.role) && user.department === department);
const requireReceptionRead = (req, res, next) => {
  if (!receptionReadRoles.has(req.user?.role) && !receptionLabRoles.has(req.user?.role)) {
    return res.status(403).json({ error: 'Reception register access is required.' });
  }
  next();
};
const requireReceptionWrite = (req, res, next) => {
  if (!receptionWriteRoles.has(req.user?.role)) {
    return res.status(403).json({ error: 'Reception staff access is required.' });
  }
  next();
};
const requireWaterLab = (req, res, next) => {
  if (req.user?.role !== 'SUPER_ADMIN' &&
      (req.user?.department !== 'Water' || !waterLabRoles.has(req.user?.role))) {
    return res.status(403).json({ error: 'Water & Environment laboratory access is required.' });
  }
  next();
};
const waterIntakeProjection = `
  w.id,
  w.exhibit_number AS "exhibitId",
  w.seal_number AS "sealNumber",
  w.packaging,
  w.condition,
  w.storage_location AS "storageLocation",
  w.lab_reference AS "labReference",
  w.reception_visit_id AS "receptionVisitId",
  w.sender_type AS "senderType",
  w.sender_name AS "senderName",
  w.sender_address AS "senderAddress",
  w.sender_mobile AS "senderMobile",
  w.contact_person AS "contactPerson",
  w.contact_person_mobile AS "contactPersonMobile",
  received.full_name AS "receivingOfficer",
  w.receiving_officer_id AS "receivingOfficerId",
  TO_CHAR(w.date_received, 'YYYY-MM-DD') AS "dateReceived",
  w.supporting_documents AS "supportingDocuments",
  w.remarks,
  w.test_type AS "testType",
  w.specific_parameters AS "specificParameters",
  w.source_category AS "sourceCategory",
  w.source_type AS "sourceType",
  w.location_from AS "locationFrom",
  w.discharge_to AS "dischargeTo",
  w.charges,
  w.receipt_number AS "receiptNumber",
  w.status,
  approver.full_name AS "approvedBy",
  TO_CHAR(w.approved_at AT TIME ZONE 'Africa/Nairobi', 'YYYY-MM-DD') AS "approvedDate",
  assigned.full_name AS "analysisOfficer",
  w.analysis_officer_id AS "analysisOfficerId",
  assigner.full_name AS "assignedBy",
  TO_CHAR(w.assigned_at AT TIME ZONE 'Africa/Nairobi', 'YYYY-MM-DD') AS "assignedDate",
  completer.full_name AS "completedBy",
  TO_CHAR(w.completed_at AT TIME ZONE 'Africa/Nairobi', 'YYYY-MM-DD') AS "completedDate",
  TO_CHAR(w.created_at AT TIME ZONE 'Africa/Nairobi', 'YYYY-MM-DD') AS "createdAt",
  (w.edited_at IS NOT NULL) AS "edited",
  TO_CHAR(w.edited_at AT TIME ZONE 'Africa/Nairobi', 'YYYY-MM-DD') AS "editedDate"`;
const waterIntakeJoins = `
  JOIN users received ON received.id = w.receiving_officer_id
  LEFT JOIN users approver ON approver.id = w.approved_by
  LEFT JOIN users assigned ON assigned.id = w.analysis_officer_id
  LEFT JOIN users assigner ON assigner.id = w.assigned_by
  LEFT JOIN users completer ON completer.id = w.completed_by`;
const appendWaterIntakeEvent = (db, intakeId, eventType, actorId, fromStatus, toStatus, details = {}) =>
  db.query(
    `INSERT INTO water_exhibit_intake_events (intake_id, event_type, actor_user_id, from_status, to_status, details)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
    [intakeId, eventType, actorId, fromStatus, toStatus, JSON.stringify(details)],
  );
const LAB_NOTIFICATION_RESEND_AFTER_SECONDS = 60;
// True once any lab-side user of the destination department has read the
// latest lab notification for the visit (reception staff reads don't count).
const labNotificationSeenSql = `EXISTS (
    SELECT 1
    FROM reception_activity_notifications n
    JOIN reception_activity_notification_reads r ON r.notification_id = n.id
    JOIN users u ON u.id = r.user_id
    WHERE n.related_visit_id = reception_visits.id
      AND n.link_action = 'RECEPTION_LAB_BAY'
      AND n.created_at >= reception_visits.lab_notification_sent_at
      AND r.read_at IS NOT NULL
      AND u.department = reception_visits.destination_department
      AND u.role IN (${[...receptionLabRoles].map((role) => `'${role}'`).join(', ')})
  )`;
const receptionVisitProjection = `
  id,
  visit_number AS "visitNumber",
  visitor_type AS "visitorType",
  visitor_name AS "officerName",
  CONCAT(REPEAT('•', GREATEST(LENGTH(national_id) - 4, 0)), RIGHT(national_id, 4)) AS "nationalId",
  phone,
  badge_number AS "badgeNumber",
  station_or_organization AS station,
  vehicle_registration AS "vehicleRegistration",
  postal_address AS "poBox",
  destination_department AS laboratory,
  lab_notification_sent_at AS "labNotificationSentAt",
  ${labNotificationSeenSql} AS "labNotificationSeen",
  TO_CHAR(arrived_at AT TIME ZONE 'Africa/Nairobi', 'YYYY-MM-DD') AS date,
  arrived_at AS "arrivedAt",
  TO_CHAR(arrived_at AT TIME ZONE 'Africa/Nairobi', 'HH12:MI AM') AS "timeIn",
  TO_CHAR(departed_at AT TIME ZONE 'Africa/Nairobi', 'HH12:MI AM') AS "timeOut",
  purpose_of_visit AS "purposeOfVisit",
  documents_presented AS "documentsPresented",
  exhibits_summary AS "exhibitsPresented",
  (SELECT full_name FROM users WHERE id = registered_by) AS "receptionistName",
  FALSE AS "signatureCaptured",
  CASE status
    WHEN 'AWAITING_LAB_RECEPTION' THEN 'Awaiting Laboratory Reception'
    WHEN 'IN_LABORATORY' THEN 'In Laboratory'
    WHEN 'COMPLETED' THEN 'Completed'
    WHEN 'DEPARTED' THEN 'Departed'
  END AS status`;

const appendReceptionEvent = (db, visitId, eventType, actorId, fromStatus, toStatus, details = {}) =>
  db.query(
    `INSERT INTO reception_visit_events (visit_id, event_type, actor_user_id, from_status, to_status, details)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
    [visitId, eventType, actorId, fromStatus, toStatus, JSON.stringify(details)],
  );

const createReceptionActivityNotification = (db, {
  recipientRole = null,
  recipientDepartment = null,
  title,
  message,
  type,
  linkAction,
  visitId,
}) => db.query(
  `INSERT INTO reception_activity_notifications (
     recipient_role, recipient_department, title, message, type, link_action, related_visit_id
   ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
  [recipientRole, recipientDepartment, title, message, type, linkAction, visitId],
);

const receptionNotificationAudience = (user) => ({
  role: user.role,
  department: user.department ?? null,
});

app.get('/api/notifications', requireSession, asyncHandler(async (req, res, next) => {
  const audience = receptionNotificationAudience(req.user);
  try {
    const { rows } = await pool.query(
      `SELECT n.id, n.title, n.message, n.type, n.link_action AS "linkAction",
              n.related_visit_id AS "relatedVisitorId",
              n.recipient_role AS "recipientRole",
              n.recipient_department AS "recipientDepartment",
              n.created_at AS "createdAt", (r.read_at IS NOT NULL) AS read
       FROM reception_activity_notifications n
       LEFT JOIN reception_activity_notification_reads r
         ON r.notification_id = n.id AND r.user_id = $1
       WHERE r.dismissed_at IS NULL
         AND (n.recipient_role = $2 OR n.recipient_department = $3)
       ORDER BY n.created_at DESC
       LIMIT 200`,
      [req.user.id, audience.role, audience.department],
    );
    res.json({ notifications: rows });
  } catch (error) {
    next(error);
  }
}));

app.patch('/api/notifications/read-all', requireSession, asyncHandler(async (req, res, next) => {
  const audience = receptionNotificationAudience(req.user);
  try {
    await pool.query(
      `INSERT INTO reception_activity_notification_reads (notification_id, user_id, read_at)
       SELECT n.id, $1, NOW()
       FROM reception_activity_notifications n
       WHERE n.recipient_role = $2 OR n.recipient_department = $3
       ON CONFLICT (notification_id, user_id)
       DO UPDATE SET read_at = NOW()`,
      [req.user.id, audience.role, audience.department],
    );
    res.json({ message: 'All notifications marked as read.' });
  } catch (error) {
    next(error);
  }
}));

app.patch('/api/notifications/:id/read', requireSession, asyncHandler(async (req, res, next) => {
  const { read } = req.body ?? {};
  if (typeof read !== 'boolean') return res.status(400).json({ error: 'Read must be true or false.' });
  const audience = receptionNotificationAudience(req.user);
  try {
    if (read) {
      const result = await pool.query(
        `INSERT INTO reception_activity_notification_reads (notification_id, user_id, read_at)
         SELECT n.id, $2, NOW()
         FROM reception_activity_notifications n
         WHERE n.id = $1 AND (n.recipient_role = $3 OR n.recipient_department = $4)
         ON CONFLICT (notification_id, user_id)
         DO UPDATE SET read_at = NOW(), dismissed_at = NULL`,
        [req.params.id, req.user.id, audience.role, audience.department],
      );
      if (!result.rowCount) return res.status(404).json({ error: 'Notification not found.' });
    } else {
      await pool.query(
        `DELETE FROM reception_activity_notification_reads r
         USING reception_activity_notifications n
         WHERE r.notification_id = n.id AND n.id = $1 AND r.user_id = $2
           AND (n.recipient_role = $3 OR n.recipient_department = $4)`,
        [req.params.id, req.user.id, audience.role, audience.department],
      );
    }
    res.json({ message: `Notification marked as ${read ? 'read' : 'unread'}.` });
  } catch (error) {
    next(error);
  }
}));

app.delete('/api/notifications/:id', requireSession, asyncHandler(async (req, res, next) => {
  const audience = receptionNotificationAudience(req.user);
  try {
    const result = await pool.query(
      `INSERT INTO reception_activity_notification_reads (notification_id, user_id, read_at, dismissed_at)
       SELECT n.id, $2, NOW(), NOW()
       FROM reception_activity_notifications n
       WHERE n.id = $1 AND (n.recipient_role = $3 OR n.recipient_department = $4)
       ON CONFLICT (notification_id, user_id)
       DO UPDATE SET read_at = COALESCE(reception_activity_notification_reads.read_at, NOW()),
                     dismissed_at = NOW()`,
      [req.params.id, req.user.id, audience.role, audience.department],
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Notification not found.' });
    res.json({ message: 'Notification dismissed.' });
  } catch (error) {
    next(error);
  }
}));

app.get('/api/reception/visits/stats', requireSession, requireReceptionRead, asyncHandler(async (req, res, next) => {
  const departmentFilter = receptionLabRoles.has(req.user.role) ? req.user.department : null;
  try {
    const { rows } = await pool.query(
      `WITH day_bounds AS (
         SELECT
           ((NOW() AT TIME ZONE 'Africa/Nairobi')::date::timestamp AT TIME ZONE 'Africa/Nairobi') AS starts_at,
           (((NOW() AT TIME ZONE 'Africa/Nairobi')::date + 1)::timestamp AT TIME ZONE 'Africa/Nairobi') AS ends_at
       )
       SELECT
         COUNT(*)::int AS "totalVisitors",
         COUNT(*) FILTER (WHERE v.status <> 'DEPARTED')::int AS "currentlyOnSite",
         COUNT(*) FILTER (WHERE v.status = 'AWAITING_LAB_RECEPTION')::int AS "awaitingLab",
         COUNT(*) FILTER (WHERE v.status = 'DEPARTED')::int AS "totalDeparted",
         COUNT(*) FILTER (WHERE v.arrived_at >= d.starts_at AND v.arrived_at < d.ends_at)::int AS "todayRegistered",
         COUNT(*) FILTER (WHERE v.arrived_at >= d.starts_at AND v.arrived_at < d.ends_at AND v.status = 'AWAITING_LAB_RECEPTION')::int AS "todayAwaitingLab",
         COUNT(*) FILTER (WHERE v.arrived_at >= d.starts_at AND v.arrived_at < d.ends_at AND v.status = 'IN_LABORATORY')::int AS "todayInLaboratory",
         COUNT(*) FILTER (WHERE v.arrived_at >= d.starts_at AND v.arrived_at < d.ends_at AND v.status = 'COMPLETED')::int AS "todayCompleted",
         COUNT(*) FILTER (WHERE v.departed_at >= d.starts_at AND v.departed_at < d.ends_at)::int AS "todayDeparted"
       FROM reception_visits v
       CROSS JOIN day_bounds d
       WHERE ($1::text IS NULL OR v.destination_department = $1)`,
      [departmentFilter],
    );
    res.json({ stats: rows[0] });
  } catch (error) {
    next(error);
  }
}));

app.get('/api/reception/visits', requireSession, requireReceptionRead, asyncHandler(async (req, res, next) => {
  const allDates = req.query.date === 'all';
  const date = allDates ? undefined : req.query.date;
  if (date !== undefined && (
    typeof date !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    Number.isNaN(Date.parse(`${date}T00:00:00Z`)) ||
    new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date
  )) {
    return res.status(400).json({ error: 'Date must use YYYY-MM-DD format.' });
  }
  if (typeof req.query.status === 'string' &&
      !['AWAITING_LAB_RECEPTION', 'IN_LABORATORY', 'COMPLETED', 'DEPARTED'].includes(req.query.status.replaceAll('-', '_').toUpperCase())) {
    return res.status(400).json({ error: 'Choose a valid visitor status.' });
  }
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 100, 1), 200);
  const before = req.query.before;
  const beforeId = req.query.beforeId;
  if ((before !== undefined || beforeId !== undefined) &&
      (typeof before !== 'string' || Number.isNaN(Date.parse(before)) ||
       typeof beforeId !== 'string' || !/^[0-9a-f-]{36}$/i.test(beforeId))) {
    return res.status(400).json({ error: 'The visit page cursor is invalid.' });
  }
  const departmentFilter = receptionLabRoles.has(req.user.role) ? req.user.department : null;
  try {
    const { rows } = await pool.query(
      `SELECT ${receptionVisitProjection}
       FROM reception_visits
       WHERE ($7::boolean OR (
           arrived_at >= ((COALESCE($1::date, (NOW() AT TIME ZONE 'Africa/Nairobi')::date))::timestamp AT TIME ZONE 'Africa/Nairobi')
           AND arrived_at < (((COALESCE($1::date, (NOW() AT TIME ZONE 'Africa/Nairobi')::date) + 1)::timestamp) AT TIME ZONE 'Africa/Nairobi')
         ))
         AND ($2::text IS NULL OR destination_department = $2)
         AND ($3::timestamptz IS NULL OR (arrived_at, id) < ($3::timestamptz, $4::uuid))
         AND ($5::text IS NULL OR status = $5)
       ORDER BY arrived_at DESC, id DESC
       LIMIT $6`,
      [date ?? null, departmentFilter, before ?? null, beforeId ?? null, typeof req.query.status === 'string' ? req.query.status.replaceAll('-', '_').toUpperCase() : null, limit + 1, allDates],
    );
    res.json({ visits: rows.slice(0, limit), hasMore: rows.length > limit, limit });
  } catch (error) {
    next(error);
  }
}));

app.get('/api/reception/visits/:id', requireSession, requireReceptionRead, asyncHandler(async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT ${receptionVisitProjection}
       FROM reception_visits
       WHERE id = $1
         AND ($2::text IS NULL OR destination_department = $2)`,
      [req.params.id, receptionLabRoles.has(req.user.role) ? req.user.department : null],
    );
    if (!rows.length) return res.status(404).json({ error: 'Visitor record not found.' });
    res.json({ visit: rows[0] });
  } catch (error) {
    next(error);
  }
}));

app.post('/api/reception/visits', requireSession, requireReceptionWrite, asyncHandler(async (req, res, next) => {
  const {
    visitorType, officerName, nationalId, phone, badgeNumber, station,
    vehicleRegistration, poBox, laboratory, purposeOfVisit, documentsPresented, exhibitsPresented,
  } = req.body ?? {};
  const isOfficer = visitorType === 'POLICE_OFFICER';
  const validDepartmentsForReception = new Set([...validDepartments].filter((name) => name !== GENERAL_ADMINISTRATION));
  if (
    !['POLICE_OFFICER', 'GENERAL_CLIENT'].includes(visitorType) ||
    typeof officerName !== 'string' || officerName.trim().length < 2 || officerName.trim().length > 150 ||
    typeof nationalId !== 'string' || nationalId.trim().length < 2 || nationalId.trim().length > 100 ||
    typeof phone !== 'string' || !/^(?:\+?254|0)\d{9}$/.test(phone.replace(/\s/g, '')) ||
    typeof station !== 'string' || station.trim().length < 2 || station.trim().length > 200 ||
    typeof laboratory !== 'string' || !validDepartmentsForReception.has(laboratory) ||
    typeof purposeOfVisit !== 'string' || purposeOfVisit.trim().length < 2 || purposeOfVisit.trim().length > 500 ||
    typeof exhibitsPresented !== 'string' || exhibitsPresented.trim().length > 2000 ||
    (isOfficer && (typeof badgeNumber !== 'string' || !/^\d{7,}$/.test(badgeNumber))) ||
    (!isOfficer && (typeof vehicleRegistration !== 'string' || vehicleRegistration.trim().length < 2)) ||
    (laboratory === 'Food & Drugs' && (typeof poBox !== 'string' || !/^\s*p\.?\s*o\.?\s*box\.?\s*\d{1,6}(\s*-\s*\d{1,6})?\s*$/i.test(poBox))) ||
    (laboratory === 'Water' && (typeof poBox !== 'string' || !/^\s*p\.?\s*o\.?\s*box\.?\s*\d{1,6}(\s*-\s*\d{1,6})?\s*$/i.test(poBox))) ||
    (documentsPresented !== undefined && (typeof documentsPresented !== 'string' || documentsPresented.length > 2000))
  ) {
    return res.status(400).json({ error: 'Provide valid visitor identity, contact, destination, and submission details.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO reception_visits (
         visitor_type, visitor_name, national_id, phone, badge_number, station_or_organization,
         vehicle_registration, postal_address, destination_department, purpose_of_visit,
         documents_presented, exhibits_summary, registered_by, lab_notification_sent_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
       RETURNING ${receptionVisitProjection}`,
      [
        visitorType, officerName.trim(), nationalId.trim(), phone.trim(),
        isOfficer ? badgeNumber.trim() : null, station.trim(),
        isOfficer ? null : vehicleRegistration.trim().toUpperCase(),
        laboratory === 'Food & Drugs' || laboratory === 'Water' ? poBox.trim() : null, laboratory,
        purposeOfVisit.trim(), typeof documentsPresented === 'string' ? documentsPresented.trim() : '',
        exhibitsPresented.trim(), req.user.id,
      ],
    );
    const visit = rows[0];
    await appendReceptionEvent(client, visit.id, 'REGISTERED', req.user.id, null, 'AWAITING_LAB_RECEPTION', {
      destinationDepartment: laboratory,
    });
    await appendReceptionEvent(client, visit.id, 'LAB_QUEUE_UPDATED', req.user.id, null, null, {
      destinationDepartment: laboratory,
      delivery: 'department-queue-poll',
    });
    await audit(client, req.user.id, req.user.email, 'VISITOR_REGISTERED', 'reception_visit', visit.id, {
      visitNumber: visit.visitNumber,
      destinationDepartment: laboratory,
    });
    await createReceptionActivityNotification(client, {
      recipientRole: 'RECEPTIONIST',
      title: 'New client added',
      message: `${visit.officerName} was added to the reception register as ${visit.visitNumber}.`,
      type: 'success',
      linkAction: 'RECEPTION_REGISTER',
      visitId: visit.id,
    });
    await appendReceptionEvent(client, visit.id, 'LAB_NOTIFIED', req.user.id, null, null, {
      destinationDepartment: laboratory,
      automatic: true,
    });
    await createReceptionActivityNotification(client, {
      recipientDepartment: laboratory,
      title: `Client arriving at ${laboratory}`,
      message: `${visit.officerName} (${visit.visitNumber}) has been registered at reception and is heading to ${laboratory}. Open the Lab Bay notification to receive the client and continue with intake.`,
      type: 'warning',
      linkAction: 'RECEPTION_LAB_BAY',
      visitId: visit.id,
    });
    await client.query('COMMIT');
    res.status(201).json({ visit });
  } catch (error) {
    await client.query('ROLLBACK');
    return next(error);
  } finally {
    client.release();
  }
}));

app.post('/api/reception/visits/:id/notify-lab', requireSession, asyncHandler(async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT id, visit_number, visitor_name, destination_department, status, lab_notification_sent_at,
              EXTRACT(EPOCH FROM (NOW() - lab_notification_sent_at)) AS seconds_since_notified,
              ${labNotificationSeenSql} AS lab_notification_seen
       FROM reception_visits WHERE id = $1 FOR UPDATE`,
      [req.params.id],
    );
    const visit = rows[0];
    if (!visit) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Visitor record not found.' });
    }
    const canNotify = receptionWriteRoles.has(req.user.role) ||
      (receptionLabRoles.has(req.user.role) && req.user.department === visit.destination_department);
    if (!canNotify) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Only reception staff or the destination laboratory can notify this visit.' });
    }
    if (visit.status === 'DEPARTED') {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'A departed visitor cannot be transferred to a laboratory.' });
    }
    const resend = req.body?.resend === true;
    if (visit.lab_notification_sent_at && !resend) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: `The ${visit.destination_department} laboratory has already been notified.` });
    }
    if (visit.lab_notification_sent_at) {
      if (visit.lab_notification_seen) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: `${visit.destination_department} has already seen the notification.` });
      }
      const waitSeconds = Math.ceil(LAB_NOTIFICATION_RESEND_AFTER_SECONDS - Number(visit.seconds_since_notified));
      if (waitSeconds > 0) {
        await client.query('ROLLBACK');
        return res.status(429).json({ error: `Wait ${waitSeconds}s before resending the notification to ${visit.destination_department}.` });
      }
    }
    await client.query(
      `UPDATE reception_visits
       SET lab_notification_sent_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [visit.id],
    );
    await appendReceptionEvent(client, visit.id, 'LAB_NOTIFIED', req.user.id, null, null, {
      destinationDepartment: visit.destination_department,
    });
    await audit(client, req.user.id, req.user.email, 'VISITOR_LAB_NOTIFIED', 'reception_visit', visit.id, {
      visitNumber: visit.visit_number,
      destinationDepartment: visit.destination_department,
    });
    await createReceptionActivityNotification(client, {
      recipientDepartment: visit.destination_department,
      title: `Client transferred to ${visit.destination_department}`,
      message: `${visit.visitor_name} (${visit.visit_number}) ${resend ? 'was re-notified to' : 'has been transferred to'} ${visit.destination_department}. Open the Lab Bay notification to receive the client and continue with intake.`,
      type: 'warning',
      linkAction: 'RECEPTION_LAB_BAY',
      visitId: visit.id,
    });
    await client.query('COMMIT');
    res.json({
      message: `${visit.destination_department} has been notified about ${visit.visit_number}.`,
      notifiedAt: new Date().toISOString(),
    });
  } catch (error) {
    await client.query('ROLLBACK');
    return next(error);
  } finally {
    client.release();
  }
}));

app.get('/api/reception/visits/:id/national-id', requireSession, requireReceptionRead, asyncHandler(async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      'SELECT id, national_id, destination_department FROM reception_visits WHERE id = $1',
      [req.params.id],
    );
    const visit = rows[0];
    if (!visit || !canReadReceptionVisit(req.user, visit.destination_department)) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Visitor record not found.' });
    }
    await appendReceptionEvent(client, visit.id, 'NATIONAL_ID_REVEALED', req.user.id, null, null);
    await audit(client, req.user.id, req.user.email, 'VISITOR_NATIONAL_ID_REVEALED', 'reception_visit', visit.id);
    await client.query('COMMIT');
    res.setHeader('Cache-Control', 'no-store');
    res.json({ nationalId: visit.national_id });
  } catch (error) {
    await client.query('ROLLBACK');
    return next(error);
  } finally {
    client.release();
  }
}));

const transitionReceptionVisit = (eventType, fromStatus, toStatus, allowedRoleCheck) =>
  asyncHandler(async (req, res, next) => {
    if (!allowedRoleCheck(req.user)) {
      return res.status(403).json({ error: 'You are not authorized to update reception visit status.' });
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        'SELECT id, visit_number, destination_department, status FROM reception_visits WHERE id = $1 FOR UPDATE',
        [req.params.id],
      );
      const visit = rows[0];
      if (!visit || (receptionLabRoles.has(req.user.role) && visit.destination_department !== req.user.department)) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Visitor record not found.' });
      }
      if (visit.status !== fromStatus) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'This visit has changed or is not eligible for that action. Refresh the register.' });
      }
      const { rows: updatedRows } = await client.query(
        `UPDATE reception_visits
         SET status = $2,
             departed_at = CASE WHEN $2 = 'DEPARTED' THEN NOW() ELSE NULL END,
             checked_out_by = CASE WHEN $2 = 'DEPARTED' THEN $3::uuid ELSE NULL::uuid END,
             updated_at = NOW()
         WHERE id = $1 AND status = $4
         RETURNING ${receptionVisitProjection}`,
        [visit.id, toStatus, req.user.id, fromStatus],
      );
      if (!updatedRows.length) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'This visit has changed. Refresh the register and try again.' });
      }
      await appendReceptionEvent(client, visit.id, eventType, req.user.id, fromStatus, toStatus);
      await audit(client, req.user.id, req.user.email, `VISITOR_${eventType}`, 'reception_visit', visit.id, {
        visitNumber: visit.visit_number,
      });
      const activity = {
        LAB_RECEIVED: {
          title: 'Client received by laboratory',
          message: `The ${visit.destination_department} laboratory received client visit ${visit.visit_number}.`,
          type: 'info',
        },
        SERVICE_COMPLETED: {
          title: 'Client ready for checkout',
          message: `Laboratory service for visit ${visit.visit_number} is complete. The client is ready for reception checkout.`,
          type: 'success',
        },
        CHECKED_OUT: {
          title: 'Client checked out',
          message: `Client visit ${visit.visit_number} has completed service and checked out.`,
          type: 'info',
        },
      }[eventType];
      if (activity) {
        await createReceptionActivityNotification(client, {
          recipientRole: 'RECEPTIONIST',
          ...activity,
          linkAction: 'RECEPTION_REGISTER',
          visitId: visit.id,
        });
      }
      await client.query('COMMIT');
      res.json({ message: 'Visitor status updated.', visit: updatedRows[0] });
    } catch (error) {
      await client.query('ROLLBACK');
      return next(error);
    } finally {
      client.release();
    }
  });

app.post(
  '/api/reception/visits/:id/lab-received',
  requireSession,
  transitionReceptionVisit('LAB_RECEIVED', 'AWAITING_LAB_RECEPTION', 'IN_LABORATORY', (user) => receptionLabRoles.has(user.role)),
);
app.post(
  '/api/reception/visits/:id/service-completed',
  requireSession,
  transitionReceptionVisit('SERVICE_COMPLETED', 'IN_LABORATORY', 'COMPLETED', (user) => receptionLabRoles.has(user.role)),
);
app.post(
  '/api/reception/visits/:id/check-out',
  requireSession,
  transitionReceptionVisit('CHECKED_OUT', 'COMPLETED', 'DEPARTED', (user) => receptionCheckOutRoles.has(user.role)),
);

// Active laboratory staff of the caller's own department — the pool a Head of
// Department can assign exhibits to.
app.get('/api/department/officers', requireSession, asyncHandler(async (req, res, next) => {
  const department = req.user.role === 'SUPER_ADMIN' ? req.query.department : req.user.department;
  if (typeof department !== 'string' || !validDepartments.has(department)) {
    return res.status(400).json({ error: 'Choose a valid department.' });
  }
  try {
    const { rows } = await pool.query(
      `SELECT id, full_name AS name, role
       FROM users
       WHERE department = $1 AND status = 'ACTIVE' AND role = ANY($2::text[])
       ORDER BY full_name`,
      [department, [...waterLabRoles]],
    );
    res.json({ officers: rows });
  } catch (error) {
    next(error);
  }
}));

app.get('/api/water/intakes', requireSession, requireWaterLab, asyncHandler(async (req, res, next) => {
  try {
    const [intakes, officers] = await Promise.all([
      pool.query(
        `SELECT ${waterIntakeProjection}
         FROM water_exhibit_intakes w ${waterIntakeJoins}
         WHERE w.deleted_at IS NULL
         ORDER BY w.created_at DESC, w.id DESC
         LIMIT 500`,
      ),
      pool.query(
        `SELECT id, full_name AS name, role
         FROM users
         WHERE department = 'Water' AND status = 'ACTIVE' AND role = ANY($1::text[])
         ORDER BY full_name`,
        [[...waterLabRoles]],
      ),
    ]);
    res.json({ intakes: intakes.rows, officers: officers.rows });
  } catch (error) {
    next(error);
  }
}));

app.post('/api/water/intakes', requireSession, requireWaterLab, asyncHandler(async (req, res, next) => {
  const {
    receptionVisitId, senderType, senderName, senderAddress, senderMobile,
    contactPerson, contactPersonMobile, receivingOfficerId, dateReceived,
    testType, specificParameters, sourceCategory, sourceType, locationFrom,
    dischargeTo, receiptNumber, supportingDocuments, remarks,
  } = req.body ?? {};
  const isIndividual = senderType === 'Individual';
  const phonePattern = /^(?:\+?254|0)(?:7|1)\d{8}$/;
  const cleanPhone = (value) => typeof value === 'string' ? value.replace(/[\s-]/g, '') : '';
  const parameters = Array.isArray(specificParameters)
    ? [...new Set(specificParameters.map((value) => typeof value === 'string' ? value.trim() : ''))]
    : [];
  if (
    !['Individual', 'Organisation'].includes(senderType) ||
    typeof senderName !== 'string' || senderName.trim().length < 2 || senderName.trim().length > 200 ||
    typeof senderAddress !== 'string' || senderAddress.trim().length < 2 || senderAddress.trim().length > 300 ||
    (isIndividual && (!/^\s*p\.?\s*o\.?\s*box\.?\s*\d{1,6}(\s*-\s*\d{1,6})?\s*$/i.test(senderAddress) ||
      !phonePattern.test(cleanPhone(senderMobile)))) ||
    (!isIndividual && (typeof contactPerson !== 'string' || contactPerson.trim().length < 2 || contactPerson.trim().length > 150)) ||
    (typeof contactPersonMobile === 'string' && contactPersonMobile.trim() && !phonePattern.test(cleanPhone(contactPersonMobile))) ||
    !/^[0-9a-f-]{36}$/i.test(receivingOfficerId ?? '') ||
    !/^[0-9a-f-]{36}$/i.test(receptionVisitId ?? '') ||
    typeof dateReceived !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateReceived) ||
    Number.isNaN(Date.parse(`${dateReceived}T00:00:00Z`)) ||
    new Date(`${dateReceived}T00:00:00Z`).toISOString().slice(0, 10) !== dateReceived ||
    !waterTestTypes.has(testType) ||
    (testType === 'Specific Chemical Analysis' &&
      (!parameters.length || parameters.some((value) => !value || value.length > 100))) ||
    (testType === 'Full Chemical Analysis' && parameters.length > 0) ||
    !Object.hasOwn(waterSourceTypes, sourceCategory) ||
    !waterSourceTypes[sourceCategory]?.has(sourceType) ||
    typeof locationFrom !== 'string' || locationFrom.trim().length < 2 || locationFrom.trim().length > 300 ||
    (sourceCategory === 'Effluent Water' && !['Public Sewer', 'Environment'].includes(dischargeTo)) ||
    (sourceCategory === 'Potable Water' && dischargeTo != null && dischargeTo !== '') ||
    (receiptNumber != null && (typeof receiptNumber !== 'string' || receiptNumber.trim().length > 100)) ||
    (supportingDocuments != null && (typeof supportingDocuments !== 'string' || supportingDocuments.length > 2000)) ||
    (remarks != null && (typeof remarks !== 'string' || remarks.length > 1000))
  ) {
    return res.status(400).json({ error: 'Provide valid sender, receipt, test, source, and location details for the Water & Environment intake.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const visitResult = await client.query(
      `SELECT id FROM reception_visits
       WHERE id = $1 AND destination_department = 'Water'
         AND status IN ('AWAITING_LAB_RECEPTION', 'IN_LABORATORY')
         AND lab_notification_sent_at IS NOT NULL
       FOR UPDATE`,
      [receptionVisitId],
    );
    if (!visitResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'No client has been sent to the Water Lab for this visit. Reception must notify the laboratory before the exhibit can be registered.' });
    }
    const receiverResult = await client.query(
      `SELECT id FROM users
       WHERE id = $1 AND department = 'Water' AND status = 'ACTIVE'
         AND role = ANY($2::text[])`,
      [receivingOfficerId, [...waterLabRoles]],
    );
    if (!receiverResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Choose an active Water & Environment receiving officer.' });
    }
    const { rows: currentDate } = await client.query(
      `SELECT TO_CHAR((NOW() AT TIME ZONE 'Africa/Nairobi')::date, 'YYYY-MM-DD') AS today`,
    );
    if (dateReceived > currentDate[0].today) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Date received cannot be in the future.' });
    }
    const year = Number(dateReceived.slice(0, 4));
    const { rows: sequenceRows } = await client.query(
      `INSERT INTO water_intake_sequences (intake_year, last_value)
       VALUES ($1, 1)
       ON CONFLICT (intake_year) DO UPDATE
         SET last_value = water_intake_sequences.last_value + 1
       RETURNING last_value`,
      [year],
    );
    const sequence = sequenceRows[0].last_value;
    const labReference = `GC/MOI/WAT/VOL I/${String(sequence).padStart(3, '0')}/${year}`;
    const exhibitNumber = `WAT-${year}-${String(sequence).padStart(3, '0')}`;
    const sealNumber = `WE-SEAL-${randomBytes(5).toString('hex').toUpperCase()}`;
    const senderMobileValue = isIndividual ? cleanPhone(senderMobile) : null;
    const contactMobileValue = !isIndividual && typeof contactPersonMobile === 'string' && contactPersonMobile.trim()
      ? cleanPhone(contactPersonMobile)
      : null;
    const charge = waterCharges[testType][senderType];
    const { rows } = await client.query(
      `INSERT INTO water_exhibit_intakes (
         exhibit_number, seal_number, packaging, condition, storage_location, lab_reference,
         reception_visit_id, sender_type, sender_name, sender_address, sender_mobile, contact_person,
         contact_person_mobile, receiving_officer_id, registered_by, date_received,
         supporting_documents, remarks, test_type, specific_parameters, source_category, source_type,
         location_from, discharge_to, charges, receipt_number
       )
       VALUES ($1, $2, 'Sealed Water Sampling Bottle', 'Intact & Sealed', $3, $4, $5, $6, $7,
               $8, $9, $10, $11, $12, $13, $14::date, $15, $16, $17, $18::text[],
               $19, $20, $21, $22, $23, $24)
       RETURNING id`,
      [
        exhibitNumber, sealNumber, WATER_STORAGE_LOCATION, labReference, receptionVisitId, senderType,
        senderName.trim(), senderAddress.trim(), senderMobileValue,
        isIndividual ? null : contactPerson.trim(), contactMobileValue, receivingOfficerId, req.user.id,
        dateReceived, typeof supportingDocuments === 'string' ? supportingDocuments.trim() : '',
        typeof remarks === 'string' ? remarks.trim() : '', testType, parameters, sourceCategory, sourceType,
        locationFrom.trim(), sourceCategory === 'Effluent Water' ? dischargeTo : null, charge,
        typeof receiptNumber === 'string' && receiptNumber.trim() ? receiptNumber.trim() : null,
      ],
    );
    const intakeId = rows[0].id;
    await appendWaterIntakeEvent(client, intakeId, 'REGISTERED', req.user.id, null, 'Awaiting Approval', {
      exhibitNumber,
      receptionVisitId,
    });
    await audit(client, req.user.id, req.user.email, 'WATER_EXHIBIT_REGISTERED', 'water_exhibit_intake', intakeId, {
      exhibitNumber,
      labReference,
      receptionVisitId,
    });
    const intake = await client.query(
      `SELECT ${waterIntakeProjection}
       FROM water_exhibit_intakes w ${waterIntakeJoins}
       WHERE w.id = $1`,
      [intakeId],
    );
    await client.query('COMMIT');
    res.status(201).json({ intake: intake.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    return next(error);
  } finally {
    client.release();
  }
}));

// Document approval gate: the Head of Water & Environment reviews the submitted
// documents before an Analysis Officer can be assigned. Approval moves the
// exhibit from "Awaiting Approval" to "Awaiting Assignment".
app.post('/api/water/intakes/:id/approve', requireSession, requireWaterLab, asyncHandler(async (req, res, next) => {
  if (req.user.role !== 'SUPER_ADMIN' &&
      !(req.user.role === 'HEAD_OF_DEPARTMENT' && req.user.department === 'Water')) {
    return res.status(403).json({ error: 'Only the Head of Water & Environment can approve these documents.' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: current } = await client.query(
      `SELECT id, status, lab_reference FROM water_exhibit_intakes WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`,
      [req.params.id],
    );
    if (!current.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Water exhibit intake not found.' });
    }
    if (current[0].status !== 'Awaiting Approval') {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'This exhibit is not awaiting document approval. Refresh the Water register.' });
    }
    await client.query(
      `UPDATE water_exhibit_intakes
       SET status = 'Awaiting Assignment', approved_by = $2, approved_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [req.params.id, req.user.id],
    );
    await appendWaterIntakeEvent(client, req.params.id, 'APPROVED', req.user.id, 'Awaiting Approval', 'Awaiting Assignment', {});
    await audit(client, req.user.id, req.user.email, 'WATER_EXHIBIT_APPROVED', 'water_exhibit_intake', req.params.id, {
      labReference: current[0].lab_reference,
    });
    const { rows: updated } = await client.query(
      `SELECT ${waterIntakeProjection}
       FROM water_exhibit_intakes w ${waterIntakeJoins}
       WHERE w.id = $1`,
      [req.params.id],
    );
    await client.query('COMMIT');
    res.json({ intake: updated[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    return next(error);
  } finally {
    client.release();
  }
}));

app.post('/api/water/intakes/:id/assign', requireSession, requireWaterLab, asyncHandler(async (req, res, next) => {
  if (req.user.role !== 'SUPER_ADMIN' &&
      !(req.user.role === 'HEAD_OF_DEPARTMENT' && req.user.department === 'Water')) {
    return res.status(403).json({ error: 'Only the Head of Water & Environment can assign an Analysis Officer.' });
  }
  const { analysisOfficerId } = req.body ?? {};
  if (!/^[0-9a-f-]{36}$/i.test(analysisOfficerId ?? '')) {
    return res.status(400).json({ error: 'Choose a valid Water & Environment Analysis Officer.' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: current } = await client.query(
      `SELECT id, status, lab_reference FROM water_exhibit_intakes WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`,
      [req.params.id],
    );
    if (!current.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Water exhibit intake not found.' });
    }
    if (current[0].status !== 'Awaiting Assignment') {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: current[0].status === 'Awaiting Approval'
          ? 'Approve the submitted documents before assigning an Analysis Officer.'
          : 'This exhibit has already been assigned or completed. Refresh the Water register.',
      });
    }
    const { rows: officer } = await client.query(
      `SELECT id FROM users
       WHERE id = $1 AND department = 'Water' AND status = 'ACTIVE'
         AND role = ANY($2::text[])
       FOR UPDATE`,
      [analysisOfficerId, [...waterLabRoles].filter((role) => role !== 'HEAD_OF_DEPARTMENT')],
    );
    if (!officer.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Choose an active Water & Environment Analysis Officer.' });
    }
    await client.query(
      `UPDATE water_exhibit_intakes
       SET status = 'Under Analysis', analysis_officer_id = $2, assigned_by = $3,
           assigned_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [req.params.id, analysisOfficerId, req.user.id],
    );
    await appendWaterIntakeEvent(client, req.params.id, 'ASSIGNED', req.user.id, 'Awaiting Assignment', 'Under Analysis', {
      analysisOfficerId,
    });
    await audit(client, req.user.id, req.user.email, 'WATER_EXHIBIT_ASSIGNED', 'water_exhibit_intake', req.params.id, {
      labReference: current[0].lab_reference,
      analysisOfficerId,
    });
    const { rows: updated } = await client.query(
      `SELECT ${waterIntakeProjection}
       FROM water_exhibit_intakes w ${waterIntakeJoins}
       WHERE w.id = $1`,
      [req.params.id],
    );
    await client.query('COMMIT');
    res.json({ intake: updated[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    return next(error);
  } finally {
    client.release();
  }
}));

app.post('/api/water/intakes/:id/complete', requireSession, requireWaterLab, asyncHandler(async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: current } = await client.query(
      `SELECT id, status, lab_reference, analysis_officer_id
       FROM water_exhibit_intakes WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`,
      [req.params.id],
    );
    if (!current.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Water exhibit intake not found.' });
    }
    const intake = current[0];
    if (intake.status !== 'Under Analysis') {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'This exhibit is not currently under analysis.' });
    }
    const isHead = req.user.role === 'SUPER_ADMIN' ||
      (req.user.role === 'HEAD_OF_DEPARTMENT' && req.user.department === 'Water');
    if (!isHead && intake.analysis_officer_id !== req.user.id) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Only the assigned Analysis Officer or the Head can complete this exhibit.' });
    }
    await client.query(
      `UPDATE water_exhibit_intakes
       SET status = 'Analysis Complete', completed_by = $2, completed_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [req.params.id, req.user.id],
    );
    await appendWaterIntakeEvent(client, req.params.id, 'ANALYSIS_COMPLETED', req.user.id, 'Under Analysis', 'Analysis Complete');
    await audit(client, req.user.id, req.user.email, 'WATER_ANALYSIS_COMPLETED', 'water_exhibit_intake', req.params.id, {
      labReference: intake.lab_reference,
    });
    const { rows: updated } = await client.query(
      `SELECT ${waterIntakeProjection}
       FROM water_exhibit_intakes w ${waterIntakeJoins}
       WHERE w.id = $1`,
      [req.params.id],
    );
    await client.query('COMMIT');
    res.json({ intake: updated[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    return next(error);
  } finally {
    client.release();
  }
}));

// A registered intake can be corrected exactly once, and only before analysis
// starts. Sender details come from reception and are never editable here.
app.patch('/api/water/intakes/:id', requireSession, requireWaterLab, asyncHandler(async (req, res, next) => {
  const {
    receivingOfficerId, dateReceived, testType, specificParameters, sourceCategory,
    sourceType, locationFrom, dischargeTo, receiptNumber,
  } = req.body ?? {};
  const parameters = Array.isArray(specificParameters)
    ? [...new Set(specificParameters.map((value) => typeof value === 'string' ? value.trim() : ''))]
    : [];
  if (
    !/^[0-9a-f-]{36}$/i.test(receivingOfficerId ?? '') ||
    typeof dateReceived !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateReceived) ||
    Number.isNaN(Date.parse(`${dateReceived}T00:00:00Z`)) ||
    new Date(`${dateReceived}T00:00:00Z`).toISOString().slice(0, 10) !== dateReceived ||
    !waterTestTypes.has(testType) ||
    (testType === 'Specific Chemical Analysis' &&
      (!parameters.length || parameters.some((value) => !value || value.length > 100))) ||
    (testType === 'Full Chemical Analysis' && parameters.length > 0) ||
    !Object.hasOwn(waterSourceTypes, sourceCategory) ||
    !waterSourceTypes[sourceCategory]?.has(sourceType) ||
    typeof locationFrom !== 'string' || locationFrom.trim().length < 2 || locationFrom.trim().length > 300 ||
    (sourceCategory === 'Effluent Water' && !['Public Sewer', 'Environment'].includes(dischargeTo)) ||
    (sourceCategory === 'Potable Water' && dischargeTo != null && dischargeTo !== '') ||
    (receiptNumber != null && (typeof receiptNumber !== 'string' || receiptNumber.trim().length > 100))
  ) {
    return res.status(400).json({ error: 'Provide valid receipt, test, source, and location details.' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: current } = await client.query(
      `SELECT id, status, lab_reference, sender_type, edited_at
       FROM water_exhibit_intakes WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`,
      [req.params.id],
    );
    if (!current.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Water exhibit intake not found.' });
    }
    const intake = current[0];
    if (intake.edited_at) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'This intake has already been edited once and cannot be edited again.' });
    }
    if (!['Awaiting Approval', 'Awaiting Assignment'].includes(intake.status)) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'An intake cannot be edited once analysis has started.' });
    }
    const { rows: today } = await client.query(
      `SELECT TO_CHAR((NOW() AT TIME ZONE 'Africa/Nairobi')::date, 'YYYY-MM-DD') AS today`,
    );
    if (dateReceived > today[0].today) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Date received cannot be in the future.' });
    }
    const receiver = await client.query(
      `SELECT id FROM users
       WHERE id = $1 AND department = 'Water' AND status = 'ACTIVE' AND role = ANY($2::text[])`,
      [receivingOfficerId, [...waterLabRoles]],
    );
    if (!receiver.rows.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Choose an active Water & Environment receiving officer.' });
    }
    await client.query(
      `UPDATE water_exhibit_intakes
       SET receiving_officer_id = $2, date_received = $3::date, test_type = $4,
           specific_parameters = $5::text[], source_category = $6, source_type = $7,
           location_from = $8, discharge_to = $9, charges = $10, receipt_number = $11,
           edited_at = NOW(), edited_by = $12, updated_at = NOW()
       WHERE id = $1`,
      [
        req.params.id, receivingOfficerId, dateReceived, testType, parameters, sourceCategory, sourceType,
        locationFrom.trim(), sourceCategory === 'Effluent Water' ? dischargeTo : null,
        waterCharges[testType][intake.sender_type],
        typeof receiptNumber === 'string' && receiptNumber.trim() ? receiptNumber.trim() : null,
        req.user.id,
      ],
    );
    await appendWaterIntakeEvent(client, req.params.id, 'EDITED', req.user.id, intake.status, intake.status, {});
    await audit(client, req.user.id, req.user.email, 'WATER_EXHIBIT_EDITED', 'water_exhibit_intake', req.params.id, {
      labReference: intake.lab_reference,
    });
    const { rows: updated } = await client.query(
      `SELECT ${waterIntakeProjection}
       FROM water_exhibit_intakes w ${waterIntakeJoins}
       WHERE w.id = $1`,
      [req.params.id],
    );
    await client.query('COMMIT');
    res.json({ intake: updated[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    return next(error);
  } finally {
    client.release();
  }
}));

// Only the Head of Water & Environment removes an intake. It is a soft delete:
// the record leaves the register but its history and audit entries remain.
app.delete('/api/water/intakes/:id', requireSession, requireWaterLab, asyncHandler(async (req, res, next) => {
  if (!(req.user.role === 'HEAD_OF_DEPARTMENT' && req.user.department === 'Water')) {
    return res.status(403).json({ error: 'Only the Head of Water & Environment can delete an exhibit intake.' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: current } = await client.query(
      `SELECT id, status, lab_reference FROM water_exhibit_intakes
       WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`,
      [req.params.id],
    );
    if (!current.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Water exhibit intake not found.' });
    }
    const intake = current[0];
    await client.query(
      `UPDATE water_exhibit_intakes SET deleted_at = NOW(), deleted_by = $2, updated_at = NOW() WHERE id = $1`,
      [req.params.id, req.user.id],
    );
    await appendWaterIntakeEvent(client, req.params.id, 'DELETED', req.user.id, intake.status, intake.status, {});
    await audit(client, req.user.id, req.user.email, 'WATER_EXHIBIT_DELETED', 'water_exhibit_intake', req.params.id, {
      labReference: intake.lab_reference,
      statusWhenDeleted: intake.status,
    });
    await client.query('COMMIT');
    res.json({ message: `${intake.lab_reference} was deleted.` });
  } catch (error) {
    await client.query('ROLLBACK');
    return next(error);
  } finally {
    client.release();
  }
}));

const readCookie = (header = '', name) => {
  const entry = header.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return entry ? decodeURIComponent(entry.slice(name.length + 1)) : null;
};

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many sign-in attempts. Wait 15 minutes before trying again.' },
});

app.post('/api/auth/register', authLimiter, asyncHandler(async (req, res, next) => {
  const { fullName, email, role, department } = req.body ?? {};
  if (!isValidProfile({ fullName, email, role, department })) {
    return res.status(400).json({ error: 'Provide valid name, work email, role, and the department that matches that role.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: existing } = await client.query(
      `SELECT id FROM users WHERE lower(email) = $1 LIMIT 1`,
      [normalizeEmail(email)],
    );
    if (existing.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'An account already exists for that email.' });
    }
    const { rows } = await client.query(
      `INSERT INTO account_requests (full_name, email, requested_role, department)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [fullName.trim(), normalizeEmail(email), role, department ?? null],
    );
    await audit(client, null, normalizeEmail(email), 'ACCOUNT_REQUESTED', 'account_request', rows[0].id);
    await createAdminNotification(client, {
      title: 'New staff approval request',
      message: `${fullName.trim()} (${normalizeEmail(email)}) requested ${role.replaceAll('_', ' ')} access.`,
      type: 'warning',
      linkAction: 'ADMIN_REQUESTS',
      recordType: 'account_request',
      recordId: rows[0].id,
    });
    await client.query('COMMIT');
    res.status(201).json({ message: 'Your request was submitted. Sign-in is available after super-admin approval and account activation.' });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') return res.status(409).json({ error: 'An account request already exists for this email.' });
    next(error);
  } finally {
    client.release();
  }
}));

app.post('/api/auth/login', authLimiter, asyncHandler(async (req, res, next) => {
  const { email, password } = req.body ?? {};
  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Enter your work email and password.' });
  }
  try {
    const { rows } = await pool.query(
      `SELECT id, full_name, email, role, department, status, password_hash
       FROM users WHERE lower(email) = lower($1) LIMIT 1`,
      [email.trim()],
    );
    const user = rows[0];
    if (!user || user.status !== 'ACTIVE' || !await verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials or account not yet approved and activated.' });
    }
    const token = randomBytes(32).toString('hex');
    const tokenHash = hashToken(token);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO auth_sessions (user_id, token_hash, expires_at)
         VALUES ($1, $2, NOW() + INTERVAL '${SESSION_HOURS} hours')`,
        [user.id, tokenHash],
      );
      await audit(client, user.id, user.email, 'USER_LOGIN', 'session', null);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    res.cookie(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: SESSION_HOURS * 60 * 60 * 1000,
    });
    res.json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
}));

// Requests a reset link. Always answers 200 with the same message so the
// endpoint cannot be used to discover which emails have accounts.
app.post('/api/auth/forgot-password', authLimiter, asyncHandler(async (req, res, next) => {
  const { email } = req.body ?? {};
  if (typeof email !== 'string' || email.length > 254) {
    return res.status(400).json({ error: 'Enter the email address on your account.' });
  }
  const generic = 'If an active account exists for that address, a reset link is on its way.';
  try {
    const { rows } = await pool.query(
      `SELECT id, full_name, email FROM users WHERE lower(email) = lower($1) AND status = 'ACTIVE' LIMIT 1`,
      [email.trim()],
    );
    if (!rows.length) return res.json({ message: generic });
    const user = rows[0];
    const client = await pool.connect();
    let reset;
    try {
      await client.query('BEGIN');
      reset = await createPasswordReset(client, user);
      await audit(client, null, user.email, 'PASSWORD_RESET_REQUESTED', 'user', user.id);
      await createAdminNotification(client, {
        title: 'Password reset requested',
        message: `${user.full_name} (${user.email}) requested a password reset. A secure reset link was sent to their email.`,
        type: 'info',
        linkAction: 'ADMIN_USERS',
        recordType: 'user',
        recordId: user.id,
      });
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      next(error);
      return;
    } finally {
      client.release();
    }
    const emailSent = await deliverPasswordReset(user, reset);
    res.json({ emailSent, message: emailSent ? generic : `${generic} Email delivery failed, so contact your administrator.` });
  } catch (error) {
    next(error);
  }
}));

app.post('/api/auth/reset-password', authLimiter, asyncHandler(async (req, res, next) => {
  const { token, password } = req.body ?? {};
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/i.test(token) ||
      typeof password !== 'string' || password.length < 12 || password.length > 256) {
    return res.status(400).json({ error: 'Use a valid reset link and a password of at least 12 characters.' });
  }
  const client = await pool.connect();
  try {
    const encoded = await passwordHash(password);
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT r.id AS reset_id, u.id, u.email, u.full_name
       FROM password_reset_tokens r JOIN users u ON u.id = r.user_id
       WHERE r.token_hash = $1 AND r.used_at IS NULL AND r.revoked_at IS NULL
         AND r.expires_at > NOW() AND u.status = 'ACTIVE'
       FOR UPDATE OF r, u`,
      [hashToken(token)],
    );
    if (!rows.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'This reset link is invalid, expired, or already used. Request a new one.' });
    }
    const reset = rows[0];
    await client.query(`UPDATE users SET password_hash = $2, updated_at = NOW() WHERE id = $1`, [reset.id, encoded]);
    await client.query(`UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1`, [reset.reset_id]);
    // Every existing session is dropped so a stolen cookie cannot outlive the
    // password change.
    await client.query('DELETE FROM auth_sessions WHERE user_id = $1', [reset.id]);
    await audit(client, reset.id, reset.email, 'PASSWORD_RESET_COMPLETED', 'user', reset.id);
    await client.query('COMMIT');
    res.json({ message: 'Password updated. Sign in with your new password.' });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
}));

app.post('/api/auth/activate', authLimiter, asyncHandler(async (req, res, next) => {
  const { token, password } = req.body ?? {};
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/i.test(token) ||
      typeof password !== 'string' || password.length < 12 || password.length > 256) {
    return res.status(400).json({ error: 'Use a valid invitation and a password of at least 12 characters.' });
  }
  const client = await pool.connect();
  try {
    const encoded = await passwordHash(password);
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT i.id AS invite_id, u.id, u.email, u.full_name
       FROM account_invites i JOIN users u ON u.id = i.user_id
       WHERE i.token_hash = $1 AND i.used_at IS NULL AND i.revoked_at IS NULL
         AND i.expires_at > NOW() AND u.status = 'PENDING_INVITE'
       FOR UPDATE OF i, u`,
      [hashToken(token)],
    );
    if (!rows.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'This invitation is invalid, expired, or already used. Ask the administrator to send a new one.' });
    }
    const invite = rows[0];
    await client.query(`UPDATE users SET status = 'ACTIVE', password_hash = $2, updated_at = NOW() WHERE id = $1`, [invite.id, encoded]);
    await client.query('UPDATE account_invites SET used_at = NOW() WHERE id = $1', [invite.invite_id]);
    await audit(client, invite.id, invite.email, 'ACCOUNT_ACTIVATED', 'user', invite.id);
    await client.query('COMMIT');
    res.json({ message: 'Account activated. You can now sign in.' });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
}));

app.get('/api/auth/me', requireSession, (req, res) => res.json({ user: publicUser(req.user) }));

app.post('/api/auth/logout', requireSession, asyncHandler(async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM auth_sessions WHERE token_hash = $1', [req.sessionHash]);
    await audit(client, req.user.id, req.user.email, 'USER_LOGOUT', 'session', null);
    await client.query('COMMIT');
    res.clearCookie(SESSION_COOKIE, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/' });
    res.status(204).end();
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
}));

app.post('/api/account/department-change-requests', requireSession, asyncHandler(async (req, res, next) => {
  const { department, reason } = req.body ?? {};
  if (!labScopedRoles.has(req.user.role) || typeof department !== 'string' ||
      !departmentsForRole(req.user.role).has(department) || department === req.user.department ||
      (reason !== undefined && (typeof reason !== 'string' || reason.trim().length > 500))) {
    return res.status(400).json({ error: 'Choose a different valid department and provide a reason of at most 500 characters.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO department_change_requests (user_id, current_department, requested_department, reason)
       VALUES ($1, $2, $3, $4)
       RETURNING id, requested_department AS department, status, created_at AS "createdAt"`,
      [req.user.id, req.user.department, department, reason?.trim() || null],
    );
    const request = rows[0];
    await audit(client, req.user.id, req.user.email, 'DEPARTMENT_CHANGE_REQUESTED', 'department_change_request', request.id, {
      from: req.user.department,
      to: department,
    });
    await createAdminNotification(client, {
      title: 'Department change requested',
      message: `${req.user.full_name} (${req.user.email}) requested a move from ${req.user.department} to ${department}.`,
      type: 'warning',
      linkAction: 'ADMIN_DEPARTMENT_REQUESTS',
      recordType: 'department_change_request',
      recordId: request.id,
    });
    await client.query('COMMIT');
    res.status(201).json({ request });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') return res.status(409).json({ error: 'You already have a pending department change request.' });
    return next(error);
  } finally {
    client.release();
  }
}));

app.get('/api/admin/department-change-requests', requireSession, requireSuperAdmin, asyncHandler(async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.id, r.user_id AS "userId", u.full_name AS "fullName", u.email,
              u.role, r.current_department AS "currentDepartment",
              r.requested_department AS "requestedDepartment", r.reason,
              r.status, r.created_at AS "createdAt"
       FROM department_change_requests r
       JOIN users u ON u.id = r.user_id
       WHERE r.status = 'PENDING'
       ORDER BY r.created_at DESC LIMIT 200`,
    );
    res.json({ requests: rows });
  } catch (error) {
    next(error);
  }
}));

app.post('/api/admin/department-change-requests/:id/:decision', requireSession, requireSuperAdmin, asyncHandler(async (req, res, next) => {
  const decision = req.params.decision;
  if (!['approve', 'reject'].includes(decision)) return res.status(404).json({ error: 'Department request action not found.' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT r.*, u.full_name, u.email, u.role, u.department AS live_department
       FROM department_change_requests r
       JOIN users u ON u.id = r.user_id
       WHERE r.id = $1 AND r.status = 'PENDING'
       FOR UPDATE OF r, u`,
      [req.params.id],
    );
    if (!rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Pending department change request not found.' });
    }
    const request = rows[0];
    const status = decision === 'approve' ? 'APPROVED' : 'REJECTED';
    if (decision === 'approve') {
      if (!departmentsForRole(request.role).has(request.requested_department)) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'This department is no longer valid for the user’s role.' });
      }
      await client.query(
        `UPDATE users SET department = $2, updated_at = NOW() WHERE id = $1`,
        [request.user_id, request.requested_department],
      );
    }
    await client.query(
      `UPDATE department_change_requests
       SET status = $2, decision_by = $3, decision_at = NOW()
       WHERE id = $1`,
      [request.id, status, req.user.id],
    );
    const action = decision === 'approve' ? 'DEPARTMENT_CHANGE_APPROVED' : 'DEPARTMENT_CHANGE_REJECTED';
    await audit(client, req.user.id, req.user.email, action, 'department_change_request', request.id, {
      userId: request.user_id,
      from: request.live_department,
      to: request.requested_department,
    });
    await createAdminNotification(client, {
      title: `Department change ${decision === 'approve' ? 'approved' : 'rejected'}`,
      message: `${request.full_name} (${request.email})’s request to move from ${request.current_department} to ${request.requested_department} was ${decision === 'approve' ? 'approved' : 'rejected'}.`,
      type: decision === 'approve' ? 'success' : 'info',
      linkAction: 'ADMIN_USERS',
      recordType: 'department_change_request',
      recordId: request.id,
    });
    await client.query('COMMIT');
    res.json({ message: `Department change request ${decision === 'approve' ? 'approved' : 'rejected'}.` });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
}));

app.get('/api/admin/notifications', requireSession, requireSuperAdmin, asyncHandler(async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT n.id, n.title, n.message, n.type,
              n.link_action AS "linkAction", n.record_type AS "recordType",
              n.record_id AS "recordId", n.created_at AS "createdAt",
              (r.read_at IS NOT NULL) AS read
       FROM admin_notifications n
       LEFT JOIN admin_notification_reads r
         ON r.notification_id = n.id AND r.user_id = $1
       WHERE r.dismissed_at IS NULL
       ORDER BY n.created_at DESC LIMIT 200`,
      [req.user.id],
    );
    res.json({ notifications: rows });
  } catch (error) {
    next(error);
  }
}));

app.patch('/api/admin/notifications/read-all', requireSession, requireSuperAdmin, asyncHandler(async (req, res, next) => {
  try {
    await pool.query(
      `INSERT INTO admin_notification_reads (notification_id, user_id, read_at)
       SELECT id, $1, NOW() FROM admin_notifications
       ON CONFLICT (notification_id, user_id)
       DO UPDATE SET read_at = NOW()`,
      [req.user.id],
    );
    res.json({ message: 'All administration notifications marked as read.' });
  } catch (error) {
    next(error);
  }
}));

app.patch('/api/admin/notifications/:id/read', requireSession, requireSuperAdmin, asyncHandler(async (req, res, next) => {
  const { read } = req.body ?? {};
  if (typeof read !== 'boolean') return res.status(400).json({ error: 'Read must be true or false.' });
  try {
    if (read) {
      const result = await pool.query(
        `INSERT INTO admin_notification_reads (notification_id, user_id, read_at)
         SELECT id, $2, NOW() FROM admin_notifications WHERE id = $1
         ON CONFLICT (notification_id, user_id)
         DO UPDATE SET read_at = NOW(), dismissed_at = NULL`,
        [req.params.id, req.user.id],
      );
      if (!result.rowCount) return res.status(404).json({ error: 'Notification not found.' });
    } else {
      await pool.query(
        `DELETE FROM admin_notification_reads WHERE notification_id = $1 AND user_id = $2`,
        [req.params.id, req.user.id],
      );
    }
    res.json({ message: `Notification marked as ${read ? 'read' : 'unread'}.` });
  } catch (error) {
    next(error);
  }
}));

app.delete('/api/admin/notifications/:id', requireSession, requireSuperAdmin, asyncHandler(async (req, res, next) => {
  try {
    const result = await pool.query(
      `INSERT INTO admin_notification_reads (notification_id, user_id, read_at, dismissed_at)
       SELECT id, $2, NOW(), NOW() FROM admin_notifications WHERE id = $1
       ON CONFLICT (notification_id, user_id)
       DO UPDATE SET read_at = COALESCE(admin_notification_reads.read_at, NOW()), dismissed_at = NOW()`,
      [req.params.id, req.user.id],
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Notification not found.' });
    res.json({ message: 'Notification dismissed.' });
  } catch (error) {
    next(error);
  }
}));

app.get('/api/admin/overview', requireSession, requireSuperAdmin, asyncHandler(async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT
         (SELECT COUNT(*)::int FROM account_requests WHERE status = 'PENDING') AS pending_requests,
         (SELECT COUNT(*)::int FROM department_change_requests WHERE status = 'PENDING') AS pending_department_requests,
         (SELECT COUNT(*)::int FROM users WHERE status = 'ACTIVE') AS active_users,
         (SELECT COUNT(*)::int FROM users WHERE status = 'PENDING_INVITE') AS invited_users,
         (SELECT COUNT(*)::int FROM audit_log) AS audit_events`,
    );
    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
}));

app.get('/api/admin/requests', requireSession, requireSuperAdmin, asyncHandler(async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, full_name AS "fullName", email,
              requested_role AS "requestedRole", department, status,
              created_at AS "createdAt"
       FROM account_requests WHERE status = 'PENDING'
       ORDER BY created_at DESC LIMIT 200`,
    );
    res.json({ requests: rows });
  } catch (error) {
    next(error);
  }
}));

app.get('/api/admin/users', requireSession, requireSuperAdmin, asyncHandler(async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, full_name AS "fullName", email, role,
              department, status, created_at AS "createdAt"
       FROM users ORDER BY created_at DESC LIMIT 500`,
    );
    res.json({ users: rows });
  } catch (error) {
    next(error);
  }
}));

app.get('/api/admin/audit', requireSession, requireSuperAdmin, asyncHandler(async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, actor_email AS "actorEmail", action, record_type AS "recordType",
              record_id AS "recordId", details, created_at AS "createdAt"
       FROM audit_log ORDER BY created_at DESC LIMIT 100`,
    );
    res.json({ events: rows });
  } catch (error) {
    next(error);
  }
}));

app.post('/api/admin/requests/:id/approve', requireSession, requireSuperAdmin, asyncHandler(async (req, res, next) => {
  const client = await pool.connect();
  let user;
  let invitation;
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT * FROM account_requests WHERE id = $1 AND status = 'PENDING' FOR UPDATE`,
      [req.params.id],
    );
    if (!rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Pending request not found.' });
    }
    const request = rows[0];
    const userResult = await client.query(
      `INSERT INTO users (full_name, email, role, department, status)
       VALUES ($1, $2, $3, $4, 'PENDING_INVITE')
       RETURNING id, full_name, email`,
      [request.full_name, normalizeEmail(request.email), request.requested_role, request.department],
    );
    user = userResult.rows[0];
    invitation = await createInvite(client, user, req.user);
    await client.query(
      `UPDATE account_requests SET status = 'APPROVED', decision_by = $2, decision_at = NOW(), user_id = $3
       WHERE id = $1`,
      [request.id, req.user.id, user.id],
    );
    await audit(client, req.user.id, req.user.email, 'ACCOUNT_REQUEST_APPROVED', 'account_request', request.id, { userId: user.id });
    await createAdminNotification(client, {
      title: 'Staff account request approved',
      message: `${user.full_name} (${user.email}) was approved and an invitation was issued.`,
      type: 'success',
      linkAction: 'ADMIN_USERS',
      recordType: 'user',
      recordId: user.id,
    });
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') return res.status(409).json({ error: 'An account already exists with that email.' });
    return next(error);
  } finally {
    client.release();
  }
  const emailSent = await deliverInvite(user, invitation);
  res.status(emailSent ? 200 : 202).json({
    emailSent,
    message: emailSent
      ? `Invitation sent to ${user.email}. It expires in 15 minutes.`
      : `Account approved, but the invitation email could not be delivered. Check SMTP settings, then resend the invitation from Staff accounts.`,
  });
}));

app.post('/api/admin/requests/:id/reject', requireSession, requireSuperAdmin, asyncHandler(async (req, res, next) => {
  const note = typeof req.body?.note === 'string' ? req.body.note.trim().slice(0, 500) : '';
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `UPDATE account_requests SET status = 'REJECTED', decision_by = $2, decision_at = NOW(), decision_note = $3
       WHERE id = $1 AND status = 'PENDING' RETURNING id`,
      [req.params.id, req.user.id, note || null],
    );
    if (!result.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Pending request not found.' });
    }
    await audit(client, req.user.id, req.user.email, 'ACCOUNT_REQUEST_REJECTED', 'account_request', req.params.id);
    await createAdminNotification(client, {
      title: 'Staff account request rejected',
      message: `The account request ${req.params.id} was rejected by ${req.user.email}.`,
      type: 'info',
      linkAction: 'ADMIN_REQUESTS',
      recordType: 'account_request',
      recordId: req.params.id,
    });
    await client.query('COMMIT');
    res.json({ message: 'Account request rejected.' });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
}));

app.post('/api/admin/users', requireSession, requireSuperAdmin, asyncHandler(async (req, res, next) => {
  const { fullName, email, role, department } = req.body ?? {};
  if (!isValidProfile({ fullName, email, role, department }, adminCreatableRoles)) {
    return res.status(400).json({ error: 'Provide valid name, work email, role, and the department that matches that role.' });
  }

  const client = await pool.connect();
  let user;
  let invitation;
  try {
    await client.query('BEGIN');
    if (role === 'HEAD_OF_DEPARTMENT') {
      const { rows: existingHead } = await findDepartmentHead(client, department);
      if (existingHead.length) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: departmentHeadError(department, existingHead[0]) });
      }
    }
    const { rows } = await client.query(
      `INSERT INTO users (full_name, email, role, department, status)
       VALUES ($1, $2, $3, $4, 'PENDING_INVITE')
       RETURNING id, full_name, email`,
      [fullName.trim(), normalizeEmail(email), role, department ?? null],
    );
    user = rows[0];
    invitation = await createInvite(client, user, req.user);
    await audit(client, req.user.id, req.user.email, 'USER_INVITED', 'user', user.id, { email: user.email, role });
    await createAdminNotification(client, {
      title: 'Staff account invitation created',
      message: `${user.full_name} (${user.email}) was invited as ${role.replaceAll('_', ' ')} in ${department}.`,
      type: 'success',
      linkAction: 'ADMIN_USERS',
      recordType: 'user',
      recordId: user.id,
    });
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.constraint === 'users_one_head_per_department_idx') {
      return res.status(409).json({ error: `${department} already has a Head of Department. Change that account's role first.` });
    }
    if (error.code === '23505') return res.status(409).json({ error: 'An account already exists with that email.' });
    return next(error);
  } finally {
    client.release();
  }
  const emailSent = await deliverInvite(user, invitation);
  res.status(201).json({
    emailSent,
    message: emailSent
      ? `Invitation sent to ${user.email}. It expires in 15 minutes.`
      : `Account created, but the invitation email could not be delivered. Check SMTP settings, then resend the invitation from Staff accounts.`,
  });
}));

app.post('/api/admin/users/:id/resend-invite', requireSession, requireSuperAdmin, asyncHandler(async (req, res, next) => {
  const client = await pool.connect();
  let user;
  let invitation;
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT id, full_name, email FROM users WHERE id = $1 AND status = 'PENDING_INVITE' FOR UPDATE`,
      [req.params.id],
    );
    if (!rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Invited account not found.' });
    }
    user = rows[0];
    invitation = await createInvite(client, user, req.user);
    await audit(client, req.user.id, req.user.email, 'INVITATION_RESENT', 'user', user.id);
    await createAdminNotification(client, {
      title: 'Account invitation resent',
      message: `A fresh activation link was issued for ${user.email}.`,
      type: 'info',
      linkAction: 'ADMIN_USERS',
      recordType: 'user',
      recordId: user.id,
    });
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    return next(error);
  } finally {
    client.release();
  }
  const emailSent = await deliverInvite(user, invitation);
  res.status(emailSent ? 200 : 202).json({
    emailSent,
    message: emailSent
      ? `A new 15-minute invitation was sent to ${user.email}.`
      : `The invitation could not be delivered. Check SMTP settings, then resend it again.`,
  });
}));

// Super-admin forced reset: mails the user a link to set their own password.
// The admin never learns or sets the new value.
app.post('/api/admin/users/:id/reset-password', requireSession, requireSuperAdmin, asyncHandler(async (req, res, next) => {
  const client = await pool.connect();
  let user;
  let reset;
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT id, full_name, email FROM users WHERE id = $1 AND status = 'ACTIVE' FOR UPDATE`,
      [req.params.id],
    );
    if (!rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Only active accounts can be reset. Activate the account first.' });
    }
    user = rows[0];
    reset = await createPasswordReset(client, user, req.user.id);
    await audit(client, req.user.id, req.user.email, 'PASSWORD_RESET_FORCED', 'user', user.id, { email: user.email });
    await createAdminNotification(client, {
      title: 'Password reset initiated by administrator',
      message: `${user.full_name} (${user.email}) was sent a secure password reset link by ${req.user.email}.`,
      type: 'warning',
      linkAction: 'ADMIN_USERS',
      recordType: 'user',
      recordId: user.id,
    });
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    return next(error);
  } finally {
    client.release();
  }
  const emailSent = await deliverPasswordReset(user, reset, req.user.full_name ?? req.user.email);
  res.status(emailSent ? 200 : 202).json({
    emailSent,
    message: emailSent
      ? `A password reset link was sent to ${user.email}. It expires in ${RESET_MINUTES} minutes.`
      : `The reset link could not be delivered. Check SMTP settings, then try again.`,
  });
}));

app.patch('/api/admin/users/:id/status', requireSession, requireSuperAdmin, asyncHandler(async (req, res, next) => {
  const { status } = req.body ?? {};
  if (!['ACTIVE', 'DISABLED'].includes(status)) return res.status(400).json({ error: 'Status must be ACTIVE or DISABLED.' });
  if (req.params.id === req.user.id && status === 'DISABLED') return res.status(400).json({ error: 'You cannot disable your own account.' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(7901234)');
    const { rows } = await client.query('SELECT id, full_name, email, role FROM users WHERE id = $1 FOR UPDATE', [req.params.id]);
    if (!rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Staff account not found.' });
    }
    if (rows[0].role === 'SUPER_ADMIN' && status === 'DISABLED') {
      const { rows: activeAdmins } = await client.query(
        `SELECT COUNT(*)::int AS count FROM users
         WHERE role = 'SUPER_ADMIN' AND status = 'ACTIVE' AND id <> $1`,
        [req.params.id],
      );
      if (activeAdmins[0].count < 1) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'The last active super-admin account cannot be disabled.' });
      }
    }
    await client.query('UPDATE users SET status = $2, updated_at = NOW() WHERE id = $1', [req.params.id, status]);
    if (status === 'DISABLED') await client.query('DELETE FROM auth_sessions WHERE user_id = $1', [req.params.id]);
    await audit(client, req.user.id, req.user.email, `USER_${status}`, 'user', req.params.id);
    await createAdminNotification(client, {
      title: status === 'DISABLED' ? 'Staff account disabled' : 'Staff account enabled',
      message: `${rows[0].full_name} (${rows[0].email}) was ${status === 'DISABLED' ? 'disabled' : 'enabled'} by ${req.user.email}.`,
      type: status === 'DISABLED' ? 'warning' : 'success',
      linkAction: 'ADMIN_USERS',
      recordType: 'user',
      recordId: req.params.id,
    });
    await client.query('COMMIT');
    res.json({ message: `Account ${status === 'DISABLED' ? 'disabled' : 'enabled'}.` });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
}));

app.patch('/api/admin/users/:id/role', requireSession, requireSuperAdmin, asyncHandler(async (req, res, next) => {
  const { role, department } = req.body ?? {};
  if (!adminCreatableRoles.has(role)) return res.status(400).json({ error: 'Choose a valid role.' });
  // The department is re-checked because the target role decides which
  // departments are legal - an analyst cannot sit in General Administration.
  if (typeof department !== 'string' || !departmentsForRole(role).has(department)) {
    return res.status(400).json({ error: 'Choose the department that matches the selected role.' });
  }
  if (req.params.id === req.user.id) return res.status(400).json({ error: 'You cannot change your own role.' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Serialised against the other super-admin guards so two concurrent
    // demotions cannot both see themselves as the last one standing.
    await client.query('SELECT pg_advisory_xact_lock(7901234)');
    const { rows } = await client.query('SELECT id, email, role, department FROM users WHERE id = $1 FOR UPDATE', [req.params.id]);
    if (!rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Staff account not found.' });
    }
    const previous = rows[0].role;
    // A lab-scoped role can be moved between laboratories without the role
    // itself changing, so only treat the pair as unchanged when BOTH match.
    const previousDepartment = rows[0].department;
    if (previous === role && previousDepartment === department) {
      await client.query('ROLLBACK');
      return res.json({ message: `${rows[0].email} is already ${role.replaceAll('_', ' ')} in ${department}.` });
    }
    // One Head of Department per department: refuse promoting a second one.
    if (role === 'HEAD_OF_DEPARTMENT') {
      const { rows: existingHead } = await findDepartmentHead(client, department, req.params.id);
      if (existingHead.length) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: departmentHeadError(department, existingHead[0]) });
      }
    }
    if (previous === 'SUPER_ADMIN') {
      const { rows: remaining } = await client.query(
        `SELECT COUNT(*)::int AS count FROM users
         WHERE role = 'SUPER_ADMIN' AND status = 'ACTIVE' AND id <> $1`,
        [req.params.id],
      );
      if (remaining[0].count < 1) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'The last active super-admin cannot be demoted.' });
      }
    }
    await client.query('UPDATE users SET role = $2, department = $3, updated_at = NOW() WHERE id = $1', [req.params.id, role, department]);
    await audit(client, req.user.id, req.user.email, 'USER_ROLE_CHANGED', 'user', req.params.id, {
      from: previous, to: role, fromDepartment: previousDepartment, toDepartment: department,
    });
    await createAdminNotification(client, {
      title: previousDepartment === department ? 'Staff role changed' : 'Staff department changed',
      message: `${rows[0].email} was updated from ${previous.replaceAll('_', ' ')} / ${previousDepartment ?? 'unassigned'} to ${role.replaceAll('_', ' ')} / ${department}.`,
      type: 'info',
      linkAction: 'ADMIN_USERS',
      recordType: 'user',
      recordId: req.params.id,
    });
    await client.query('COMMIT');
    res.json({ message: `${rows[0].email} is now ${role.replaceAll('_', ' ')} in ${department}.` });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.constraint === 'users_one_head_per_department_idx') {
      return res.status(409).json({ error: `${department} already has a Head of Department. Change that account's role first.` });
    }
    next(error);
  } finally {
    client.release();
  }
}));

app.delete('/api/admin/users/:id', requireSession, requireSuperAdmin, asyncHandler(async (req, res, next) => {
  if (req.params.id === req.user.id) return res.status(400).json({ error: 'You cannot delete your own account.' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(7901234)');
    const { rows } = await client.query(
      'SELECT id, email, role, status FROM users WHERE id = $1 FOR UPDATE',
      [req.params.id],
    );
    if (!rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Staff account not found.' });
    }
    const target = rows[0];
    if (target.role === 'SUPER_ADMIN' && target.status === 'ACTIVE') {
      const { rows: remaining } = await client.query(
        `SELECT COUNT(*)::int AS count FROM users
         WHERE role = 'SUPER_ADMIN' AND status = 'ACTIVE' AND id <> $1`,
        [req.params.id],
      );
      if (remaining[0].count < 1) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'The last active super-admin account cannot be deleted.' });
      }
    }
    // Written before the delete so the event survives even though the row it
    // points at is about to disappear. details keeps the identity readable.
    await audit(client, req.user.id, req.user.email, 'USER_DELETED', 'user', target.id, {
      email: target.email, role: target.role, status: target.status,
    });
    await createAdminNotification(client, {
      title: 'Staff account deleted',
      message: `${target.email} (${target.role.replaceAll('_', ' ')}) was permanently deleted by ${req.user.email}.`,
      type: 'urgent',
      linkAction: 'ADMIN_USERS',
      recordType: 'user',
      recordId: target.id,
    });
    await client.query('DELETE FROM users WHERE id = $1', [target.id]);
    await client.query('COMMIT');
    res.json({ message: `${target.email} was deleted.` });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23503') {
      return res.status(409).json({ error: 'This account is still referenced by other records. Run npm run migrate to apply the latest schema.' });
    }
    next(error);
  } finally {
    client.release();
  }
}));

app.use('/api', (_req, res) => res.status(404).json({ error: 'API route not found.' }));
app.use((error, _req, res, _next) => {
  console.error(error);
  if (res.headersSent) return;
  res.status(500).json({ error: 'The request could not be completed. Check the server logs and configuration.' });
});

const port = Number(process.env.PORT ?? 8000);
const start = async () => {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
  await pool.query('SELECT 1');
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static('dist'));
    app.get('*', (_req, res) => res.sendFile('index.html', { root: 'dist' }));
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  }
  app.listen(port, process.env.HOST ?? '0.0.0.0', () => console.log(`GC-ILCMS listening on port ${port}`));
};

start().catch(async (error) => {
  console.error(`Server startup failed: ${error.message}`);
  await pool.end();
  process.exit(1);
});
