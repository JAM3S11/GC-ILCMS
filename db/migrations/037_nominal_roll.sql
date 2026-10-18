-- Nominal roll: the establishment list of serving officers. Self-registration is
-- retired, so a staff account can only be issued by the super-admin from an
-- entry on this roll. user_id links the entry to the account once issued.
CREATE TABLE IF NOT EXISTS nominal_roll (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_number TEXT NOT NULL CHECK (LENGTH(BTRIM(staff_number)) BETWEEN 1 AND 40),
  full_name TEXT NOT NULL CHECK (LENGTH(BTRIM(full_name)) BETWEEN 2 AND 150),
  email TEXT NOT NULL CHECK (LENGTH(email) <= 254),
  role TEXT NOT NULL CHECK (role IN (
    'CEO', 'VICE_CEO', 'ADMINISTRATOR', 'CLERK', 'ACCOUNTANT', 'HR',
    'RECEPTIONIST', 'HEAD_OF_DEPARTMENT', 'SENIOR_CHEMIST', 'ANALYST',
    'INTERN', 'ATTACHEE', 'QUALITY_MANAGER', 'SUPER_ADMIN'
  )),
  department TEXT NOT NULL,
  employment_status TEXT NOT NULL DEFAULT 'SERVING'
    CHECK (employment_status IN ('SERVING', 'LEFT')),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS nominal_roll_staff_number_idx ON nominal_roll (UPPER(BTRIM(staff_number)));
CREATE UNIQUE INDEX IF NOT EXISTS nominal_roll_email_idx ON nominal_roll (LOWER(email));

-- Every existing account goes on the roll so current staff keep working. The
-- placeholder staff number is corrected by the super-admin from the console.
INSERT INTO nominal_roll (staff_number, full_name, email, role, department, user_id)
SELECT 'PENDING-' || UPPER(LEFT(u.id::text, 8)), u.full_name, LOWER(u.email), u.role,
       COALESCE(u.department, 'General Administration'), u.id
FROM users u
WHERE NOT EXISTS (SELECT 1 FROM nominal_roll r WHERE r.user_id = u.id OR LOWER(r.email) = LOWER(u.email));

-- Requests from the retired sign-up form can no longer be approved.
UPDATE account_requests
SET status = 'REJECTED', decision_at = NOW(), decision_note = 'Self-registration retired; accounts are issued from the nominal roll.'
WHERE status = 'PENDING';

-- Their bell alerts pointed at the approval queue, which no longer exists.
DELETE FROM admin_notifications WHERE record_type = 'account_request';

-- Roll alerts (an officer marked as having left) open the Nominal roll.
ALTER TABLE admin_notifications DROP CONSTRAINT IF EXISTS admin_notifications_link_action_check;
ALTER TABLE admin_notifications ADD CONSTRAINT admin_notifications_link_action_check
  CHECK (link_action IN ('ADMIN_REQUESTS', 'ADMIN_DEPARTMENT_REQUESTS', 'ADMIN_USERS', 'ADMIN_ROLL'));
