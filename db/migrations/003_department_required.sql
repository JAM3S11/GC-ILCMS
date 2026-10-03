-- Department becomes mandatory and must belong to the one the role works in.
-- Mirrors src/lib/departments.ts: lab-scoped roles take one of the eight
-- laboratories, everyone else takes General Administration.
--
-- Existing NULLs are institution-wide by definition (they were how the old
-- code spelled "no laboratory"), so they become General Administration. That
-- preserves the previous "sees every department" behaviour - see the
-- isInstitutionWide helper used by the notification filter in src/App.tsx.
--
-- Backfill must run before the NOT NULL is added. It is deliberately scoped
-- to institution-wide roles: a laboratory role with a NULL department is a
-- data error a human should fix by choosing the right division, so it is left
-- visible rather than silently guessed at Narcotics.

UPDATE users SET department = 'General Administration'
  WHERE department IS NULL
    AND role NOT IN ('ANALYST', 'SENIOR_CHEMIST', 'INTERN', 'ATTACHEE', 'HEAD_OF_DEPARTMENT');

UPDATE account_requests SET department = 'General Administration'
  WHERE department IS NULL
    AND requested_role NOT IN ('ANALYST', 'SENIOR_CHEMIST', 'INTERN', 'ATTACHEE', 'HEAD_OF_DEPARTMENT');

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM users WHERE department IS NULL)
     OR EXISTS (SELECT 1 FROM account_requests WHERE department IS NULL) THEN
    RAISE EXCEPTION
      'department is still NULL on a laboratory role; set those divisions before retrying';
  END IF;
END
$$;

ALTER TABLE users ALTER COLUMN department SET NOT NULL;
ALTER TABLE account_requests ALTER COLUMN department SET NOT NULL;

-- The list was previously free-form TEXT validated only in application code.
-- The constraint checks the role/department PAIR, not just membership: a
-- membership-only check would still let an ANALYST sit in General
-- Administration, which is exactly what the application layer forbids.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_department_check;
ALTER TABLE users ADD CONSTRAINT users_department_check CHECK (
  (role IN ('ANALYST', 'SENIOR_CHEMIST', 'INTERN', 'ATTACHEE', 'HEAD_OF_DEPARTMENT')
     AND department IN ('Narcotics', 'Food & Drugs', 'Criminalistic', 'DNA',
                        'Instruments', 'Water', 'Toxicology', 'Procurement'))
  OR
  (role NOT IN ('ANALYST', 'SENIOR_CHEMIST', 'INTERN', 'ATTACHEE', 'HEAD_OF_DEPARTMENT')
     AND department = 'General Administration')
);

ALTER TABLE account_requests DROP CONSTRAINT IF EXISTS account_requests_department_check;
ALTER TABLE account_requests ADD CONSTRAINT account_requests_department_check CHECK (
  (requested_role IN ('ANALYST', 'SENIOR_CHEMIST', 'INTERN', 'ATTACHEE', 'HEAD_OF_DEPARTMENT')
     AND department IN ('Narcotics', 'Food & Drugs', 'Criminalistic', 'DNA',
                        'Instruments', 'Water', 'Toxicology', 'Procurement'))
  OR
  (requested_role NOT IN ('ANALYST', 'SENIOR_CHEMIST', 'INTERN', 'ATTACHEE', 'HEAD_OF_DEPARTMENT')
     AND department = 'General Administration')
);