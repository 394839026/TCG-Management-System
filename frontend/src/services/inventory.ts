import apiClient from '../lib/api'
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

export interface RuneCardInfo {
  version: 'OGN' | 'SFD' | 'UNL' | 'P'
  cardNumber: string
}

export interface InventoryItem {
  _id?: string
  id: number | string
  itemName: string
  name?: string
  gameType?: string | string[]
  itemType: string
  rarity?: string
  quantity: number
  value: number
  condition?: string
  description?: string
  userId: string | number
  createdAt: string
  updatedAt: string
  runeCardInfo?: RuneCardInfo
  cardProperty?: string
  userQuantity?: number
  userValue?: number
  userIsFavorite?: boolean
  userNotes?: string
  userInventoryId?: string
  images?: string[]
  acquisitionSource?: string
  acquisitionPrice?: number
  acquisitionDate?: string
}

export interface InventoryStats {
  totalItems: number
  totalQuantity: number
  totalValue: number
  itemTypes: number
  runeCount: number
}

export const inventoryService = {
  getAll: async (params?: { 
    page?: number; 
    limit?: number; 
    search?: string; 
    sort?: string; 
    order?: 'asc' | 'desc';
    rarity?: string;
    gameType?: string;
    priceMin?: string;
    priceMax?: string;
    showZeroQuantity?: boolean | string;
    version?: string;
    itemType?: string;
    cardProperty?: string;
  }) => {
    const response = await apiClient.get('/user-inventory', { params })
    return response.data
  },

  getAllTemplates: async (params?: { 
    page?: number; 
    limit?: number; 
    search?: string; 
    sort?: string; 
    order?: 'asc' | 'desc';
    rarity?: string;
    gameType?: string;
    version?: string;
    itemType?: string;
    cardProperty?: string;
  }) => {
    const response = await apiClient.get('/inventory', { 
      params: { ...params, allTemplates: 'true' } 
    })
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

  createTemplate: async (data: Partial<InventoryItem>) => {
    const response = await apiClient.post('/inventory', { ...data, isGlobalTemplate: true })
    return response.data
  },

  update: async (id: string, data: Partial<InventoryItem>) => {
    const response = await apiClient.put(`/inventory/${id}`, data)
    return response.data
  },

  updateUserInventory: async (itemId: string, data: { 
    quantity?: number; 
    value?: number; 
    isFavorite?: boolean; 
    notes?: string;
    acquisitionSource?: string;
    acquisitionPrice?: number;
    acquisitionDate?: string;
  }) => {
    const response = await apiClient.put(`/user-inventory/${itemId}`, data)
    return response.data
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/inventory/${id}`)
    return response.data
  },

  clearAll: async () => {
    const response = await apiClient.delete('/user-inventory/clear-all')
    return response.data
  },
  
  clearAllTemplates: async () => {
    const response = await apiClient.delete('/inventory/clear-all', {
      params: { allTemplates: 'true' }
    })
    return response.data
  },

  getStats: async (): Promise<{ success: boolean; data: InventoryStats }> => {
    const response = await apiClient.get('/user-inventory/stats')
    return response.data
  },

  importExcel: async (file: File, isGlobalTemplate: boolean = false) => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await apiClient.post('/inventory/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      params: isGlobalTemplate ? { isGlobalTemplate: 'true' } : {}
    })
    return response.data
  },

  downloadTemplate: async () => {
    const response = await axios.get(`${API_BASE_URL}/inventory/template`, {
      responseType: 'blob',
    })
    return response.data
  },

  exportExcel: async (allTemplates: boolean = false) => {
    const response = await axios.get(`${API_BASE_URL}/inventory/export`, {
      responseType: 'blob',
      params: allTemplates ? { allTemplates: 'true' } : {}
    })
    return response.data
  },

  uploadImage: async (itemId: string, file: File) => {
    const formData = new FormData()
    formData.append('image', file)
    const response = await apiClient.post(`/inventory/${itemId}/image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  addImageByUrl: async (itemId: string, url: string) => {
    const response = await apiClient.post(`/inventory/${itemId}/image-url`, { url })
    return response.data
  },

  deleteImage: async (itemId: string) => {
    const response = await apiClient.delete(`/inventory/${itemId}/image`)
    return response.data
  },
}