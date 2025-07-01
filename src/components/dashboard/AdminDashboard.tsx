import React, { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { supabase, Ticket, ActivityLog } from '../../lib/supabase'
import { 
  Users, 
  Ticket as TicketIcon, 
  Building2, 
  Shield,
  Search,
  Filter,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react'
import { format } from 'date-fns'

export const AdminDashboard: React.FC = () => {
  const { userProfile } = useAuth()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([])
  const [stats, setStats] = useState({
    totalTickets: 0,
    openTickets: 0,
    resolvedTickets: 0,
    unresolvedTickets: 0,
    totalUsers: 0,
    totalTeams: 0,
    totalOrganizations: 0
  })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (userProfile) {
      loadDashboardData()
    }
  }, [userProfile])

  const loadDashboardData = async () => {
    if (!userProfile) return

    try {
      // Load tickets based on role
      let ticketsQuery = supabase.from('tickets').select('*')
      
      if (userProfile.role === 'supervisory_admin' || userProfile.role === 'agent') {
        // Only load tickets for their team
        ticketsQuery = ticketsQuery.eq('team_tag', userProfile.team_id)
      }

      const { data: ticketsData } = await ticketsQuery.order('created_at', { ascending: false })

      // Load activity logs
      const { data: activityData } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('user_id', userProfile.id)
        .order('created_at', { ascending: false })
        .limit(10)

      // Load stats based on role
      const [usersResult, teamsResult, orgsResult] = await Promise.all([
        userProfile.role === 'super_admin' 
          ? supabase.from('users').select('id', { count: 'exact', head: true })
          : { count: 0 },
        userProfile.role === 'super_admin'
          ? supabase.from('teams').select('id', { count: 'exact', head: true })
          : { count: 0 },
        supabase.from('organisations').select('id', { count: 'exact', head: true })
      ])

      if (ticketsData) {
        setTickets(ticketsData)
        setStats({
          totalTickets: ticketsData.length,
          openTickets: ticketsData.filter(t => t.status === 'open').length,
          resolvedTickets: ticketsData.filter(t => t.status === 'resolved').length,
          unresolvedTickets: ticketsData.filter(t => t.status === 'unresolved').length,
          totalUsers: usersResult.count || 0,
          totalTeams: teamsResult.count || 0,
          totalOrganizations: orgsResult.count || 0
        })
      }

      if (activityData) {
        setActivityLogs(activityData)
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredTickets = tickets.filter(ticket => {
    const matchesFilter = filter === 'all' || ticket.status === filter
    const matchesSearch = ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.description.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <Clock className="h-4 w-4 text-orange-500" />
      case 'closed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'resolved':
        return <CheckCircle className="h-4 w-4 text-blue-500" />
      case 'unresolved':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-orange-100 text-orange-800'
      case 'closed':
        return 'bg-green-100 text-green-800'
      case 'resolved':
        return 'bg-blue-100 text-blue-800'
      case 'unresolved':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleTitle = () => {
    switch (userProfile?.role) {
      case 'super_admin':
        return 'Super Administrator'
      case 'supervisory_admin':
        return 'Supervisory Administrator'
      case 'agent':
        return 'Support Agent'
      default:
        return 'Administrator'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {getRoleTitle()} Dashboard
          </h1>
          <p className="text-gray-600">Welcome back, {userProfile?.name}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <TicketIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Tickets</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalTickets}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Open Tickets</p>
              <p className="text-2xl font-bold text-gray-900">{stats.openTickets}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Resolved</p>
              <p className="text-2xl font-bold text-gray-900">{stats.resolvedTickets}</p>
            </div>
          </div>
        </div>

        {userProfile?.role === 'super_admin' && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Tickets */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                <h2 className="text-lg font-medium text-gray-900">Recent Tickets</h2>
                
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                  <div className="relative">
                    <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search tickets..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Status</option>
                    <option value="open">Open</option>
                    <option value="closed">Closed</option>
                    <option value="resolved">Resolved</option>
                    <option value="unresolved">Unresolved</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
              {filteredTickets.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-gray-500">No tickets found</p>
                </div>
              ) : (
                filteredTickets.slice(0, 10).map((ticket) => (
                  <div key={ticket.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          {getStatusIcon(ticket.status)}
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                            {ticket.status}
                          </span>
                          {ticket.team_tag && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              {ticket.team_tag}
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {ticket.title}
                        </h3>
                        <p className="mt-1 text-xs text-gray-500 line-clamp-1">
                          {ticket.description}
                        </p>
                        <div className="mt-1 flex items-center text-xs text-gray-500">
                          <Calendar className="h-3 w-3 mr-1" />
                          {format(new Date(ticket.created_at), 'MMM d, yyyy')}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Activity Log */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">My Activity</h2>
            </div>
            <div className="p-6">
              {activityLogs.length === 0 ? (
                <p className="text-gray-500 text-sm">No activity yet</p>
              ) : (
                <div className="space-y-4">
                  {activityLogs.map((log) => (
                    <div key={log.id} className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <div className="h-2 w-2 bg-blue-600 rounded-full mt-2"></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900">{log.action}</p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(log.created_at), 'MMM d, h:mm a')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}