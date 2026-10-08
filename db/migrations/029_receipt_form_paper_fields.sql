-- The analytical sample receipt form now carries every field of the paper form
-- (GCD/SOP/01/SRD/FOODS/F1) so it can be printed and downloaded as the A4 page.
ALTER TABLE food_drug_receipt_forms ADD COLUMN IF NOT EXISTS lab_sample_no TEXT;
ALTER TABLE food_drug_receipt_forms ADD COLUMN IF NOT EXISTS senders_ref_no TEXT;
ALTER TABLE food_drug_receipt_forms ADD COLUMN IF NOT EXISTS submitter_id_type TEXT NOT NULL DEFAULT 'ID';
ALTER TABLE food_drug_receipt_forms DROP CONSTRAINT IF EXISTS food_drug_receipt_forms_submitter_id_type_check;
ALTER TABLE food_drug_receipt_forms ADD CONSTRAINT food_drug_receipt_forms_submitter_id_type_check
  CHECK (submitter_id_type IN ('ID', 'POWER_OF_ENTRY'));
-- [{ "subSampleNo": "...", "description": "..." }]; sample_description keeps the joined text for the worksheet.
ALTER TABLE food_drug_receipt_forms ADD COLUMN IF NOT EXISTS sub_samples JSONB NOT NULL DEFAULT '[]'::jsonb;
-- Signature and stamp images as data URLs (validated by the server: PNG/JPEG, size-capped).
ALTER TABLE food_drug_receipt_forms ADD COLUMN IF NOT EXISTS submitter_signature TEXT;
ALTER TABLE food_drug_receipt_forms ADD COLUMN IF NOT EXISTS receiver_signature TEXT;
ALTER TABLE food_drug_receipt_forms ADD COLUMN IF NOT EXISTS stamp_image TEXT;
ALTER TABLE food_drug_receipt_forms ADD COLUMN IF NOT EXISTS received_date DATE;
