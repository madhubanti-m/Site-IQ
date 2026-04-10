/*
  # Add key_insight column to comparisons table

  1. Changes
    - `comparisons` table: add `key_insight` (text) column to store the
      Key Insight paragraph extracted from the AI comparison result

  Notes
    - Uses IF NOT EXISTS guard so migration is safe to re-run
    - Default is empty string to avoid nulls on existing rows
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'comparisons' AND column_name = 'key_insight'
  ) THEN
    ALTER TABLE comparisons ADD COLUMN key_insight text NOT NULL DEFAULT '';
  END IF;
END $$;
