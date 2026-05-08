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

export interface ChangePasswordData {
  currentPassword: string
  newPassword: string
}

export interface User {
  _id: string
  uid: string
  username: string
  email: string
  role: string
  avatar?: string
  bio?: string
  level?: number
  exp?: number
  points?: number
  expNeeded?: number
  expProgress?: number
  canCheckIn?: boolean
  totalCheckIns?: number
  lastCheckInDate?: string
}

export interface AuthResponse {
  success: boolean
  message: string
  token: string
  user: User
}

export const authService = {
  getProfile: async (): Promise<{ success: boolean; data: User }> => {
    const response = await apiClient.get('/auth/me')
    return response.data
  },

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
        uid: backendData.uid || '',
        username: backendData.username,
        email: backendData.email,
        role: backendData.role || 'user',
        level: backendData.level || 1,
        exp: backendData.exp || 0,
        points: backendData.points || 0,
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
        uid: backendData.uid || '',
        username: backendData.username,
        email: backendData.email,
        role: backendData.role || 'user',
        level: backendData.level || 1,
        exp: backendData.exp || 0,
        points: backendData.points || 0,
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

  getUsers: async (): Promise<{ success: boolean; count: number; data: User[] }> => {
    const response = await apiClient.get('/auth/users')
    return response.data
  },

  updateUserRole: async (userId: string, role: string): Promise<{ success: boolean; message: string; data: User }> => {
    const response = await apiClient.put(`/auth/users/${userId}/role`, { role })
    return response.data
  },

  deleteUser: async (userId: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete(`/auth/users/${userId}`)
    return response.data
  },

  registerUserByAdmin: async (data: RegisterData & { role?: string }): Promise<{ success: boolean; message: string; data: User }> => {
    const response = await apiClient.post('/auth/admin/register', data)
    return response.data
  },

  changePassword: async (data: ChangePasswordData): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.put('/auth/change-password', data)
    return response.data
  },
}
