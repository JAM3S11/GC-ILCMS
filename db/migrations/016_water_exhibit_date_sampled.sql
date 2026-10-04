-- The date the water sample was actually taken, as printed on the Certificate of
-- Analysis next to the date it was received. Nullable so exhibits registered
-- before this field existed stay valid; the intake form requires it from now on.
ALTER TABLE water_exhibit_intakes
  ADD COLUMN IF NOT EXISTS date_sampled DATE
  CHECK (date_sampled IS NULL OR date_sampled <= date_received);
