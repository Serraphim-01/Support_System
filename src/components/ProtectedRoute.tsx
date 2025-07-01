import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { LoadingSpinner } from './LoadingSpinner'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: string[]
  redirectTo?: string
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  redirectTo = '/login'
}) => {
  const { user, userProfile, loading } = useAuth()

  if (loading) {
    return <LoadingSpinner />
  }

  if (!user || !userProfile) {
    return <Navigate to={redirectTo} replace />
  }

  if (requiredRole && !requiredRole.includes(userProfile.role)) {
    const dashboardPath = userProfile.role === 'customer' ? '/dashboard' : '/admin/dashboard'
    return <Navigate to={dashboardPath} replace />
  }

  return <>{children}</>
}