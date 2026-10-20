-- An officer can keep one signature image on their account and reuse it on the receipt form,
-- worksheet and draft reports with one click instead of drawing it every time. Each form still
-- stores its own copy when signed, so replacing the saved signature never changes signed records.
ALTER TABLE users ADD COLUMN IF NOT EXISTS signature_image TEXT
  CHECK (signature_image IS NULL OR LENGTH(signature_image) <= 400000);
