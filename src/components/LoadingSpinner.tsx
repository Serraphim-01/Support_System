import React from 'react'
import { Loader2 } from 'lucide-react'

export const LoadingSpinner: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  )
}