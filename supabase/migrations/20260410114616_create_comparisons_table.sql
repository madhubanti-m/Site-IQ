/*
  # Create comparisons table

  1. New Tables
    - `comparisons`
      - `id` (uuid, primary key)
      - `url1` (text) - first URL compared
      - `url2` (text) - second URL compared
      - `intent` (text) - what the user is comparing
      - `comparison_result` (text) - full markdown/table result from AI
      - `created_at` (timestamptz) - when saved

  2. Security
    - Enable RLS on `comparisons` table
    - Add policy for all authenticated and anonymous reads/inserts
      (public table since there's no auth in this app)

  Notes
    - This mirrors the scrape_results table pattern used in the app
    - No user auth exists in this project, so policies allow service role access
*/

CREATE TABLE IF NOT EXISTS comparisons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url1 text NOT NULL,
  url2 text NOT NULL,
  intent text NOT NULL DEFAULT '',
  comparison_result text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE comparisons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow insert for all"
  ON comparisons FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow select for all"
  ON comparisons FOR SELECT
  USING (true);
