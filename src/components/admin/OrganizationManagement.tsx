import React, { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { supabase, Organisation } from '../../lib/supabase'
import { 
  Building2, 
  Plus, 
  Trash2, 
  Search,
  X,
  AlertCircle,
  CheckCircle,
  Mail
} from 'lucide-react'
import { format } from 'date-fns'
import { useForm } from 'react-hook-form'

interface OrganisationWithDomains extends Organisation {
  email_domains?: string[]
}

interface CreateOrganisationFormData {
  name: string
  email_domains: string
}

export const OrganizationManagement: React.FC = () => {
  const { userProfile } = useAuth()
  const [organisations, setOrganisations] = useState<OrganisationWithDomains[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState('')
  const [createSuccess, setCreateSuccess] = useState('')

  const { register, handleSubmit, formState: { errors }, reset } = useForm<CreateOrganisationFormData>()

  useEffect(() => {
    if (userProfile) {
      loadOrganisations()
    }
  }, [userProfile])

  const loadOrganisations = async () => {
    const { data, error } = await supabase
      .from('organisations')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setOrganisations(data)
    }
    setLoading(false)
  }

  const deleteOrganisation = async (orgId: string, orgName: string) => {
    if (userProfile?.role !== 'super_admin') {
      alert('Only super administrators can delete organisations.')
      return
    }

    if (!confirm(`Are you sure you want to delete "${orgName}"? This action cannot be undone and will affect all users in this organisation.`)) {
      return
    }

    const { error } = await supabase
      .from('organisations')
      .delete()
      .eq('id', orgId)

    if (!error) {
      setOrganisations(organisations.filter(org => org.id !== orgId))

      // Log activity
      await supabase.from('activity_logs').insert({
        user_id: userProfile!.id,
        action: 'Deleted organisation',
        details: { organisation_name: orgName, organisation_id: orgId }
      })
    } else {
      alert('Failed to delete organisation. It may have associated users.')
    }
  }

  const onCreateOrganisation = async (data: CreateOrganisationFormData) => {
    setCreateLoading(true)
    setCreateError('')
    setCreateSuccess('')

    try {
      // Parse email domains
      const emailDomains = data.email_domains
        .split(',')
        .map(domain => domain.trim().toLowerCase())
        .filter(domain => domain.length > 0)

      // Validate email domains
      const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,}$/
      for (const domain of emailDomains) {
        if (!domainRegex.test(domain)) {
          setCreateError(`Invalid email domain: ${domain}`)
          setCreateLoading(false)
          return
        }
      }

      const { error } = await supabase
        .from('organisations')
        .insert({
          name: data.name,
          email_domains: emailDomains
        })

      if (error) {
        setCreateError(error.message)
        setCreateLoading(false)
        return
      }

      setCreateSuccess('Organisation created successfully!')
      reset()
      
      // Reload organisations list
      await loadOrganisations()

      // Log activity
      await supabase.from('activity_logs').insert({
        user_id: userProfile!.id,
        action: 'Created new organisation',
        details: { 
          organisation_name: data.name,
          email_domains: emailDomains
        }
      })

      setTimeout(() => {
        setShowCreateModal(false)
        setCreateSuccess('')
      }, 2000)
    } catch (error) {
      setCreateError('Failed to create organisation')
    } finally {
      setCreateLoading(false)
    }
  }

  const filteredOrganisations = organisations.filter(org =>
    org.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const canDelete = (orgName: string) => {
    return userProfile?.role === 'super_admin' && orgName !== 'Task Systems Limited'
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
          <h1 className="text-2xl font-bold text-gray-900">Organization Management</h1>
          <p className="text-gray-600">Manage organizations and their email domains</p>
        </div>
        {userProfile?.role === 'super_admin' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Organization
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search organizations..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 w-full"
        />
      </div>

      {/* Organizations List */}
      <div className="bg-white rounded-lg shadow">
        <div className="divide-y divide-gray-200">
          {filteredOrganisations.length === 0 ? (
            <div className="p-6 text-center">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No organizations found</p>
            </div>
          ) : (
            filteredOrganisations.map((org) => (
              <div key={org.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-medium text-gray-900">{org.name}</h3>
                      {org.name === 'Task Systems Limited' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          System Default
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Created {format(new Date(org.created_at), 'MMM d, yyyy')}
                    </p>
                    {org.email_domains && org.email_domains.length > 0 && (
                      <div className="mt-2">
                        <div className="flex items-center space-x-2">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">Allowed email domains:</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {org.email_domains.map((domain, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800"
                            >
                              @{domain}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {canDelete(org.name) && (
                      <button
                        onClick={() => deleteOrganisation(org.id, org.name)}
                        className="text-red-600 hover:text-red-700 p-1"
                        title="Delete organization"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create Organization Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Create Organization</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onCreateOrganisation)} className="space-y-4">
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
                <label className="block text-sm font-medium text-gray-700">Organization Name</label>
                <input
                  {...register('name', { required: 'Organization name is required' })}
                  type="text"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                  placeholder="Enter organization name"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Email Domains</label>
                <input
                  {...register('email_domains', { required: 'At least one email domain is required' })}
                  type="text"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                  placeholder="example.com, company.org"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Enter comma-separated email domains (e.g., example.com, company.org)
                </p>
                {errors.email_domains && (
                  <p className="mt-1 text-sm text-red-600">{errors.email_domains.message}</p>
                )}
              </div>

              <div className="bg-blue-50 p-3 rounded-md">
                <p className="text-sm text-blue-700">
                  Only users with email addresses from the specified domains will be able to register for this organization.
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
                  {createLoading ? 'Creating...' : 'Create Organization'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}