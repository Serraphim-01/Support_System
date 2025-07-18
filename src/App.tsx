import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './components/AuthProvider'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/Layout'
import { useAuth } from './hooks/useAuth'

// Page imports
import { HomePage } from './pages/HomePage'
import { LoginForm } from './components/auth/LoginForm'
import { SignupForm } from './components/auth/SignupForm'
import { CustomerDashboard } from './components/dashboard/CustomerDashboard'
import { AdminDashboard } from './components/dashboard/AdminDashboard'
import { UserManagement } from './components/admin/UserManagement'
import { OrganizationManagement } from './components/admin/OrganizationManagement'
import { TeamManagement } from './components/admin/TeamManagement'
import { Analytics } from './components/admin/Analytics'
import { AdminTicketList } from './components/admin/AdminTicketList'
import { CreateTicketForm } from './components/tickets/CreateTicketForm'

const AppRoutes: React.FC = () => {
  const { user, userProfile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Redirect authenticated users to their appropriate dashboard
  const getDashboardRoute = () => {
    if (!userProfile) return '/login'
    return userProfile.role === 'customer' ? '/dashboard' : '/admin/dashboard'
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route 
        path="/" 
        element={user ? <Navigate to={getDashboardRoute()} replace /> : <HomePage />} 
      />
      <Route 
        path="/login" 
        element={user ? <Navigate to={getDashboardRoute()} replace /> : <LoginForm />} 
      />
      <Route 
        path="/signup" 
        element={user ? <Navigate to={getDashboardRoute()} replace /> : <SignupForm />} 
      />
      <Route 
        path="/admin/login" 
        element={user ? <Navigate to={getDashboardRoute()} replace /> : <LoginForm isAdmin />} 
      />

      {/* Protected routes */}
      <Route path="/dashboard" element={
        <ProtectedRoute requiredRole={['customer']}>
          <Layout>
            <CustomerDashboard />
          </Layout>
        </ProtectedRoute>
      } />

      <Route path="/tickets/new" element={
        <ProtectedRoute requiredRole={['customer']}>
          <Layout>
            <CreateTicketForm />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/admin/dashboard" element={
        <ProtectedRoute requiredRole={['super_admin', 'supervisory_admin', 'agent']}>
          <Layout>
            <AdminDashboard />
          </Layout>
        </ProtectedRoute>
      } />

      <Route path="/admin/tickets" element={
        <ProtectedRoute requiredRole={['super_admin', 'supervisory_admin', 'agent']}>
          <Layout>
            <AdminTicketList />
          </Layout>
        </ProtectedRoute>
      } />

      <Route path="/admin/teams" element={
        <ProtectedRoute requiredRole={['super_admin', 'supervisory_admin']}>
          <Layout>
            <TeamManagement />
          </Layout>
        </ProtectedRoute>
      } />

      <Route path="/admin/users" element={
        <ProtectedRoute requiredRole={['super_admin']}>
          <Layout>
            <UserManagement />
          </Layout>
        </ProtectedRoute>
      } />

      <Route path="/admin/organizations" element={
        <ProtectedRoute requiredRole={['super_admin', 'supervisory_admin']}>
          <Layout>
            <OrganizationManagement />
          </Layout>
        </ProtectedRoute>
      } />

      <Route path="/admin/analytics" element={
        <ProtectedRoute requiredRole={['super_admin', 'supervisory_admin', 'agent']}>
          <Layout>
            <Analytics />
          </Layout>
        </ProtectedRoute>
      } />
      
      {/* Catch all route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  )
}

export default App