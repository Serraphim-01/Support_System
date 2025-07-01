import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase, Ticket, ActivityLog } from '../../lib/supabase'
import { 
  Plus, 
  Filter, 
  Search, 
  MessageCircle, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  Calendar
} from 'lucide-react'
import { format } from 'date-fns'

export const CustomerDashboard: React.FC = () => {
  const { userProfile } = useAuth()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (userProfile) {
      loadTickets()
      loadActivityLogs()
    }
  }, [userProfile])

  const loadTickets = async () => {
    if (!userProfile) return

    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('customer_id', userProfile.id)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setTickets(data)
    }
    setLoading(false)
  }

  const loadActivityLogs = async () => {
    if (!userProfile) return

    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('user_id', userProfile.id)
      .order('created_at', { ascending: false })
      .limit(10)

    if (!error && data) {
      setActivityLogs(data)
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
            Welcome back, {userProfile?.name}
          </h1>
          <p className="text-gray-600">Manage your support tickets and track progress</p>
        </div>
        <Link
          to="/tickets/new"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Ticket
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Clock className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Tickets</p>
              <p className="text-2xl font-bold text-gray-900">{tickets.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <AlertCircle className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Open</p>
              <p className="text-2xl font-bold text-gray-900">
                {tickets.filter(t => t.status === 'open').length}
              </p>
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
              <p className="text-2xl font-bold text-gray-900">
                {tickets.filter(t => t.status === 'resolved').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Unresolved</p>
              <p className="text-2xl font-bold text-gray-900">
                {tickets.filter(t => t.status === 'unresolved').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tickets Section */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                <h2 className="text-lg font-medium text-gray-900">My Tickets</h2>
                
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

            <div className="divide-y divide-gray-200">
              {filteredTickets.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-gray-500">No tickets found</p>
                  <Link
                    to="/tickets/new"
                    className="mt-2 inline-flex items-center text-sm text-blue-600 hover:text-blue-500"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Create your first ticket
                  </Link>
                </div>
              ) : (
                filteredTickets.map((ticket) => (
                  <div key={ticket.id} className="p-6 hover:bg-gray-50 transition-colors">
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
                        <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                          {ticket.description}
                        </p>
                        <div className="mt-2 flex items-center text-xs text-gray-500">
                          <Calendar className="h-3 w-3 mr-1" />
                          {format(new Date(ticket.created_at), 'MMM d, yyyy')}
                        </div>
                      </div>
                      <div className="ml-4 flex-shrink-0">
                        <Link
                          to={`/tickets/${ticket.id}`}
                          className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                        >
                          <MessageCircle className="h-3 w-3 mr-1" />
                          View
                        </Link>
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
              <h2 className="text-lg font-medium text-gray-900">Recent Activity</h2>
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