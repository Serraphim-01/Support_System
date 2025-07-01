/*
  # Initial Schema for Ticketing System

  1. New Tables
    - `organisations` - Store customer organizations
    - `teams` - Support teams with tags and supervisory admins
    - `users` - Extended user profiles with roles and team assignments
    - `tickets` - Support tickets with status and assignments
    - `ticket_messages` - Real-time chat messages for tickets
    - `activity_logs` - Audit trail for all user actions
    - `ticket_escalations` - Track escalation requests from agents

  2. Security
    - Enable RLS on all tables
    - Add policies for role-based access control
    - Secure sensitive operations

  3. Features
    - Multi-role authentication system
    - Team-based ticket assignment
    - Real-time messaging
    - Activity logging
*/

-- Create organisations table
CREATE TABLE IF NOT EXISTS organisations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create teams table
CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  tag text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create users table (extends auth.users)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text NOT NULL,
  role text NOT NULL CHECK (role IN ('customer', 'super_admin', 'supervisory_admin', 'agent')),
  organisation_id uuid REFERENCES organisations(id),
  team_id uuid REFERENCES teams(id),
  key text, -- For admin/agent authentication
  is_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create team supervisors junction table
CREATE TABLE IF NOT EXISTS team_supervisors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
  supervisor_id uuid REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(team_id, supervisor_id)
);

-- Create tickets table
CREATE TABLE IF NOT EXISTS tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  customer_id uuid REFERENCES users(id) NOT NULL,
  team_tag text REFERENCES teams(tag),
  assigned_agent_id uuid REFERENCES users(id),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'resolved', 'unresolved')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create ticket messages table
CREATE TABLE IF NOT EXISTS ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES tickets(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES users(id) NOT NULL,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create activity logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) NOT NULL,
  action text NOT NULL,
  details jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Create ticket escalations table
CREATE TABLE IF NOT EXISTS ticket_escalations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES tickets(id) ON DELETE CASCADE NOT NULL,
  suggested_by_agent_id uuid REFERENCES users(id) NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_supervisors ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_escalations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organisations
CREATE POLICY "Super admins can manage organisations"
  ON organisations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'super_admin'
    )
  );

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

-- RLS Policies for teams
CREATE POLICY "Super admins can manage teams"
  ON teams FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'super_admin'
    )
  );

CREATE POLICY "Team members can view their team"
  ON teams FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND (users.team_id = teams.id OR users.role IN ('super_admin', 'customer'))
    )
  );

-- RLS Policies for users
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Super admins can manage all users"
  ON users FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'super_admin'
    )
  );

CREATE POLICY "Supervisory admins can view team members"
  ON users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN team_supervisors ts ON ts.supervisor_id = u.id
      WHERE u.id = auth.uid() 
      AND u.role = 'supervisory_admin'
      AND ts.team_id = users.team_id
    )
  );

-- RLS Policies for tickets
CREATE POLICY "Customers can view their own tickets"
  ON tickets FOR SELECT
  TO authenticated
  USING (
    customer_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('super_admin', 'supervisory_admin', 'agent')
    )
  );

CREATE POLICY "Customers can create tickets"
  ON tickets FOR INSERT
  TO authenticated
  WITH CHECK (
    customer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'customer'
    )
  );

CREATE POLICY "Admins and agents can update tickets"
  ON tickets FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('super_admin', 'supervisory_admin', 'agent')
    )
  );

-- RLS Policies for ticket messages
CREATE POLICY "Users can view messages for accessible tickets"
  ON ticket_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tickets t
      JOIN users u ON u.id = auth.uid()
      WHERE t.id = ticket_messages.ticket_id
      AND (
        t.customer_id = auth.uid() OR
        u.role IN ('super_admin', 'supervisory_admin', 'agent')
      )
    )
  );

CREATE POLICY "Users can send messages to accessible tickets"
  ON ticket_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM tickets t
      JOIN users u ON u.id = auth.uid()
      WHERE t.id = ticket_messages.ticket_id
      AND (
        t.customer_id = auth.uid() OR
        u.role IN ('super_admin', 'supervisory_admin', 'agent')
      )
    )
  );

-- RLS Policies for activity logs
CREATE POLICY "Users can view their own activity logs"
  ON activity_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own activity logs"
  ON activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for ticket escalations
CREATE POLICY "Agents can create escalations"
  ON ticket_escalations FOR INSERT
  TO authenticated
  WITH CHECK (
    suggested_by_agent_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'agent'
    )
  );

CREATE POLICY "Supervisors can manage escalations"
  ON ticket_escalations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('super_admin', 'supervisory_admin')
    )
  );

-- Insert default organisation
INSERT INTO organisations (name) VALUES ('Task Systems Limited') ON CONFLICT (name) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_team_id ON users(team_id);
CREATE INDEX IF NOT EXISTS idx_tickets_customer_id ON tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_tickets_team_tag ON tickets(team_tag);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id ON ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_organisations_updated_at BEFORE UPDATE ON organisations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();