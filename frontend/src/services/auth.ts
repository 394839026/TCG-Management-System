import apiClient from '../lib/api'

export interface LoginData {
  email: string
  password: string
}

export interface RegisterData {
  username: string
  email: string
  password: string
}

export interface User {
  _id: string
  username: string
  email: string
  role: string
  avatar?: string
  bio?: string
}

export interface AuthResponse {
  success: boolean
  message: string
  token: string
  user: User
}

export const authService = {
  login: async (data: LoginData): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/login', data)
    // Backend returns { success: true, data: { _id, username, email, token } }
    const backendData = response.data.data
    return {
      success: response.data.success,
      message: response.data.message || '登录成功',
      token: backendData.token,
      user: {
        _id: backendData._id,
        username: backendData.username,
        email: backendData.email,
        role: backendData.role || 'user',
      }
    }
  },

  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/register', data)
    // Backend returns { success: true, data: { _id, username, email, token } }
    const backendData = response.data.data
    return {
      success: response.data.success,
      message: response.data.message || '注册成功',
      token: backendData.token,
      user: {
        _id: backendData._id,
        username: backendData.username,
        email: backendData.email,
        role: backendData.role || 'user',
      }
    }
  },

  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  },

  getCurrentUser: (): User | null => {
    const userStr = localStorage.getItem('user')
    if (!userStr || userStr === 'undefined' || userStr === 'null') {
      return null
    }
    try {
      return JSON.parse(userStr)
    } catch (error) {
      console.error('Failed to parse user from localStorage:', error)
      localStorage.removeItem('user')
      return null
    }
  },

  getToken: (): string | null => {
    const token = localStorage.getItem('token')
    if (!token || token === 'undefined' || token === 'null') {
      return null
    }
    return token
  },

  setAuth: (token: string, user: User) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
  },

  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('token')
  },
}
