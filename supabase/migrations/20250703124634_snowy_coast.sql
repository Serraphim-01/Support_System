/*
  # Teams Management and Analytics Setup

  1. New Tables
    - `team_members` - Junction table for team membership management
    
  2. Security
    - Enable RLS on team_members table
    - Add policies for role-based team management
    - Update existing team policies
    
  3. Data Setup
    - Create default Super Admins team
    - Assign existing super admins to default team
    - Add performance indexes
*/

-- Create team_members junction table for better team management
CREATE TABLE IF NOT EXISTS team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL CHECK (role IN ('supervisory_admin', 'agent')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- Enable RLS on team_members
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for team_members
CREATE POLICY "Super admins can manage team members"
  ON team_members FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'super_admin'
    )
  );

CREATE POLICY "Supervisory admins can manage their team members"
  ON team_members FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN team_members tm ON tm.user_id = u.id
      WHERE u.id = auth.uid() 
      AND u.role = 'supervisory_admin'
      AND tm.team_id = team_members.team_id
    )
  );

CREATE POLICY "Team members can view their team"
  ON team_members FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('super_admin', 'supervisory_admin')
    )
  );

-- Create default Super Admins team
INSERT INTO teams (name, tag) 
VALUES ('Super Admins', 'super-admins') 
ON CONFLICT (tag) DO NOTHING;

-- Add all existing super admins to the Super Admins team
DO $$
DECLARE
  super_admin_team_id uuid;
BEGIN
  SELECT id INTO super_admin_team_id FROM teams WHERE tag = 'super-admins';
  
  -- Update existing super admins to be part of the Super Admins team
  UPDATE users 
  SET team_id = super_admin_team_id 
  WHERE role = 'super_admin' AND team_id IS NULL;
  
  -- Add super admins to team_members table
  INSERT INTO team_members (team_id, user_id, role)
  SELECT super_admin_team_id, id, 'supervisory_admin'
  FROM users 
  WHERE role = 'super_admin'
  ON CONFLICT (team_id, user_id) DO NOTHING;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_role ON team_members(role);

-- Update RLS policies for teams to allow supervisory admins to create teams
DROP POLICY IF EXISTS "Super admins can manage teams" ON teams;

CREATE POLICY "Super admins and supervisory admins can manage teams"
  ON teams FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('super_admin', 'supervisory_admin')
    )
  );

-- Check if the policy exists before creating it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'organisations' 
    AND policyname = 'Public can read organisations'
  ) THEN
    EXECUTE 'CREATE POLICY "Public can read organisations" ON organisations FOR SELECT TO public USING (true)';
  END IF;
END $$;