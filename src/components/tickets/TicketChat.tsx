import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { supabase, Ticket, TicketMessage, User } from '../../lib/supabase'
import { 
  Send, 
  X, 
  MessageCircle, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  User as UserIcon,
  Shield,
  Circle
} from 'lucide-react'
import { format } from 'date-fns'
import { useForm } from 'react-hook-form'

interface TicketChatProps {
  ticket: Ticket
  onClose: () => void
  onTicketUpdate?: () => void
}

interface MessageFormData {
  message: string
}

interface MessageWithUser extends TicketMessage {
  user?: User
}

export const TicketChat: React.FC<TicketChatProps> = ({ ticket, onClose, onTicketUpdate }) => {
  const { userProfile } = useAuth()
  const [messages, setMessages] = useState<MessageWithUser[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState<string[]>([])
  const [ticketData, setTicketData] = useState<Ticket>(ticket)
  const [showResolutionOptions, setShowResolutionOptions] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm<MessageFormData>()

  useEffect(() => {
    loadMessages()
    subscribeToMessages()
    subscribeToPresence()
    
    return () => {
      // Clean up subscriptions
      supabase.removeAllChannels()
    }
  }, [ticket.id])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadMessages = async () => {
    const { data, error } = await supabase
      .from('ticket_messages')
      .select(`
        *,
        user:users(*)
      `)
      .eq('ticket_id', ticket.id)
      .order('created_at', { ascending: true })

    if (!error && data) {
      setMessages(data)
    }
    setLoading(false)
  }

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`ticket_messages:${ticket.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ticket_messages',
          filter: `ticket_id=eq.${ticket.id}`
        },
        async (payload) => {
          // Load user data for the new message
          const { data: userData } = await supabase
            .from('users')
            .select('*')
            .eq('id', payload.new.user_id)
            .single()

          const newMessage = {
            ...payload.new,
            user: userData
          } as MessageWithUser

          setMessages(prev => [...prev, newMessage])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const subscribeToPresence = () => {
    const channel = supabase
      .channel(`ticket_presence:${ticket.id}`)
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const users = Object.keys(state).map(key => state[key][0].user_id)
        setOnlineUsers(users)
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', newPresences)
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', leftPresences)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && userProfile) {
          await channel.track({
            user_id: userProfile.id,
            user_name: userProfile.name,
            user_role: userProfile.role,
            online_at: new Date().toISOString()
          })
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const sendMessage = async (data: MessageFormData) => {
    if (!userProfile || !data.message.trim()) return

    setSending(true)
    try {
      const { error } = await supabase
        .from('ticket_messages')
        .insert({
          ticket_id: ticket.id,
          user_id: userProfile.id,
          message: data.message.trim()
        })

      if (!error) {
        reset()
        
        // Log activity
        await supabase.from('activity_logs').insert({
          user_id: userProfile.id,
          action: 'Sent message in ticket',
          details: { 
            ticket_id: ticket.id,
            ticket_title: ticket.title
          }
        })
      }
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setSending(false)
    }
  }

  const updateTicketStatus = async (status: string) => {
    if (!userProfile) return

    try {
      const { error } = await supabase
        .from('tickets')
        .update({ status })
        .eq('id', ticket.id)

      if (!error) {
        setTicketData(prev => ({ ...prev, status }))
        
        // Log activity
        await supabase.from('activity_logs').insert({
          user_id: userProfile.id,
          action: `Ticket status changed to ${status}`,
          details: { 
            ticket_id: ticket.id,
            ticket_title: ticket.title,
            new_status: status
          }
        })

        if (onTicketUpdate) {
          onTicketUpdate()
        }

        if (status === 'closed' && userProfile.role === 'customer') {
          setShowResolutionOptions(true)
        }
      }
    } catch (error) {
      console.error('Error updating ticket status:', error)
    }
  }

  const handleResolutionChoice = async (choice: 'resolved' | 'unresolved') => {
    if (choice === 'resolved') {
      await updateTicketStatus('resolved')
      setShowResolutionOptions(false)
    } else {
      // Create escalation request
      try {
        const { error } = await supabase
          .from('ticket_escalations')
          .insert({
            ticket_id: ticket.id,
            suggested_by_agent_id: userProfile!.id,
            status: 'pending',
            reason: 'Customer requested to reopen ticket as unresolved'
          })

        if (!error) {
          await updateTicketStatus('unresolved')
          setShowResolutionOptions(false)
          
          // Send system message
          await supabase.from('ticket_messages').insert({
            ticket_id: ticket.id,
            user_id: userProfile!.id,
            message: 'Customer has requested to reopen this ticket as unresolved. Waiting for admin approval.'
          })
        }
      } catch (error) {
        console.error('Error creating escalation:', error)
      }
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <Clock className="h-4 w-4 text-orange-500" />
      case 'closed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'resolved':
        return <CheckCircle className="h-4 w-4 text-blue-500" />
      case 'unresolved':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-orange-100 text-orange-800'
      case 'closed':
        return 'bg-green-100 text-green-800'
      case 'resolved':
        return 'bg-blue-100 text-blue-800'
      case 'unresolved':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const isCustomer = userProfile?.role === 'customer'
  const isAdmin = userProfile?.role && ['super_admin', 'supervisory_admin', 'agent'].includes(userProfile.role)
  const canCloseTicket = isAdmin && ticketData.status === 'open'
  const canReopenTicket = isAdmin && ['closed', 'resolved', 'unresolved'].includes(ticketData.status)

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-4 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white min-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-start mb-4 pb-4 border-b">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <MessageCircle className="h-6 w-6 text-blue-600" />
              <h3 className="text-lg font-medium text-gray-900">{ticketData.title}</h3>
              <div className="flex items-center space-x-1">
                {getStatusIcon(ticketData.status)}
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(ticketData.status)}`}>
                  {ticketData.status}
                </span>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-2">{ticketData.description}</p>
            
            {/* Online Users */}
            {onlineUsers.length > 0 && (
              <div className="flex items-center space-x-2 text-xs text-gray-500">
                <Circle className="h-3 w-3 text-green-500 fill-current" />
                <span>{onlineUsers.length} user{onlineUsers.length > 1 ? 's' : ''} online</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Status Controls */}
            {canCloseTicket && (
              <button
                onClick={() => updateTicketStatus('closed')}
                className="px-3 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-md hover:bg-green-200 transition-colors"
              >
                Close Ticket
              </button>
            )}
            {canReopenTicket && (
              <button
                onClick={() => updateTicketStatus('open')}
                className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 transition-colors"
              >
                Reopen Ticket
              </button>
            )}
            
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto mb-4 space-y-4 max-h-96">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.user_id === userProfile?.id ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.user_id === userProfile?.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  <div className="flex items-center space-x-2 mb-1">
                    {message.user?.role === 'customer' ? (
                      <UserIcon className="h-3 w-3" />
                    ) : (
                      <Shield className="h-3 w-3" />
                    )}
                    <span className="text-xs font-medium">
                      {message.user?.name || 'Unknown User'}
                    </span>
                    <span className="text-xs opacity-75">
                      {format(new Date(message.created_at), 'HH:mm')}
                    </span>
                  </div>
                  <p className="text-sm">{message.message}</p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Resolution Options Modal */}
        {showResolutionOptions && (
          <div className="absolute inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Ticket Resolution</h4>
              <p className="text-sm text-gray-600 mb-6">
                The admin has closed this ticket. Please choose how you'd like to proceed:
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => handleResolutionChoice('resolved')}
                  className="w-full px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors"
                >
                  Mark as Resolved
                </button>
                <button
                  onClick={() => handleResolutionChoice('unresolved')}
                  className="w-full px-4 py-2 text-sm font-medium text-red-600 bg-red-100 rounded-md hover:bg-red-200 transition-colors"
                >
                  Mark as Unresolved & Request Reopen
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Message Input */}
        {ticketData.status === 'open' && (
          <form onSubmit={handleSubmit(sendMessage)} className="flex space-x-2">
            <div className="flex-1">
              <input
                {...register('message', { required: 'Message is required' })}
                type="text"
                placeholder="Type your message..."
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                disabled={sending}
              />
              {errors.message && (
                <p className="mt-1 text-sm text-red-600">{errors.message.message}</p>
              )}
            </div>
            <button
              type="submit"
              disabled={sending}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        )}

        {ticketData.status !== 'open' && (
          <div className="text-center py-4 bg-gray-50 rounded-md">
            <p className="text-sm text-gray-600">
              This ticket is {ticketData.status}. 
              {isAdmin && ' You can reopen it to continue the conversation.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}