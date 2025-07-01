import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useAuth } from '../../hooks/useAuth'
import { Eye, EyeOff, LogIn, AlertCircle, CheckCircle } from 'lucide-react'

interface LoginFormData {
  email: string
  password: string
  key?: string
}

interface LoginFormProps {
  isAdmin?: boolean
}

export const LoginForm: React.FC<LoginFormProps> = ({ isAdmin = false }) => {
  const [showPassword, setShowPassword] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>()

  useEffect(() => {
    // Check for success message from signup
    if (location.state?.message) {
      setSuccessMessage(location.state.message)
      // Clear the message from location state
      window.history.replaceState({}, document.title)
    }
  }, [location.state])

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true)
    setError('')
    setSuccessMessage('')

    const { error } = await signIn(data.email, data.password, data.key)

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      // Navigation will be handled by the auth state change
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            {isAdmin ? 'Admin Sign In' : 'Sign In'}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {isAdmin ? 'Access your admin dashboard' : 'Access your support tickets'}
          </p>
        </div>
        
        <form className="mt-8 space-y-6 bg-white p-8 rounded-lg shadow-md" onSubmit={handleSubmit(onSubmit)}>
          {successMessage && (
            <div className="bg-green-50 border border-green-200 rounded-md p-3">
              <div className="flex">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <div className="ml-3">
                  <p className="text-sm text-green-600">{successMessage}</p>
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

          <div className="space-y-4">
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
                  placeholder="Enter your password"
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

            {isAdmin && (
              <div>
                <label htmlFor="key" className="block text-sm font-medium text-gray-700">
                  Access Key
                </label>
                <div className="mt-1 relative">
                  <input
                    {...register('key', { required: 'Access key is required for admin login' })}
                    type={showKey ? 'text' : 'password'}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 pr-10 border"
                    placeholder="Enter your access key"
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
                  Required for super admin, supervisory admin, and agent access
                </p>
              </div>
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                <LogIn className="h-4 w-4 text-blue-500 group-hover:text-blue-400" />
              </span>
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </div>

          <div className="text-center">
            {!isAdmin ? (
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
                <Link to="/signup" className="font-medium text-blue-600 hover:text-blue-500">
                  Sign up here
                </Link>
              </p>
            ) : (
              <p className="text-sm text-gray-600">
                Customer login?{' '}
                <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
                  Go to customer portal
                </Link>
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}