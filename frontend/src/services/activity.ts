import apiClient from '../lib/api'

export interface Activity {
  _id: string
  action: string
  item: string
  type: 'inventory' | 'team' | 'trade' | 'deck' | 'shop' | 'friend'
  time: string
  createdAt: string
}

export const activityService = {
  getRecent: async (): Promise<{ success: boolean; data: Activity[] }> => {
    const response = await apiClient.get('/activity/recent')
    return response.data
  },

  create: async (data: { action: string; item?: string; type: Activity['type']; metadata?: object }) => {
    const response = await apiClient.post('/activity', data)
    return response.data
  },
}
