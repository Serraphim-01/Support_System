/*
  # Add user creation trigger

  1. New Functions
    - `handle_new_user_signup` - Automatically create user profile on signup

  2. Triggers
    - Trigger to create user profile when auth user is created

  3. Policies
    - Update policies for user creation
*/

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user_signup()
RETURNS TRIGGER AS $$
BEGIN
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
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer'),
    CASE 
      WHEN NEW.raw_user_meta_data->>'organisationId' IS NOT NULL 
      THEN (NEW.raw_user_meta_data->>'organisationId')::uuid
      ELSE NULL
    END,
    NEW.raw_user_meta_data->>'key',
    CASE WHEN NEW.email_confirmed_at IS NOT NULL THEN true ELSE false END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_signup();

-- Update the email confirmation trigger
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

-- Update existing policy for user inserts
DROP POLICY IF EXISTS "Allow insert for own user" ON users;
CREATE POLICY "Allow insert for own user"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);