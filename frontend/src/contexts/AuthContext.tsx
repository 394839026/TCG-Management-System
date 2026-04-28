import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { authService, User } from '../services/auth'

interface AuthContextType {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  register: (username: string, email: string, password: string) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check for existing auth on mount
    try {
      const storedUser = authService.getCurrentUser()
      const storedToken = authService.getToken()
      
      if (storedUser && storedToken) {
        setUser(storedUser)
        setToken(storedToken)
      }
    } catch (error) {
      console.error('Failed to restore auth from localStorage:', error)
      // Clear invalid data
      localStorage.removeItem('user')
      localStorage.removeItem('token')
    }
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    try {
      console.log('AuthContext: Calling authService.login...')
      const response = await authService.login({ email, password })
      console.log('AuthContext: Login response:', response)
      
      if (response.success) {
        console.log('AuthContext: Setting auth data...', response.user)
        // Store in localStorage first
        authService.setAuth(response.token, response.user)
        // Update React state
        setUser(response.user)
        setToken(response.token)
        console.log('AuthContext: Auth state updated successfully')
        
        // Return a promise that resolves after state updates
        return new Promise<void>((resolve) => {
          setTimeout(() => {
            console.log('AuthContext: Login promise resolved')
            resolve()
          }, 0)
        })
      } else {
        throw new Error(response.message || '登录失败')
      }
    } catch (error) {
      console.error('AuthContext: Login error:', error)
      throw error
    }
  }

  const register = async (username: string, email: string, password: string) => {
    try {
      console.log('AuthContext: Calling authService.register...')
      const response = await authService.register({ username, email, password })
      console.log('AuthContext: Register response:', response)
      
      if (response.success) {
        console.log('AuthContext: Setting auth data...', response.user)
        // Store in localStorage first
        authService.setAuth(response.token, response.user)
        // Update React state
        setUser(response.user)
        setToken(response.token)
        console.log('AuthContext: Auth state updated successfully')
        
        // Return a promise that resolves after state updates
        return new Promise<void>((resolve) => {
          setTimeout(() => {
            console.log('AuthContext: Register promise resolved')
            resolve()
          }, 0)
        })
      } else {
        throw new Error(response.message || '注册失败')
      }
    } catch (error) {
      console.error('AuthContext: Register error:', error)
      throw error
    }
  }

  const logout = () => {
    authService.logout()
    setUser(null)
    setToken(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        register,
        logout,
        isAuthenticated: !!user && !!token,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
