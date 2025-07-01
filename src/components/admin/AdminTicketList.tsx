import React, { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { supabase, Ticket, User } from '../../lib/supabase'
import { TicketChat } from '../tickets/TicketChat'
import { 
  MessageCircle, 
  Search, 
  Filter,
  Clock, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  Calendar,
  Tag,
  User as UserIcon
} from 'lucide-react'
import { format } from 'date-fns'

interface TicketWithCustomer extends Ticket {
  customer?: User
}

export const AdminTicketList: React.FC = () => {
  const { userProfile } = useAuth()
  const [tickets, setTickets] = useState<TicketWithCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)

  useEffect(() => {
    if (userProfile) {
      loadTickets()
    }
  }, [userProfile])

  const loadTickets = async () => {
    if (!userProfile) return

    try {
      let query = supabase
        .from('tickets')
        .select(`
          *,
          customer:users!tickets_customer_id_fkey(*)
        `)

      // Filter based on role
      if (userProfile.role === 'supervisory_admin' || userProfile.role === 'agent') {
        query = query.eq('team_tag', userProfile.team_id)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (!error && data) {
        setTickets(data)
      }
    } catch (error) {
      console.error('Error loading tickets:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredTickets = tickets.filter(ticket => {
    const matchesFilter = filter === 'all' || ticket.status === filter
    const matchesSearch = ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.customer?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.customer?.email.toLowerCase().includes(searchTerm.toLowerCase())
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
        return 'All Tickets'
      case 'supervisory_admin':
        return 'Team Tickets'
      case 'agent':
        return 'My Tickets'
      default:
        return 'Tickets'
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
          <h1 className="text-2xl font-bold text-gray-900">{getRoleTitle()}</h1>
          <p className="text-gray-600">Manage and respond to support tickets</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search tickets, customers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 w-full sm:w-80"
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

      {/* Tickets List */}
      <div className="bg-white rounded-lg shadow">
        <div className="divide-y divide-gray-200">
          {filteredTickets.length === 0 ? (
            <div className="p-6 text-center">
              <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No tickets found</p>
            </div>
          ) : (
            filteredTickets.map((ticket) => (
              <div key={ticket.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      {getStatusIcon(ticket.status)}
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                        {ticket.status}
                      </span>
                      {ticket.team_tag && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          <Tag className="h-3 w-3 mr-1" />
                          {ticket.team_tag}
                        </span>
                      )}
                    </div>
                    
                    <h3 className="text-lg font-medium text-gray-900 mb-1">
                      {ticket.title}
                    </h3>
                    
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                      {ticket.description}
                    </p>
                    
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <div className="flex items-center space-x-1">
                        <UserIcon className="h-3 w-3" />
                        <span>{ticket.customer?.name || 'Unknown Customer'}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>{format(new Date(ticket.created_at), 'MMM d, yyyy')}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="ml-4 flex-shrink-0">
                    <button
                      onClick={() => setSelectedTicket(ticket)}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Open Chat
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Ticket Chat Modal */}
      {selectedTicket && (
        <TicketChat
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
          onTicketUpdate={loadTickets}
        />
      )}
    </div>
  )
}