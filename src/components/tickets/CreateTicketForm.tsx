import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useAuth } from '../../hooks/useAuth'
import { supabase, Team } from '../../lib/supabase'
import { X, Plus, AlertCircle, CheckCircle } from 'lucide-react'

interface CreateTicketFormData {
  title: string
  description: string
  team_tag: string
}

interface CreateTicketFormProps {
  onClose?: () => void
  isModal?: boolean
}

export const CreateTicketForm: React.FC<CreateTicketFormProps> = ({ onClose, isModal = false }) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [teams, setTeams] = useState<Team[]>([])
  
  const { userProfile } = useAuth()
  const navigate = useNavigate()
  
  const { register, handleSubmit, formState: { errors }, reset } = useForm<CreateTicketFormData>()

  useEffect(() => {
    loadTeams()
  }, [])

  const loadTeams = async () => {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .order('name')

    if (!error && data) {
      setTeams(data)
    }
  }

  const onSubmit = async (data: CreateTicketFormData) => {
    if (!userProfile) return

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const { error: ticketError } = await supabase
        .from('tickets')
        .insert({
          title: data.title,
          description: data.description,
          customer_id: userProfile.id,
          team_tag: data.team_tag || null,
          status: 'open'
        })

      if (ticketError) {
        setError(ticketError.message)
        return
      }

      // Log activity
      await supabase.from('activity_logs').insert({
        user_id: userProfile.id,
        action: 'Created new ticket',
        details: { 
          title: data.title,
          team_tag: data.team_tag,
          status: 'open'
        }
      })

      setSuccess('Ticket created successfully!')
      reset()

      if (isModal && onClose) {
        setTimeout(() => {
          onClose()
        }, 1500)
      } else {
        setTimeout(() => {
          navigate('/dashboard')
        }, 1500)
      }
    } catch (err) {
      setError('Failed to create ticket. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const formContent = (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-3">
          <div className="flex">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <div className="ml-3">
              <p className="text-sm text-green-600">{success}</p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
          Ticket Name *
        </label>
        <input
          {...register('title', { required: 'Ticket name is required' })}
          type="text"
          className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
          placeholder="Brief description of your issue"
        />
        {errors.title && (
          <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
          Issue Description *
        </label>
        <textarea
          {...register('description', { required: 'Issue description is required' })}
          rows={4}
          className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
          placeholder="Please provide detailed information about your issue..."
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="team_tag" className="block text-sm font-medium text-gray-700 mb-1">
          Tag (Optional)
        </label>
        <select
          {...register('team_tag')}
          className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
        >
          <option value="">Select a team (optional)</option>
          {teams.map((team) => (
            <option key={team.id} value={team.tag}>
              {team.name} ({team.tag})
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-500">
          Select a team to route your ticket to the appropriate support group
        </p>
      </div>

      <div className="flex justify-end space-x-3">
        {isModal && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          {loading ? 'Creating...' : 'Create Ticket'}
        </button>
      </div>
    </form>
  )

  if (isModal) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Create New Ticket</h3>
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            )}
          </div>
          {formContent}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Create New Ticket</h1>
        {formContent}
      </div>
    </div>
  )
}