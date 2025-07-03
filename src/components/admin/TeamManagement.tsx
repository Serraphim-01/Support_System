import React, { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { supabase, Team, User } from '../../lib/supabase'
import { 
  Users, 
  Plus, 
  Trash2, 
  Search,
  X,
  AlertCircle,
  CheckCircle,
  Shield,
  UserCheck,
  Tag
} from 'lucide-react'
import { format } from 'date-fns'
import { useForm } from 'react-hook-form'

interface TeamWithMembers extends Team {
  members?: TeamMember[]
  memberCount?: number
}

interface TeamMember {
  id: string
  user_id: string
  role: string
  user?: User
}

interface CreateTeamFormData {
  name: string
  tag: string
  supervisoryAdmins: string[]
  agents: string[]
}

export const TeamManagement: React.FC = () => {
  const { userProfile } = useAuth()
  const [teams, setTeams] = useState<TeamWithMembers[]>([])
  const [availableUsers, setAvailableUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null)
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState('')
  const [createSuccess, setCreateSuccess] = useState('')

  const { register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm<CreateTeamFormData>()
  const selectedSupervisoryAdmins = watch('supervisoryAdmins') || []
  const selectedAgents = watch('agents') || []

  useEffect(() => {
    if (userProfile) {
      loadTeams()
      loadAvailableUsers()
    }
  }, [userProfile])

  const loadTeams = async () => {
    const { data, error } = await supabase
      .from('teams')
      .select(`
        *,
        team_members (
          id,
          user_id,
          role,
          user:users (*)
        )
      `)
      .order('created_at', { ascending: false })

    if (!error && data) {
      const teamsWithMembers = data.map(team => ({
        ...team,
        members: team.team_members || [],
        memberCount: team.team_members?.length || 0
      }))
      setTeams(teamsWithMembers)
    }
    setLoading(false)
  }

  const loadAvailableUsers = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .in('role', ['supervisory_admin', 'agent'])
      .order('name')

    if (!error && data) {
      setAvailableUsers(data)
    }
  }

  const deleteTeam = async (teamId: string, teamName: string) => {
    if (teamName === 'Super Admins') {
      alert('Cannot delete the default Super Admins team.')
      return
    }

    if (!confirm(`Are you sure you want to delete "${teamName}"? This action cannot be undone.`)) {
      return
    }

    const { error } = await supabase
      .from('teams')
      .delete()
      .eq('id', teamId)

    if (!error) {
      setTeams(teams.filter(team => team.id !== teamId))

      // Log activity
      await supabase.from('activity_logs').insert({
        user_id: userProfile!.id,
        action: 'Deleted team',
        details: { team_name: teamName, team_id: teamId }
      })
    } else {
      alert('Failed to delete team. It may have associated tickets or members.')
    }
  }

  const onCreateTeam = async (data: CreateTeamFormData) => {
    setCreateLoading(true)
    setCreateError('')
    setCreateSuccess('')

    try {
      // Validate supervisory admin limit
      if (data.supervisoryAdmins.length > 2) {
        setCreateError('Maximum of 2 supervisory admins allowed per team')
        setCreateLoading(false)
        return
      }

      // Create team
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .insert({
          name: data.name,
          tag: data.tag
        })
        .select()
        .single()

      if (teamError) {
        setCreateError(teamError.message)
        setCreateLoading(false)
        return
      }

      // Add team members
      const teamMembers = [
        ...data.supervisoryAdmins.map(userId => ({
          team_id: teamData.id,
          user_id: userId,
          role: 'supervisory_admin'
        })),
        ...data.agents.map(userId => ({
          team_id: teamData.id,
          user_id: userId,
          role: 'agent'
        }))
      ]

      if (teamMembers.length > 0) {
        const { error: membersError } = await supabase
          .from('team_members')
          .insert(teamMembers)

        if (membersError) {
          // Clean up created team if member insertion fails
          await supabase.from('teams').delete().eq('id', teamData.id)
          setCreateError(membersError.message)
          setCreateLoading(false)
          return
        }

        // Update users' team_id
        const allUserIds = [...data.supervisoryAdmins, ...data.agents]
        await supabase
          .from('users')
          .update({ team_id: teamData.id })
          .in('id', allUserIds)
      }

      setCreateSuccess('Team created successfully!')
      reset()
      
      // Reload teams list
      await loadTeams()

      // Log activity
      await supabase.from('activity_logs').insert({
        user_id: userProfile!.id,
        action: 'Created new team',
        details: { 
          team_name: data.name,
          team_tag: data.tag,
          supervisory_admins: data.supervisoryAdmins.length,
          agents: data.agents.length
        }
      })

      setTimeout(() => {
        setShowCreateModal(false)
        setCreateSuccess('')
      }, 2000)
    } catch (error) {
      setCreateError('Failed to create team')
    } finally {
      setCreateLoading(false)
    }
  }

  const filteredTeams = teams.filter(team =>
    team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    team.tag.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const availableSupervisoryAdmins = availableUsers.filter(user => 
    user.role === 'supervisory_admin' && !user.team_id
  )
  
  const availableAgents = availableUsers.filter(user => 
    user.role === 'agent' && !user.team_id
  )

  const canCreateTeam = userProfile?.role && ['super_admin', 'supervisory_admin'].includes(userProfile.role)
  const canDeleteTeam = userProfile?.role === 'super_admin'

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
          <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
          <p className="text-gray-600">Manage support teams and their members</p>
        </div>
        {canCreateTeam && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Team
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search teams..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 w-full"
        />
      </div>

      {/* Teams List */}
      <div className="bg-white rounded-lg shadow">
        <div className="divide-y divide-gray-200">
          {filteredTeams.length === 0 ? (
            <div className="p-6 text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No teams found</p>
            </div>
          ) : (
            filteredTeams.map((team) => (
              <div key={team.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-medium text-gray-900">{team.name}</h3>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        <Tag className="h-3 w-3 mr-1" />
                        {team.tag}
                      </span>
                      {team.name === 'Super Admins' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          <Shield className="h-3 w-3 mr-1" />
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Created {format(new Date(team.created_at), 'MMM d, yyyy')} • {team.memberCount} members
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setExpandedTeam(expandedTeam === team.id ? null : team.id)}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      {expandedTeam === team.id ? 'Hide' : 'View'} Members
                    </button>
                    {canDeleteTeam && team.name !== 'Super Admins' && (
                      <button
                        onClick={() => deleteTeam(team.id, team.name)}
                        className="text-red-600 hover:text-red-700 p-1"
                        title="Delete team"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {expandedTeam === team.id && team.members && (
                  <div className="mt-4 border-t pt-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Team Members</h4>
                    {team.members.length === 0 ? (
                      <p className="text-sm text-gray-500">No members assigned</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {team.members.map((member) => (
                          <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                            <div className="flex items-center space-x-3">
                              <div className="flex-shrink-0">
                                {member.role === 'supervisory_admin' ? (
                                  <Shield className="h-5 w-5 text-purple-600" />
                                ) : (
                                  <UserCheck className="h-5 w-5 text-blue-600" />
                                )}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {member.user?.name || 'Unknown User'}
                                </p>
                                <p className="text-xs text-gray-500">{member.user?.email}</p>
                              </div>
                            </div>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              member.role === 'supervisory_admin' 
                                ? 'bg-purple-100 text-purple-800' 
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {member.role.replace('_', ' ')}
                            </span>
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
      </div>

      {/* Create Team Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Create New Team</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onCreateTeam)} className="space-y-4">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Team Name</label>
                  <input
                    {...register('name', { required: 'Team name is required' })}
                    type="text"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                    placeholder="Enter team name"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Team Tag</label>
                  <input
                    {...register('tag', { required: 'Team tag is required' })}
                    type="text"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                    placeholder="e.g., support, technical"
                  />
                  {errors.tag && (
                    <p className="mt-1 text-sm text-red-600">{errors.tag.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Supervisory Admins (Max 2)
                </label>
                <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-300 rounded-md p-2">
                  {availableSupervisoryAdmins.length === 0 ? (
                    <p className="text-sm text-gray-500">No available supervisory admins</p>
                  ) : (
                    availableSupervisoryAdmins.map((user) => (
                      <label key={user.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          value={user.id}
                          disabled={selectedSupervisoryAdmins.length >= 2 && !selectedSupervisoryAdmins.includes(user.id)}
                          onChange={(e) => {
                            const current = selectedSupervisoryAdmins || []
                            if (e.target.checked) {
                              setValue('supervisoryAdmins', [...current, user.id])
                            } else {
                              setValue('supervisoryAdmins', current.filter(id => id !== user.id))
                            }
                          }}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-700">{user.name} ({user.email})</span>
                      </label>
                    ))
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Selected: {selectedSupervisoryAdmins.length}/2
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Agents
                </label>
                <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-300 rounded-md p-2">
                  {availableAgents.length === 0 ? (
                    <p className="text-sm text-gray-500">No available agents</p>
                  ) : (
                    availableAgents.map((user) => (
                      <label key={user.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          value={user.id}
                          onChange={(e) => {
                            const current = selectedAgents || []
                            if (e.target.checked) {
                              setValue('agents', [...current, user.id])
                            } else {
                              setValue('agents', current.filter(id => id !== user.id))
                            }
                          }}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-700">{user.name} ({user.email})</span>
                      </label>
                    ))
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Selected: {selectedAgents.length} agents
                </p>
              </div>

              <div className="bg-blue-50 p-3 rounded-md">
                <p className="text-sm text-blue-700">
                  <strong>Note:</strong> Super admins cannot be added to teams as they have global access. 
                  Teams can have a maximum of 2 supervisory admins and unlimited agents.
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {createLoading ? 'Creating...' : 'Create Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}