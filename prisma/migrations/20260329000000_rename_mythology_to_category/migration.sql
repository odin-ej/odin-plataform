-- Make category column optional (column may already be named category from initial migration)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'KrakenAgent' AND column_name = 'mythology'
  ) THEN
    ALTER TABLE "KrakenAgent" RENAME COLUMN "mythology" TO "category";
  END IF;
  ALTER TABLE "KrakenAgent" ALTER COLUMN "category" DROP NOT NULL;
END $$;
