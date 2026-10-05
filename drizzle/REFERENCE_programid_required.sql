-- Registration now always belongs to a program. Run once on an existing database.
-- Fails (on purpose) if any registration still has no program — delete or reassign those rows first.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM registrations WHERE "programId" IS NULL) THEN
    RAISE EXCEPTION 'registrations without a program exist; delete or reassign them first';
  END IF;
END $$;
ALTER TABLE registrations ALTER COLUMN "programId" SET NOT NULL;
