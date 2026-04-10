/*
  # Add analysis column to scrape_results

  ## Summary
  Adds a new `analysis` column to the `scrape_results` table to store the
  structured Smart Analysis output from a second AI call.

  ## Modified Tables

  ### scrape_results
  - Added `analysis` (text) - Structured Smart Analysis: what the page is about,
    key takeaways, who it's useful for, and overall sentiment.

  ## Notes
  1. Column defaults to empty string so existing rows are not broken.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scrape_results' AND column_name = 'analysis'
  ) THEN
    ALTER TABLE scrape_results ADD COLUMN analysis text NOT NULL DEFAULT '';
  END IF;
END $$;
