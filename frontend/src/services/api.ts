import apiClient from '../lib/api'

export interface Team {
  _id: string
  name: string
  description?: string
  logo?: string
  owner: string
  members: Array<{ user: string; role: string }>
  settings?: { isPublic: boolean }
  createdAt: string
}

export const teamService = {
  getAll: async (params?: { page?: number; limit?: number; search?: string }) => {
    const response = await apiClient.get('/teams', { params })
    return response.data
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/teams/${id}`)
    return response.data
  },

  create: async (data: Partial<Team>) => {
    const response = await apiClient.post('/teams', data)
    return response.data
  },

  update: async (id: string, data: Partial<Team>) => {
    const response = await apiClient.put(`/teams/${id}`, data)
    return response.data
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/teams/${id}`)
    return response.data
  },
}

export interface Shop {
  _id: string
  name: string
  description?: string
  location?: string
  owner: string
  employees: Array<{ user: string; role: string }>
  settings?: { isPublic: boolean }
  financialStats?: { totalRevenue: number; totalExpenses: number }
  createdAt: string
}

export const shopService = {
  getAll: async (params?: { page?: number; limit?: number }) => {
    const response = await apiClient.get('/shops', { params })
    return response.data
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/shops/${id}`)
    return response.data
  },

  create: async (data: Partial<Shop>) => {
    const response = await apiClient.post('/shops', data)
    return response.data
  },

  update: async (id: string, data: Partial<Shop>) => {
    const response = await apiClient.put(`/shops/${id}`, data)
    return response.data
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/shops/${id}`)
    return response.data
  },

  getDashboard: async (id: string) => {
    const response = await apiClient.get(`/shops/${id}/dashboard`)
    return response.data
  },
}

export interface Deck {
  _id: string
  name: string
  game: string
  format?: string
  description?: string
  tags?: string[]
  owner: string
  cards: Array<{ card: string; quantity: number }>
  isPublic: boolean
  likes: string[]
  stats?: { winRate: number; matches: number }
  createdAt: string
  updatedAt: string
}

export const deckService = {
  getAll: async (params?: { page?: number; limit?: number; game?: string }) => {
    const response = await apiClient.get('/decks', { params })
    return response.data
  },

  getPublic: async (params?: { page?: number; limit?: number; game?: string; format?: string }) => {
    const response = await apiClient.get('/decks/public', { params })
    return response.data
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/decks/${id}`)
    return response.data
  },

  create: async (data: Partial<Deck>) => {
    const response = await apiClient.post('/decks', data)
    return response.data
  },

  update: async (id: string, data: Partial<Deck>) => {
    const response = await apiClient.put(`/decks/${id}`, data)
    return response.data
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/decks/${id}`)
    return response.data
  },

  like: async (id: string) => {
    const response = await apiClient.post(`/decks/${id}/like`)
    return response.data
  },

  unlike: async (id: string) => {
    const response = await apiClient.delete(`/decks/${id}/like`)
    return response.data
  },
}

export interface TradeListing {
  _id: string
  seller: string
  type: 'sell' | 'buy' | 'trade'
  items: Array<{ item: string; quantity: number }>
  requestedItems?: Array<{ item: string; quantity: number }>
  price: number
  status: 'active' | 'completed' | 'cancelled'
  views: number
  interestedUsers: string[]
  expiresAt?: string
  createdAt: string
}

export const tradeService = {
  getListings: async (params?: { page?: number; limit?: number; type?: string }) => {
    const response = await apiClient.get('/trade/listings', { params })
    return response.data
  },

  getListing: async (id: string) => {
    const response = await apiClient.get(`/trade/listings/${id}`)
    return response.data
  },

  create: async (data: Partial<TradeListing>) => {
    const response = await apiClient.post('/trade/listings', data)
    return response.data
  },

  update: async (id: string, data: Partial<TradeListing>) => {
    const response = await apiClient.put(`/trade/listings/${id}`, data)
    return response.data
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/trade/listings/${id}`)
    return response.data
  },

  respond: async (id: string) => {
    const response = await apiClient.post(`/trade/listings/${id}/respond`)
    return response.data
  },
}

export interface TradeMessage {
  _id: string
  conversationId: string
  sender: { _id: string; username: string; avatar?: string }
  content: string
  createdAt: string
  read: boolean
}

export interface Conversation {
  _id: string
  participants: Array<{ _id: string; username: string; avatar?: string }>
  listingId?: string
  lastMessage?: TradeMessage
  unreadCount: number
  createdAt: string
  updatedAt: string
}

export const messageService = {
  getConversations: async () => {
    const response = await apiClient.get('/trade/messages/conversations')
    return response.data
  },

  getMessages: async (conversationId: string) => {
    const response = await apiClient.get(`/trade/messages/${conversationId}`)
    return response.data
  },

  sendMessage: async (conversationId: string, content: string) => {
    const response = await apiClient.post(`/trade/messages/${conversationId}`, { content })
    return response.data
  },

  createConversation: async (listingId: string) => {
    const response = await apiClient.post('/trade/messages/conversations', { listingId })
    return response.data
  },

  markAsRead: async (conversationId: string) => {
    const response = await apiClient.put(`/trade/messages/${conversationId}/read`)
    return response.data
  },
}

export interface Friend {
  _id: string
  userId: string
  friendId: string
  friend: { _id: string; username: string; avatar?: string }
  status: 'pending' | 'accepted'
  createdAt: string
}

export interface FriendRequest {
  _id: string
  from: { _id: string; username: string; avatar?: string }
  to: string
  status: 'pending' | 'accepted' | 'rejected'
  createdAt: string
}

export const friendService = {
  getFriends: async () => {
    const response = await apiClient.get('/friends')
    return response.data
  },

  getRequests: async () => {
    const response = await apiClient.get('/friends/requests')
    return response.data
  },

  sendRequest: async (userId: string) => {
    const response = await apiClient.post('/friends/requests', { userId })
    return response.data
  },

  acceptRequest: async (requestId: string) => {
    const response = await apiClient.put(`/friends/requests/${requestId}/accept`)
    return response.data
  },

  rejectRequest: async (requestId: string) => {
    const response = await apiClient.put(`/friends/requests/${requestId}/reject`)
    return response.data
  },

  removeFriend: async (friendId: string) => {
    const response = await apiClient.delete(`/friends/${friendId}`)
    return response.data
  },

  searchUsers: async (query: string) => {
    const response = await apiClient.get('/friends/search', { params: { query } })
    return response.data
  },
}

export interface AnalyticsData {
  overall: { totalItems: number; totalQuantity: number; totalValue: number; avgValue: number }
  byRarity: Array<{ _id: string; count: number; totalValue: number }>
  byType: Array<{ _id: string; count: number; totalValue: number }>
}

export const analyticsService = {
  getInventory: async (): Promise<{ success: boolean; data: AnalyticsData }> => {
    const response = await apiClient.get('/analytics/inventory')
    return response.data
  },

  getValueTrend: async (period?: string) => {
    const response = await apiClient.get('/analytics/value-trend', { params: { period } })
    return response.data
  },

  getSpending: async () => {
    const response = await apiClient.get('/analytics/spending')
    return response.data
  },

  getTrades: async () => {
    const response = await apiClient.get('/analytics/trades')
    return response.data
  },
}
