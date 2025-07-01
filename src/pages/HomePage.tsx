import React from 'react'
import { Link } from 'react-router-dom'
import { Ticket, Users, Shield, MessageCircle, Clock, Star } from 'lucide-react'

export const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Ticket className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">SupportDesk</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                to="/login"
                className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Get Started
              </Link>
              <Link
                to="/admin/login"
                className="text-blue-600 hover:text-blue-700 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Admin Portal
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 mb-6">
            Professional
            <span className="text-blue-600"> Support Ticketing</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Streamline your customer support with our comprehensive ticketing system. 
            Multi-role access, real-time chat, and powerful management tools.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/signup"
              className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              Start Free Trial
            </Link>
            <Link
              to="/admin/login"
              className="inline-flex items-center justify-center px-8 py-3 border border-blue-600 text-base font-medium rounded-md text-blue-600 bg-white hover:bg-blue-50 transition-colors"
            >
              Admin Access
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Everything you need for support excellence
          </h2>
          <p className="text-lg text-gray-600">
            Comprehensive features designed for modern customer support teams
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="bg-white rounded-lg shadow-md p-8 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mb-4">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Multi-Role Access</h3>
            <p className="text-gray-600">
              Support for customers, agents, supervisory admins, and super admins with role-based permissions.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-8 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mb-4">
              <MessageCircle className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Real-Time Chat</h3>
            <p className="text-gray-600">
              Instant messaging between customers and support agents with live updates and notifications.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-8 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg mb-4">
              <Shield className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Secure & Compliant</h3>
            <p className="text-gray-600">
              Enterprise-grade security with email verification, access keys, and audit trails.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-8 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-center w-12 h-12 bg-orange-100 rounded-lg mb-4">
              <Ticket className="h-6 w-6 text-orange-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Smart Ticketing</h3>
            <p className="text-gray-600">
              Advanced ticket management with team assignment, status tracking, and escalation workflows.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-8 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-lg mb-4">
              <Clock className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Activity Tracking</h3>
            <p className="text-gray-600">
              Comprehensive activity logs and audit trails for all user actions and system changes.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-8 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-center w-12 h-12 bg-yellow-100 rounded-lg mb-4">
              <Star className="h-6 w-6 text-yellow-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Team Management</h3>
            <p className="text-gray-600">
              Organize support teams with tags, supervisors, and hierarchical access control.
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Ready to transform your support?
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Join thousands of teams already using SupportDesk to deliver exceptional customer experiences.
            </p>
            <Link
              to="/signup"
              className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              Get Started Today
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Ticket className="h-6 w-6 text-blue-400" />
              <span className="ml-2 text-lg font-bold text-white">SupportDesk</span>
            </div>
            <p className="text-gray-400 text-sm">
              © 2024 SupportDesk. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}