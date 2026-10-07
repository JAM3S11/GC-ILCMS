-- Food & Drugs analytical sample receipt form, filled in from the sample's case
-- file while it is under analysis and required before the sample is reported.
-- Sender and submitter details are copied from the reception record when the
-- form is first saved, so the form keeps what was true at the time.
CREATE TABLE IF NOT EXISTS food_drug_receipt_forms (
  intake_id TEXT PRIMARY KEY REFERENCES food_drug_intakes(id) ON DELETE RESTRICT,
  form_date DATE NOT NULL DEFAULT ((NOW() AT TIME ZONE 'Africa/Nairobi')::date),
  sender_name TEXT NOT NULL CHECK (LENGTH(BTRIM(sender_name)) BETWEEN 2 AND 200),
  sender_physical_address TEXT NOT NULL CHECK (LENGTH(BTRIM(sender_physical_address)) BETWEEN 2 AND 300),
  sender_postal_address TEXT NOT NULL CHECK (LENGTH(BTRIM(sender_postal_address)) BETWEEN 2 AND 100),
  sender_telephone TEXT NOT NULL CHECK (LENGTH(BTRIM(sender_telephone)) BETWEEN 7 AND 30),
  submitter_name TEXT NOT NULL CHECK (LENGTH(BTRIM(submitter_name)) BETWEEN 2 AND 150),
  submitter_id_number TEXT NOT NULL CHECK (LENGTH(BTRIM(submitter_id_number)) BETWEEN 2 AND 100),
  sample_description TEXT NOT NULL CHECK (LENGTH(BTRIM(sample_description)) BETWEEN 5 AND 2000),
  examination_required TEXT NOT NULL CHECK (LENGTH(BTRIM(examination_required)) BETWEEN 3 AND 1000),
  fee_kes NUMERIC(12, 2) NOT NULL CHECK (fee_kes >= 0),
  invoice_number TEXT NOT NULL CHECK (LENGTH(BTRIM(invoice_number)) BETWEEN 1 AND 100),
  receipt_number TEXT NOT NULL CHECK (LENGTH(BTRIM(receipt_number)) BETWEEN 1 AND 100),
  analyst_receiving_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  analyst_received_date DATE NOT NULL DEFAULT ((NOW() AT TIME ZONE 'Africa/Nairobi')::date),
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  updated_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
