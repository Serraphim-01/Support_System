import { useState, useEffect, createContext, useContext } from 'react'
import { User as SupabaseUser } from '@supabase/supabase-js'
import { supabase, User } from '../lib/supabase'

interface AuthContextType {
  user: SupabaseUser | null
  userProfile: User | null
  loading: boolean
  signIn: (email: string, password: string, key?: string) => Promise<{ error: any }>
  signUp: (email: string, password: string, name: string, organisationId?: string, key?: string, role?: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<User>) => Promise<{ error: any }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}

export const useAuthProvider = () => {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [userProfile, setUserProfile] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      // localStorage.clear()
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.user) {
        setUser(session.user)
        await loadUserProfile(session.user.id)
      } else {
        // Fallback to getUser
        const { data: userData, error } = await supabase.auth.getUser()
        if (userData?.user) {
          setUser(userData.user)
          await loadUserProfile(userData.user.id)
        } else {
          console.warn('No active session')
          setUser(null)
          setUserProfile(null)
        }
      }

      setLoading(false)
    }

    init()

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user)
        setTimeout(() => loadUserProfile(session.user.id), 100)
      } else {
        setUser(null)
        setUserProfile(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])


  const loadUserProfile = async (userId: string) => {
    console.log("Loading profile for user:", userId)
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Supabase error loading profile:', error)
        console.log('Did you configure RLS? Is JWT applied?')
        setUserProfile(null)
      } else {
        setUserProfile(data)
        console.log('User profile loaded:', data)
      }
    } catch (err) {
      console.error('Unexpected error loading user profile:', err)
      setUserProfile(null)
    } finally {
      console.log("Loading complete")
      setLoading(false)
    }
  }


  const signUp = async (
    email: string,
    password: string,
    name: string,
    organisationId?: string,
    key?: string,
    role: string = 'customer'
  ) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
          data: {
            name,
            organisationId, // valid UUID string
            role,
            key: role !== 'customer' ? key : null,
          }
        }
      })

      if (error) return { error }

      // 🔁 No manual insert into `users`. Your trigger handles it.
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  const signIn = async (email: string, password: string, key?: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) return { error }

      const user = data.user
      if (!user) return { error: { message: 'No user returned from signIn' } }

      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError || !profile) {
        await supabase.auth.signOut()
        return { error: { message: 'Invalid credentials' } }
      }

      // if (!profile.is_verified) {
      //   await supabase.auth.signOut()
      //   return { error: { message: 'Please verify your email before signing in.' } }
      // }

      if (profile.role !== 'customer') {
        if (!key || profile.key !== key) {
          await supabase.auth.signOut()
          return { error: { message: 'Invalid or missing access key' } }
        }
      }

      // Log login activity
      await supabase.from('activity_logs').insert({
        user_id: profile.id,
        action: 'User logged in',
        details: { role: profile.role, email: profile.email }
      })

      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  const signOut = async () => {
    if (userProfile) {
      await supabase.from('activity_logs').insert({
        user_id: userProfile.id,
        action: 'User logged out',
        details: { role: userProfile.role }
      })
    }
    await supabase.auth.signOut()
  }

  const updateProfile = async (updates: Partial<User>) => {
    if (!user) return { error: { message: 'Not authenticated' } }

    try {
      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id)

      if (error) return { error }

      setUserProfile(prev => prev ? { ...prev, ...updates } : null)
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  return {
    user,
    userProfile,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
  }
}

export { AuthContext }
