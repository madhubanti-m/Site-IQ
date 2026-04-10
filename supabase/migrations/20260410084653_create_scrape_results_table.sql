/*
  # Create scrape_results table

  ## Summary
  Creates the main data table for the ScrapeIQ application to store all
  web scraping and AI analysis results.

  ## New Tables

  ### scrape_results
  Stores each scrape session with the following columns:
  - `id` (uuid, primary key) - Unique identifier for each record
  - `url` (text) - The URL that was scraped
  - `intent` (text) - The user's research intent/goal
  - `title` (text) - Page title returned by Firecrawl metadata
  - `content` (text) - Full markdown content scraped from the page
  - `links` (jsonb) - Array of links found on the page
  - `summary` (text) - AI-generated 3 bullet point summary from Groq
  - `created_at` (timestamptz) - Timestamp of when the record was created

  ## Security
  - RLS enabled on scrape_results table
  - Public read and insert allowed (app does not require authentication)

  ## Notes
  1. This table is public-facing — no auth required for this first build
  2. RLS is enabled with permissive policies for anon users to read and insert
*/

CREATE TABLE IF NOT EXISTS scrape_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL DEFAULT '',
  intent text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  links jsonb NOT NULL DEFAULT '[]'::jsonb,
  summary text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE scrape_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read scrape results"
  ON scrape_results
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anyone can insert scrape results"
  ON scrape_results
  FOR INSERT
  TO anon
  WITH CHECK (true);
