import React, { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  Users, 
  Ticket,
  Calendar,
  Filter,
  Download
} from 'lucide-react'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'

interface AnalyticsData {
  ticketsByTeam: { team: string; count: number; color: string }[]
  ticketsByStatus: { status: string; count: number; color: string }[]
  ticketsByMonth: { month: string; count: number }[]
  topCustomers: { name: string; email: string; count: number }[]
  totalStats: {
    totalTickets: number
    totalCustomers: number
    totalTeams: number
    avgResolutionTime: number
  }
}

export const Analytics: React.FC = () => {
  const { userProfile } = useAuth()
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('6months')
  const [selectedTeam, setSelectedTeam] = useState('all')
  const [teams, setTeams] = useState<any[]>([])

  useEffect(() => {
    if (userProfile) {
      loadAnalyticsData()
      loadTeams()
    }
  }, [userProfile, dateRange, selectedTeam])

  const loadTeams = async () => {
    const { data } = await supabase
      .from('teams')
      .select('*')
      .order('name')

    if (data) {
      setTeams(data)
    }
  }

  const loadAnalyticsData = async () => {
    if (!userProfile) return

    setLoading(true)
    try {
      const endDate = new Date()
      let startDate = new Date()

      switch (dateRange) {
        case '1month':
          startDate = subMonths(endDate, 1)
          break
        case '3months':
          startDate = subMonths(endDate, 3)
          break
        case '6months':
          startDate = subMonths(endDate, 6)
          break
        case '1year':
          startDate = subMonths(endDate, 12)
          break
      }

      // Base query with date filter
      let ticketsQuery = supabase
        .from('tickets')
        .select(`
          *,
          customer:users!tickets_customer_id_fkey(name, email)
        `)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())

      // Apply team filter if not 'all'
      if (selectedTeam !== 'all') {
        ticketsQuery = ticketsQuery.eq('team_tag', selectedTeam)
      }

      // Apply role-based filtering
      if (userProfile.role === 'supervisory_admin' || userProfile.role === 'agent') {
        ticketsQuery = ticketsQuery.eq('team_tag', userProfile.team_id)
      }

      const { data: tickets } = await ticketsQuery

      if (!tickets) {
        setLoading(false)
        return
      }

      // Process tickets by team
      const teamCounts = tickets.reduce((acc, ticket) => {
        const team = ticket.team_tag || 'Unassigned'
        acc[team] = (acc[team] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      const ticketsByTeam = Object.entries(teamCounts).map(([team, count], index) => ({
        team,
        count,
        color: getChartColor(index)
      }))

      // Process tickets by status
      const statusCounts = tickets.reduce((acc, ticket) => {
        acc[ticket.status] = (acc[ticket.status] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      const ticketsByStatus = Object.entries(statusCounts).map(([status, count], index) => ({
        status,
        count,
        color: getStatusColor(status)
      }))

      // Process tickets by month
      const monthCounts = tickets.reduce((acc, ticket) => {
        const month = format(new Date(ticket.created_at), 'MMM yyyy')
        acc[month] = (acc[month] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      const ticketsByMonth = Object.entries(monthCounts)
        .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
        .map(([month, count]) => ({ month, count }))

      // Process top customers
      const customerCounts = tickets.reduce((acc, ticket) => {
        const customer = ticket.customer
        if (customer) {
          const key = `${customer.name}-${customer.email}`
          acc[key] = {
            name: customer.name,
            email: customer.email,
            count: (acc[key]?.count || 0) + 1
          }
        }
        return acc
      }, {} as Record<string, { name: string; email: string; count: number }>)

      const topCustomers = Object.values(customerCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)

      // Calculate total stats
      const { count: totalCustomers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'customer')

      const { count: totalTeams } = await supabase
        .from('teams')
        .select('*', { count: 'exact', head: true })

      setAnalyticsData({
        ticketsByTeam,
        ticketsByStatus,
        ticketsByMonth,
        topCustomers,
        totalStats: {
          totalTickets: tickets.length,
          totalCustomers: totalCustomers || 0,
          totalTeams: totalTeams || 0,
          avgResolutionTime: 0 // Could be calculated based on ticket resolution times
        }
      })
    } catch (error) {
      console.error('Error loading analytics data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getChartColor = (index: number) => {
    const colors = [
      '#3B82F6', '#EF4444', '#10B981', '#F59E0B', 
      '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'
    ]
    return colors[index % colors.length]
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return '#F59E0B'
      case 'closed': return '#10B981'
      case 'resolved': return '#3B82F6'
      case 'unresolved': return '#EF4444'
      default: return '#6B7280'
    }
  }

  const exportData = () => {
    if (!analyticsData) return

    const csvContent = [
      ['Metric', 'Value'],
      ['Total Tickets', analyticsData.totalStats.totalTickets],
      ['Total Customers', analyticsData.totalStats.totalCustomers],
      ['Total Teams', analyticsData.totalStats.totalTeams],
      [''],
      ['Team', 'Tickets'],
      ...analyticsData.ticketsByTeam.map(item => [item.team, item.count]),
      [''],
      ['Status', 'Count'],
      ...analyticsData.ticketsByStatus.map(item => [item.status, item.count]),
      [''],
      ['Customer', 'Email', 'Tickets'],
      ...analyticsData.topCustomers.map(item => [item.name, item.email, item.count])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!analyticsData) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">No analytics data available</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600">Comprehensive insights into your support operations</p>
        </div>
        <button
          onClick={exportData}
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
        >
          <Download className="h-4 w-4 mr-2" />
          Export Data
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0 bg-white p-4 rounded-lg shadow">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="1month">Last Month</option>
              <option value="3months">Last 3 Months</option>
              <option value="6months">Last 6 Months</option>
              <option value="1year">Last Year</option>
            </select>
          </div>

          {userProfile?.role === 'super_admin' && (
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Teams</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.tag}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Ticket className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Tickets</p>
              <p className="text-2xl font-bold text-gray-900">{analyticsData.totalStats.totalTickets}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Users className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Customers</p>
              <p className="text-2xl font-bold text-gray-900">{analyticsData.totalStats.totalCustomers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Teams</p>
              <p className="text-2xl font-bold text-gray-900">{analyticsData.totalStats.totalTeams}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Resolution</p>
              <p className="text-2xl font-bold text-gray-900">2.5d</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tickets by Team - Pie Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Tickets by Team</h3>
            <PieChart className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            {analyticsData.ticketsByTeam.map((item, index) => (
              <div key={item.team} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: item.color }}
                  ></div>
                  <span className="text-sm text-gray-700">{item.team}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-900">{item.count}</span>
                  <span className="text-xs text-gray-500">
                    ({Math.round((item.count / analyticsData.totalStats.totalTickets) * 100)}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tickets by Status */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Tickets by Status</h3>
            <BarChart3 className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            {analyticsData.ticketsByStatus.map((item) => (
              <div key={item.status} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: item.color }}
                  ></div>
                  <span className="text-sm text-gray-700 capitalize">{item.status}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-900">{item.count}</span>
                  <span className="text-xs text-gray-500">
                    ({Math.round((item.count / analyticsData.totalStats.totalTickets) * 100)}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly Trend */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Monthly Ticket Trend</h3>
            <TrendingUp className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            {analyticsData.ticketsByMonth.map((item, index) => {
              const maxCount = Math.max(...analyticsData.ticketsByMonth.map(m => m.count))
              const percentage = (item.count / maxCount) * 100
              
              return (
                <div key={item.month} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">{item.month}</span>
                    <span className="font-medium text-gray-900">{item.count}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Top Customers */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Top Customers</h3>
            <Users className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            {analyticsData.topCustomers.slice(0, 8).map((customer, index) => (
              <div key={`${customer.name}-${customer.email}`} className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{customer.name}</p>
                  <p className="text-xs text-gray-500 truncate">{customer.email}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {customer.count} tickets
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}