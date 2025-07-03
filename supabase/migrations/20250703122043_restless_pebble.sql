/*
  # Add email_domains column to organisations table

  1. Changes
    - Add `email_domains` column to `organisations` table as text array
    - This column will store allowed email domains for each organisation
    - Column is nullable to maintain compatibility with existing data

  2. Security
    - No changes to existing RLS policies needed
    - Column inherits existing table permissions
*/

-- Add email_domains column to organisations table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organisations' AND column_name = 'email_domains'
  ) THEN
    ALTER TABLE organisations ADD COLUMN email_domains text[];
  END IF;
END $$;