import apiClient from '../lib/api'

export interface LevelSystemInfo {
  level: number
  exp: number
  expNeeded: number
  expProgress: number
  points: number
  canCheckIn: boolean
  totalCheckIns: number
  lastCheckInDate?: string
}

export interface CheckInResult {
  expGained: number
  totalCheckIns: number
  newLevel: number
  newExp: number
  levelUp: boolean
}

export const levelSystemService = {
  getInfo: async (): Promise<{ success: boolean; data: LevelSystemInfo }> => {
    const response = await apiClient.get('/level-system/me')
    return response.data
  },

  checkIn: async (): Promise<{ success: boolean; message: string; data: CheckInResult }> => {
    const response = await apiClient.post('/level-system/check-in')
    return response.data
  },

  grantDailyExp: async (): Promise<{ success: boolean; message: string; data: any }> => {
    const response = await apiClient.post('/level-system/grant-daily-exp')
    return response.data
  }
}
