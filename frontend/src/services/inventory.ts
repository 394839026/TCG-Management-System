import apiClient from '../lib/api'

export interface InventoryItem {
  _id?: string
  id: number | string
  itemName: string
  name?: string
  itemType: string
  rarity?: string
  quantity: number
  value: number
  condition?: string
  description?: string
  userId: string | number
  createdAt: string
  updatedAt: string
}

export interface InventoryStats {
  totalItems: number
  totalQuantity: number
  totalValue: number
  itemTypes: number
}

export const inventoryService = {
  getAll: async (params?: { page?: number; limit?: number; search?: string }) => {
    const response = await apiClient.get('/inventory', { params })
    return response.data
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/inventory/${id}`)
    return response.data
  },

  create: async (data: Partial<InventoryItem>) => {
    const response = await apiClient.post('/inventory', data)
    return response.data
  },

  update: async (id: string, data: Partial<InventoryItem>) => {
    const response = await apiClient.put(`/inventory/${id}`, data)
    return response.data
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/inventory/${id}`)
    return response.data
  },

  getStats: async (): Promise<{ success: boolean; data: InventoryStats }> => {
    const response = await apiClient.get('/inventory/stats')
    return response.data
  },

  importExcel: async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await apiClient.post('/inventory/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },
}
