import React from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { 
  LogOut, 
  User, 
  Settings, 
  Ticket,
  Users,
  Building2,
  Shield,
  Activity
} from 'lucide-react'

interface LayoutProps {
  children: React.ReactNode
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { userProfile, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const getNavigationItems = () => {
    if (!userProfile) return []

    const baseItems = [
      { name: 'Dashboard', href: userProfile.role === 'customer' ? '/dashboard' : '/admin/dashboard', icon: Activity },
    ]

    if (userProfile.role === 'customer') {
      return [
        ...baseItems,
        { name: 'My Tickets', href: '/tickets', icon: Ticket },
      ]
    }

    if (userProfile.role === 'super_admin') {
      return [
        ...baseItems,
        { name: 'All Tickets', href: '/admin/tickets', icon: Ticket },
        { name: 'Teams', href: '/admin/teams', icon: Users },
        { name: 'Organizations', href: '/admin/organizations', icon: Building2 },
        { name: 'User Management', href: '/admin/users', icon: Shield },
      ]
    }

    if (userProfile.role === 'supervisory_admin') {
      return [
        ...baseItems,
        { name: 'Team Tickets', href: '/admin/tickets', icon: Ticket },
        { name: 'Team Members', href: '/admin/team-members', icon: Users },
        { name: 'Organizations', href: '/admin/organizations', icon: Building2 },
      ]
    }

    if (userProfile.role === 'agent') {
      return [
        ...baseItems,
        { name: 'My Tickets', href: '/admin/tickets', icon: Ticket },
      ]
    }

    return baseItems
  }

  const navigationItems = getNavigationItems()

  const isActiveRoute = (href: string) => {
    return location.pathname === href
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-2">
                <Ticket className="h-8 w-8 text-blue-600" />
                <span className="text-xl font-bold text-gray-900">SupportDesk</span>
              </Link>
            </div>

            <div className="flex items-center space-x-4">
              {userProfile && (
                <>
                  <div className="flex items-center space-x-2">
                    <User className="h-5 w-5 text-gray-400" />
                    <span className="text-sm text-gray-700">{userProfile.name}</span>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                      {userProfile.role.replace('_', ' ')}
                    </span>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center space-x-1 text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="text-sm">Sign Out</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="flex">
        {userProfile && navigationItems.length > 0 && (
          <aside className="w-64 bg-white shadow-sm min-h-[calc(100vh-4rem)]">
            <nav className="p-4 space-y-2">
              {navigationItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActiveRoute(item.href)
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </Link>
              ))}
            </nav>
          </aside>
        )}

        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}