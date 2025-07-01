import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface Organisation {
  id: string
  name: string
  created_at: string
  updated_at: string
}

export interface Team {
  id: string
  name: string
  tag: string
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  email: string
  name: string
  role: 'customer' | 'super_admin' | 'supervisory_admin' | 'agent'
  organisation_id?: string
  team_id?: string
  key?: string
  is_verified: boolean
  created_at: string
  updated_at: string
}

export interface Ticket {
  id: string
  title: string
  description: string
  customer_id: string
  team_tag?: string
  assigned_agent_id?: string
  status: 'open' | 'closed' | 'resolved' | 'unresolved'
  created_at: string
  updated_at: string
}

export interface TicketMessage {
  id: string
  ticket_id: string
  user_id: string
  message: string
  created_at: string
}

export interface ActivityLog {
  id: string
  user_id: string
  action: string
  details: Record<string, any>
  created_at: string
}

export interface TicketEscalation {
  id: string
  ticket_id: string
  suggested_by_agent_id: string
  status: 'pending' | 'approved' | 'rejected'
  reason?: string
  created_at: string
  updated_at: string
}