import React, { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { supabase, User, Ticket } from '../../lib/supabase'
import { 
  Users, 
  Shield, 
  Plus, 
  Trash2, 
  Search,
  Filter,
  Eye,
  EyeOff,
  X,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { format } from 'date-fns'
import { useForm } from 'react-hook-form'

interface UserWithTickets extends User {
  tickets?: Ticket[]
}

interface CreateAdminFormData {
  name: string
  email: string
  password: string
  confirmPassword: string
  key: string
  role: 'super_admin' | 'supervisory_admin' | 'agent'
}

export const UserManagement: React.FC = () => {
  const { userProfile } = useAuth()
  const [users, setUsers] = useState<UserWithTickets[]>([])
  const [admins, setAdmins] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'users' | 'admins'>('users')
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateAdminModal, setShowCreateAdminModal] = useState(false)
  const [expandedUser, setExpandedUser] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState('')
  const [createSuccess, setCreateSuccess] = useState('')

  const { register, handleSubmit, formState: { errors }, watch, reset } = useForm<CreateAdminFormData>()
  const password = watch('password')

  useEffect(() => {
    if (userProfile?.role === 'super_admin') {
      loadUsers()
      loadAdmins()
    }
  }, [userProfile])

  const loadUsers = async () => {
    const { data: usersData, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'customer')
      .order('created_at', { ascending: false })

    if (!error && usersData) {
      // Load tickets for each user
      const usersWithTickets = await Promise.all(
        usersData.map(async (user) => {
          const { data: tickets } = await supabase
            .from('tickets')
            .select('*')
            .eq('customer_id', user.id)
            .order('created_at', { ascending: false })

          return { ...user, tickets: tickets || [] }
        })
      )
      setUsers(usersWithTickets)
    }
    setLoading(false)
  }

  const loadAdmins = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .in('role', ['super_admin', 'supervisory_admin', 'agent'])
      .order('created_at', { ascending: false })

    if (!error && data) {
      setAdmins(data)
    }
  }

  const deleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return
    }

    const { error } = await supabase.auth.admin.deleteUser(userId)

    if (!error) {
      if (activeTab === 'users') {
        setUsers(users.filter(user => user.id !== userId))
      } else {
        setAdmins(admins.filter(admin => admin.id !== userId))
      }

      // Log activity
      await supabase.from('activity_logs').insert({
        user_id: userProfile!.id,
        action: 'Deleted user',
        details: { deleted_user_id: userId }
      })
    }
  }

  const onCreateAdmin = async (data: CreateAdminFormData) => {
    setCreateLoading(true)
    setCreateError('')
    setCreateSuccess('')

    if (data.password !== data.confirmPassword) {
      setCreateError('Passwords do not match')
      setCreateLoading(false)
      return
    }

    try {
      // Get Task Systems Limited organisation ID
      const { data: orgData } = await supabase
        .from('organisations')
        .select('id')
        .eq('name', 'Task Systems Limited')
        .single()

      if (!orgData) {
        setCreateError('Task Systems Limited organisation not found')
        setCreateLoading(false)
        return
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            name: data.name,
            organisationId: orgData.id,
            role: data.role,
            key: data.key,
          }
        }
      })

      if (authError) {
        setCreateError(authError.message)
        setCreateLoading(false)
        return
      }

      setCreateSuccess(`${data.role.replace('_', ' ')} account created successfully!`)
      reset()
      
      // Reload admins list
      await loadAdmins()

      // Log activity
      await supabase.from('activity_logs').insert({
        user_id: userProfile!.id,
        action: 'Created new admin account',
        details: { 
          new_admin_email: data.email,
          new_admin_role: data.role
        }
      })

      setTimeout(() => {
        setShowCreateAdminModal(false)
        setCreateSuccess('')
      }, 2000)
    } catch (error) {
      setCreateError('Failed to create admin account')
    } finally {
      setCreateLoading(false)
    }
  }

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredAdmins = admins.filter(admin =>
    admin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

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

  if (userProfile?.role !== 'super_admin') {
    return (
      <div className="text-center py-12">
        <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
        <p className="text-gray-600">You don't have permission to access user management.</p>
      </div>
    )
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
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600">Manage users and administrators</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('users')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'users'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Users className="h-4 w-4 inline mr-2" />
            Users ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('admins')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'admins'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Shield className="h-4 w-4 inline mr-2" />
            Admins ({admins.length})
          </button>
        </nav>
      </div>

      {/* Search and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={`Search ${activeTab}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {activeTab === 'admins' && (
          <button
            onClick={() => setShowCreateAdminModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Admin
          </button>
        )}
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow">
        {activeTab === 'users' ? (
          <div className="divide-y divide-gray-200">
            {filteredUsers.length === 0 ? (
              <div className="p-6 text-center">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No users found</p>
              </div>
            ) : (
              filteredUsers.map((user) => (
                <div key={user.id} className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-medium text-gray-900">{user.name}</h3>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {user.role}
                        </span>
                        {user.is_verified && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Verified
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{user.email}</p>
                      <p className="text-xs text-gray-500">
                        Joined {format(new Date(user.created_at), 'MMM d, yyyy')}
                      </p>
                      <p className="text-sm text-gray-700 mt-1">
                        Tickets: {user.tickets?.length || 0}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setExpandedUser(expandedUser === user.id ? null : user.id)}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        {expandedUser === user.id ? 'Hide' : 'View'} Tickets
                      </button>
                      <button
                        onClick={() => deleteUser(user.id)}
                        className="text-red-600 hover:text-red-700 p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {expandedUser === user.id && user.tickets && (
                    <div className="mt-4 border-t pt-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-3">User Tickets</h4>
                      {user.tickets.length === 0 ? (
                        <p className="text-sm text-gray-500">No tickets created</p>
                      ) : (
                        <div className="space-y-2">
                          {user.tickets.map((ticket) => (
                            <div key={ticket.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                              <div className="flex-1">
                                <h5 className="text-sm font-medium text-gray-900">{ticket.title}</h5>
                                <div className="flex items-center space-x-2 mt-1">
                                  {ticket.team_tag && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                      {ticket.team_tag}
                                    </span>
                                  )}
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(ticket.status)}`}>
                                    {ticket.status}
                                  </span>
                                </div>
                              </div>
                              <div className="text-xs text-gray-500">
                                {format(new Date(ticket.created_at), 'MMM d, yyyy')}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredAdmins.length === 0 ? (
              <div className="p-6 text-center">
                <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No admins found</p>
              </div>
            ) : (
              filteredAdmins.map((admin) => (
                <div key={admin.id} className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-medium text-gray-900">{admin.name}</h3>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          {admin.role.replace('_', ' ')}
                        </span>
                        {admin.is_verified && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Verified
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{admin.email}</p>
                      <p className="text-xs text-gray-500">
                        Created {format(new Date(admin.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => deleteUser(admin.id)}
                        className="text-red-600 hover:text-red-700 p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Create Admin Modal */}
      {showCreateAdminModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Create Admin Account</h3>
              <button
                onClick={() => setShowCreateAdminModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onCreateAdmin)} className="space-y-4">
              {createSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-md p-3">
                  <div className="flex">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    <div className="ml-3">
                      <p className="text-sm text-green-600">{createSuccess}</p>
                    </div>
                  </div>
                </div>
              )}

              {createError && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                    <div className="ml-3">
                      <p className="text-sm text-red-600">{createError}</p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  {...register('name', { required: 'Name is required' })}
                  type="text"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  {...register('email', { 
                    required: 'Email is required',
                    pattern: {
                      value: /^\S+@\S+$/i,
                      message: 'Please enter a valid email'
                    }
                  })}
                  type="email"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Role</label>
                <select
                  {...register('role', { required: 'Role is required' })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                >
                  <option value="">Select role</option>
                  <option value="super_admin">Super Admin</option>
                  <option value="supervisory_admin">Supervisory Admin</option>
                  <option value="agent">Agent</option>
                </select>
                {errors.role && (
                  <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Access Key</label>
                <div className="mt-1 relative">
                  <input
                    {...register('key', { required: 'Access key is required' })}
                    type={showKey ? 'text' : 'password'}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 pr-10 border"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowKey(!showKey)}
                  >
                    {showKey ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
                {errors.key && (
                  <p className="mt-1 text-sm text-red-600">{errors.key.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <div className="mt-1 relative">
                  <input
                    {...register('password', { 
                      required: 'Password is required',
                      minLength: {
                        value: 8,
                        message: 'Password must be at least 8 characters'
                      }
                    })}
                    type={showPassword ? 'text' : 'password'}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 pr-10 border"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
                <div className="mt-1 relative">
                  <input
                    {...register('confirmPassword', { 
                      required: 'Please confirm your password',
                      validate: value => value === password || 'Passwords do not match'
                    })}
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 pr-10 border"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
                )}
              </div>

              <div className="bg-blue-50 p-3 rounded-md">
                <p className="text-sm text-blue-700">
                  <strong>Organisation:</strong> Task Systems Limited (Auto-assigned)
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateAdminModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {createLoading ? 'Creating...' : 'Create Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}