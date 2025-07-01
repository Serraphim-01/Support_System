/*
  # Add email verification trigger

  1. New Functions
    - `handle_new_user` - Automatically handle new user verification
    - Update user verification status when email is confirmed

  2. Triggers
    - Trigger to handle email verification
    - Update is_verified field when user confirms email

  3. Policies
    - Add policy to allow public inserts for user creation
*/

-- Create function to handle new user verification
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Update user verification status when email is confirmed
  IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
    UPDATE public.users 
    SET is_verified = true 
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for email verification
DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Add policy to allow public inserts for user creation (needed for signup)
CREATE POLICY "Allow inserts from trigger"
  ON users FOR INSERT
  TO public
  WITH CHECK (true);

-- Update existing organisations policy to allow public read access
DROP POLICY IF EXISTS "Public can read organisations" ON organisations;
CREATE POLICY "Public can read organisations"
  ON organisations FOR SELECT
  TO public
  USING (true);