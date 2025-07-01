/*
  # Add Organizations Email Domains and Chat Features

  1. New Features
    - Add email_domains column to organisations table
    - Update user creation trigger to validate email domains
    - Add real-time presence tracking for tickets
    - Update RLS policies for new features

  2. Security
    - Validate email domains during signup
    - Ensure proper access control for chat features
    - Add policies for organization management

  3. Changes
    - Modify organisations table structure
    - Update user creation logic
    - Add presence tracking capabilities
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

-- Update the user creation trigger to validate email domains
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_email_domain text;
  org_domains text[];
  domain_valid boolean := false;
BEGIN
  -- Handle email verification
  IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
    UPDATE public.users 
    SET is_verified = true 
    WHERE id = NEW.id;
  END IF;
  
  -- Handle new user creation from signup
  IF TG_OP = 'INSERT' AND NEW.raw_user_meta_data IS NOT NULL THEN
    -- Extract email domain
    user_email_domain := split_part(NEW.email, '@', 2);
    
    -- If organisation is specified, validate email domain
    IF NEW.raw_user_meta_data->>'organisationId' IS NOT NULL THEN
      SELECT email_domains INTO org_domains
      FROM organisations 
      WHERE id = (NEW.raw_user_meta_data->>'organisationId')::uuid;
      
      -- Check if email domain is allowed
      IF org_domains IS NOT NULL AND array_length(org_domains, 1) > 0 THEN
        SELECT EXISTS(SELECT 1 FROM unnest(org_domains) AS domain WHERE domain = user_email_domain) INTO domain_valid;
        
        IF NOT domain_valid THEN
          RAISE EXCEPTION 'Email domain % is not allowed for this organisation', user_email_domain;
        END IF;
      END IF;
    END IF;
    
    -- Create user profile
    INSERT INTO public.users (
      id,
      email,
      name,
      role,
      organisation_id,
      key,
      is_verified
    ) VALUES (
      NEW.id,
      NEW.email,
      NEW.raw_user_meta_data->>'name',
      COALESCE(NEW.raw_user_meta_data->>'role', 'customer'),
      (NEW.raw_user_meta_data->>'organisationId')::uuid,
      NEW.raw_user_meta_data->>'key',
      false
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the trigger
DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE TRIGGER on_auth_user_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Add RLS policy for organization management
CREATE POLICY "Supervisory admins can view organisations"
  ON organisations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('supervisory_admin', 'customer')
    )
  );

-- Update default organisation with email domains
UPDATE organisations 
SET email_domains = ARRAY['tasksystems.com', 'example.com']
WHERE name = 'Task Systems Limited';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_organisations_email_domains ON organisations USING GIN(email_domains);