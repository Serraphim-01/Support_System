import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useAuth } from '../../hooks/useAuth'
import { supabase, Organisation } from '../../lib/supabase'
import { Eye, EyeOff, UserPlus, Shield } from 'lucide-react'

interface SignupFormData {
  name: string
  email: string
  password: string
  confirmPassword: string
  organisationId: string
  key?: string
  isSuperAdmin: boolean
}

export const SignupForm: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [organisations, setOrganisations] = useState<Organisation[]>([])
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  
  const { signUp } = useAuth()
  const navigate = useNavigate()
  
  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<SignupFormData>({
    defaultValues: {
      isSuperAdmin: false
    }
  })
  const password = watch('password')

  useEffect(() => {
    loadOrganisations()
  }, [])

  useEffect(() => {
    setValue('isSuperAdmin', isSuperAdmin)
    if (isSuperAdmin) {
      // Auto-select Task Systems Limited for super admin
      const taskSystems = organisations.find(org => org.name === 'Task Systems Limited')
      if (taskSystems) {
        setValue('organisationId', taskSystems.id)
      }
    } else {
      setValue('organisationId', '')
    }
  }, [isSuperAdmin, organisations, setValue])

  const loadOrganisations = async () => {
    const { data, error } = await supabase
      .from('organisations')
      .select('*')
      .order('name')

    if (!error && data) {
      setOrganisations(data)
    }
  }

  const onSubmit = async (data: SignupFormData) => {
    setLoading(true)
    setError('')

    if (data.password !== data.confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    const role = data.isSuperAdmin ? 'super_admin' : 'customer'
    
    const { error } = await signUp(
      data.email,
      data.password,
      data.name,
      data.organisationId,
      data.key,
      role
    )

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      navigate('/login', { 
        state: { 
          message: `Account created successfully! Please check your email to verify your account before signing in.${data.isSuperAdmin ? ' You have been registered as a Super Administrator.' : ''}` 
        }
      })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Create Account
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Join our support platform
          </p>
        </div>
        
        <form className="mt-8 space-y-6 bg-white p-8 rounded-lg shadow-md" onSubmit={handleSubmit(onSubmit)}>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Super Admin Toggle */}
          <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <Shield className="h-5 w-5 text-blue-600" />
            <div className="flex-1">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSuperAdmin}
                  onChange={(e) => setIsSuperAdmin(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm font-medium text-blue-900">
                  Register as Super Administrator
                </span>
              </label>
              <p className="text-xs text-blue-700 mt-1">
                Check this box if you have a super admin key
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <input
                {...register('name', { required: 'Name is required' })}
                type="text"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                placeholder="Enter your full name"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="organisationId" className="block text-sm font-medium text-gray-700">
                Organisation
              </label>
              <select
                {...register('organisationId', { required: 'Please select an organisation' })}
                disabled={isSuperAdmin}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">
                  {isSuperAdmin ? 'Task Systems Limited (Auto-selected)' : 'Select your organisation'}
                </option>
                {organisations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
              {errors.organisationId && (
                <p className="mt-1 text-sm text-red-600">{errors.organisationId.message}</p>
              )}
              {isSuperAdmin && (
                <p className="mt-1 text-xs text-blue-600">
                  Super administrators are automatically assigned to Task Systems Limited
                </p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
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
                placeholder="Enter your email"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            {isSuperAdmin && (
              <div>
                <label htmlFor="key" className="block text-sm font-medium text-gray-700">
                  Super Admin Key
                </label>
                <div className="mt-1 relative">
                  <input
                    {...register('key')}
                    type={showKey ? 'text' : 'password'}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 pr-10 border"
                    placeholder="Enter super admin key"
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
                <p className="mt-1 text-xs text-gray-500">
                  This key is provided to authorized super administrators only
                </p>
              </div>
            )}

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
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
                  placeholder="Create a password"
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
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <div className="mt-1 relative">
                <input
                  {...register('confirmPassword', { 
                    required: 'Please confirm your password',
                    validate: value => value === password || 'Passwords do not match'
                  })}
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 pr-10 border"
                  placeholder="Confirm your password"
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
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                {isSuperAdmin ? (
                  <Shield className="h-4 w-4 text-blue-500 group-hover:text-blue-400" />
                ) : (
                  <UserPlus className="h-4 w-4 text-blue-500 group-hover:text-blue-400" />
                )}
              </span>
              {loading ? 'Creating Account...' : `Create ${isSuperAdmin ? 'Super Admin ' : ''}Account`}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
                Sign in here
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}