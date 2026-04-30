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
  setUser: (user: User | null) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedUser = authService.getCurrentUser()
        const storedToken = authService.getToken()
        
        if (storedUser && storedToken) {
          setUser(storedUser)
          setToken(storedToken)
          
          // 从后端刷新用户信息，获取完整的等级数据
          try {
            const profileResponse = await authService.getProfile()
            if (profileResponse.success) {
              const updatedUser = profileResponse.data
              authService.setAuth(storedToken, updatedUser)
              setUser(updatedUser)
            }
          } catch (error) {
            console.error('Failed to refresh user profile:', error)
          }
        }
      } catch (error) {
        console.error('Failed to restore auth from localStorage:', error)
        localStorage.removeItem('user')
        localStorage.removeItem('token')
      }
      setIsLoading(false)
    }
    
    initAuth()
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
        // Update React state synchronously
        setUser(response.user)
        setToken(response.token)
        // Wait for state to be committed using setTimeout with 0 delay
        return new Promise<void>((resolve) => {
          setTimeout(() => {
            console.log('AuthContext: Auth state updated successfully')
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

  const updateUser = (newUser: User | null) => {
    setUser(newUser)
    if (newUser && token) {
      authService.setAuth(token, newUser)
    }
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
        setUser: updateUser,
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
