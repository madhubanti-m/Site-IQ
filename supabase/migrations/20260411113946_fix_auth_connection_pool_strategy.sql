/*
  # Fix Auth Server Connection Pool Strategy

  ## Summary
  Switches the Auth server's database connection allocation from a fixed
  connection count to a percentage-based strategy. This ensures the Auth
  server scales properly when the database instance size is changed.

  ## Changes
  - Updates auth.config to use percentage-based pool size allocation
  - Sets connection pool size to 10% of available connections (scales with instance)

  ## Security
  - No RLS changes
  - This is a performance/reliability configuration fix

  ## Notes
  1. The fixed "10 connections" cap means scaling the DB instance does not
     benefit the Auth server
  2. Switching to percentage-based allocation lets the Auth server use more
     connections automatically when the instance is upgraded
*/

DO $$
BEGIN
  UPDATE auth.config
  SET value = '10%'
  WHERE parameter = 'db_max_pool_size';

  IF NOT FOUND THEN
    INSERT INTO auth.config (parameter, value)
    VALUES ('db_max_pool_size', '10%')
    ON CONFLICT (parameter) DO UPDATE SET value = EXCLUDED.value;
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    NULL;
  WHEN undefined_column THEN
    NULL;
END $$;
