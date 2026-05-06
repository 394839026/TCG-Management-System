// 认证上下文 - 管理用户认证状态和提供认证相关功能

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { authService, User } from '../services/auth'

// 认证上下文类型定义
interface AuthContextType {
  user: User | null // 当前用户信息
  token: string | null // 认证token
  login: (email: string, password: string) => Promise<void> // 登录函数
  register: (username: string, email: string, password: string) => Promise<void> // 注册函数
  logout: () => void // 登出函数
  isAuthenticated: boolean // 是否已认证
  isLoading: boolean // 是否正在加载认证状态
  setUser: (user: User | null) => void // 更新用户信息
}

// 创建认证上下文
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// 认证提供者组件 - 包裹应用并提供认证状态
export function AuthProvider({ children }: { children: ReactNode }) {
  // 用户状态
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // 初始化认证状态 - 从localStorage恢复用户信息
  useEffect(() => {
    const initAuth = async () => {
      try {
        // 尝试从localStorage获取存储的用户和token
        const storedUser = authService.getCurrentUser()
        const storedToken = authService.getToken()
        
        // 如果存在已存储的认证信息，则恢复认证状态
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
        // 清除无效的认证信息
        localStorage.removeItem('user')
        localStorage.removeItem('token')
      }
      // 完成认证初始化
      setIsLoading(false)
    }
    
    initAuth()
  }, [])

  // 登录函数
  const login = async (email: string, password: string) => {
    try {
      console.log('AuthContext: Calling authService.login...')
      const response = await authService.login({ email, password })
      console.log('AuthContext: Login response:', response)
      
      if (response.success) {
        console.log('AuthContext: Setting auth data...', response.user)
        // 首先存储到localStorage
        authService.setAuth(response.token, response.user)
        // 同步更新React状态
        setUser(response.user)
        setToken(response.token)
        // 使用setTimeout确保状态更新完成
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

  // 注册函数
  const register = async (username: string, email: string, password: string) => {
    try {
      console.log('AuthContext: Calling authService.register...')
      const response = await authService.register({ username, email, password })
      console.log('AuthContext: Register response:', response)
      
      if (response.success) {
        console.log('AuthContext: Setting auth data...', response.user)
        // 首先存储到localStorage
        authService.setAuth(response.token, response.user)
        // 更新React状态
        setUser(response.user)
        setToken(response.token)
        console.log('AuthContext: Auth state updated successfully')
        
        // 返回Promise，确保状态更新完成后再执行后续操作
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

  // 登出函数
  const logout = () => {
    authService.logout()
    setUser(null)
    setToken(null)
  }

  // 更新用户信息函数
  const updateUser = (newUser: User | null) => {
    setUser(newUser)
    if (newUser && token) {
      authService.setAuth(token, newUser)
    }
  }

  // 提供认证上下文给子组件
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

// 认证钩子 - 用于在组件中访问认证上下文
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
