import apiClient from '../lib/api'

export interface DonationRecord {
  _id?: string
  type: 'points' | 'item'
  donor: { _id: string; username: string; avatar?: string } | string
  amount?: number
  item?: string | { _id: string; name: string }
  itemName?: string
  quantity?: number
  message?: string
  donatedAt: string
}

export interface InvestmentRecord {
  _id?: string
  description: string
  amount: number
  type: 'income' | 'expense'
  date: string
  recordedBy?: string | { _id: string; username: string }
}

export interface Team {
  _id?: string
  id: number | string
  name: string
  description?: string
  logo?: string
  owner: string | number
  members: Array<{ user: string | number; role: string; username?: string }>
  settings?: { isPublic: boolean; allowJoinRequests?: boolean }
  totalPoints?: number
  currentPoints?: number
  fundPool?: number
  donationRecords?: DonationRecord[]
  investmentRecords?: InvestmentRecord[]
  createdAt: string
  updatedAt?: string
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

  joinTeam: async (teamId: string, message?: string) => {
    const response = await apiClient.post(`/teams/${teamId}/members`, { message })
    return response.data
  },

  getJoinRequests: async (teamId: string) => {
    const response = await apiClient.get(`/teams/${teamId}/members/requests`)
    return response.data
  },

  handleJoinRequest: async (teamId: string, requestId: string, action: 'approve' | 'reject') => {
    const response = await apiClient.put(`/teams/${teamId}/members/requests/${requestId}`, { action })
    return response.data
  },

  sendInvite: async (teamId: string, identifier: string, message?: string) => {
    const response = await apiClient.post(`/teams/${teamId}/invite`, { identifier, message })
    return response.data
  },

  getTeamInvites: async (teamId: string) => {
    const response = await apiClient.get(`/teams/${teamId}/invites`)
    return response.data
  },

  getMyInvites: async () => {
    const response = await apiClient.get('/teams/my-invites')
    return response.data
  },

  acceptInvite: async (inviteId: string) => {
    const response = await apiClient.put(`/teams/invites/${inviteId}/accept`)
    return response.data
  },

  rejectInvite: async (inviteId: string) => {
    const response = await apiClient.put(`/teams/invites/${inviteId}/reject`)
    return response.data
  },

  transferLeader: async (teamId: string, newLeaderId: string) => {
    const response = await apiClient.put(`/teams/${teamId}/transfer-leader`, { newLeaderId })
    return response.data
  },

  removeMember: async (teamId: string, memberId: string) => {
    const response = await apiClient.delete(`/teams/${teamId}/members/${memberId}`)
    return response.data
  },

  leaveTeam: async (teamId: string) => {
    const response = await apiClient.delete(`/teams/${teamId}/members/me`)
    return response.data
  },

  donatePoints: async (teamId: string, amount: number, message?: string) => {
    const response = await apiClient.post(`/teams/${teamId}/donate`, { amount, message })
    return response.data
  },

  getDonations: async (teamId: string) => {
    const response = await apiClient.get(`/teams/${teamId}/donations`)
    return response.data
  },

  getInvestments: async (teamId: string) => {
    const response = await apiClient.get(`/teams/${teamId}/investments`)
    return response.data
  },

  addInvestment: async (teamId: string, data: {
    description: string
    amount: number
    type: 'income' | 'expense'
    date?: string
  }) => {
    const response = await apiClient.post(`/teams/${teamId}/investments`, data)
    return response.data
  },
}

export interface TeamInventoryItem {
  _id: string
  itemName: string
  itemCode?: string
  itemType: string
  rarity: string
  quantity: number
  value: number
  condition?: string
  description?: string
  gameType?: string
  sharedAt?: string
  isAvailable?: boolean
  borrowedBy?: string
  borrowedAt?: string
  returnDate?: string
  addedBy?: string
}

export interface TeamInventoryStats {
  totalItems: number
  availableItems: number
  borrowedItems: number
}

export interface DonationRequest {
  _id: string
  item: any
  itemId: string
  addedBy: string
  quantity: number
  requestDate: string
  status: 'pending' | 'approved' | 'rejected'
  handledBy?: string
  handledDate?: string
}

export const teamInventoryService = {
  getTeamInventory: async (teamId: string, params?: { search?: string; rarity?: string; itemType?: string }) => {
    const response = await apiClient.get(`/team-inventory/${teamId}/inventory`, { params })
    return response.data
  },

  // 获取捐赠申请
  getDonationRequests: async (teamId: string, status?: string) => {
    const response = await apiClient.get(`/team-inventory/${teamId}/donation-requests`, { params: { status } })
    return response.data
  },

  // 处理捐赠申请
  handleDonationRequest: async (teamId: string, requestId: string, action: 'approve' | 'reject') => {
    const response = await apiClient.post(`/team-inventory/${teamId}/donation-requests/${requestId}/handle`, { action })
    return response.data
  },

  // 撤回捐赠申请
  withdrawDonationRequest: async (teamId: string, requestId: string) => {
    const response = await apiClient.delete(`/team-inventory/${teamId}/donation-requests/${requestId}`)
    return response.data
  },

  addToTeamInventory: async (teamId: string, inventoryItemId: string, quantity?: number) => {
    const response = await apiClient.post(`/team-inventory/${teamId}/inventory`, { inventoryItemId, quantity })
    return response.data
  },

  removeFromTeamInventory: async (teamId: string, itemId: string) => {
    const response = await apiClient.delete(`/team-inventory/${teamId}/inventory/${itemId}`)
    return response.data
  },

  borrowItem: async (teamId: string, itemId: string, returnDate?: string) => {
    const response = await apiClient.put(`/team-inventory/${teamId}/inventory/${itemId}/borrow`, { returnDate })
    return response.data
  },

  returnInventoryItem: async (teamId: string, itemId: string) => {
    const response = await apiClient.put(`/team-inventory/${teamId}/inventory/${itemId}/return`)
    return response.data
  },

  getMyBorrows: async (teamId: string) => {
    const response = await apiClient.get(`/team-inventory/${teamId}/inventory/my-borrows`)
    return response.data
  },
  createBorrowRequest: async (teamId: string, data: {
    inventoryItemId: string,
    quantity?: number,
    note?: string,
    returnDate?: string
  }) => {
    const response = await apiClient.post(`/team-inventory/${teamId}/borrow-requests`, data)
    return response.data
  },
  getBorrowRequests: async (teamId: string, status?: string) => {
    const params = status ? { status } : undefined
    const response = await apiClient.get(`/team-inventory/${teamId}/borrow-requests`, { params })
    return response.data
  },
  handleBorrowRequest: async (teamId: string, requestId: string, action: 'approve' | 'reject') => {
    const response = await apiClient.post(`/team-inventory/${teamId}/borrow-requests/${requestId}/handle`, { action })
    return response.data
  },
  getBorrowRecords: async (teamId: string, status?: string) => {
    const params = status ? { status } : undefined
    const response = await apiClient.get(`/team-inventory/${teamId}/borrow-records`, { params })
    return response.data
  },
  returnItem: async (teamId: string, recordId: string) => {
    const response = await apiClient.post(`/team-inventory/${teamId}/borrow-records/${recordId}/return`)
    return response.data
  },
}

export interface Shop {
  _id: string
  name: string
  description?: string
  location?: {
    address: string
    city: string
    province: string
    postalCode: string
  }
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
  _id: string;
  name: string;
  game: string;
  format?: string;
  description?: string;
  tags?: string[];
  owner: string;
  // 新格式
  legend?: Array<{ card: string; quantity: number; slot?: string }>;
  mainDeck?: Array<{ card: string; quantity: number; slot?: string }>;
  sideDeck?: Array<{ card: string; quantity: number; slot?: string }>;
  battlefield?: Array<{ card: string; quantity: number; slot?: string }>;
  runes?: Array<{ card: string; quantity: number; slot?: string }>;
  tokens?: Array<{ card: string; quantity: number; slot?: string }>;
  // 旧格式兼容
  cards?: Array<{ card: string; quantity: number; sideboard?: boolean }>;
  isPublic: boolean;
  likes: string[];
  stats?: { winRate: number; matches: number };
  createdAt: string;
  updatedAt: string;
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
  orderNumber: string
  seller: string | { _id: string; username: string; avatar?: string }
  type: 'sell' | 'buy' | 'trade'
  items: Array<{ item?: string; itemName?: string; quantity: number }>
  requestedItems?: Array<{ itemName: string; quantity: number }>
  price: number
  status: 'active' | 'completed' | 'cancelled'
  views: number
  interestedUsers: string[]
  expiresAt?: string
  createdAt: string
}

export const tradeService = {
  getListings: async (params?: { page?: number; limit?: number; type?: string; search?: string }) => {
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

  cancel: async (id: string) => {
    const response = await apiClient.put(`/trade/listings/${id}/cancel`)
    return response.data
  },

  respond: async (id: string) => {
    const response = await apiClient.post(`/trade/listings/${id}/respond`)
    return response.data
  },

  getMyListings: async () => {
    const response = await apiClient.get('/trade/my-listings')
    return response.data
  },

  getStats: async () => {
    const response = await apiClient.get('/trade/stats')
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
    const response = await apiClient.put(`/trade/messages/conversations/${conversationId}/read`)
    return response.data
  },

  getUnreadCount: async () => {
    const response = await apiClient.get('/trade/messages/unread-count')
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

  getRequestCount: async () => {
    const response = await apiClient.get('/friends/requests/count')
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

export interface Notification {
  _id: string
  recipient: string
  type: 'welcome' | 'friend_request' | 'friend_accepted' | 'system' | 'trade'
  title: string
  content: string
  isRead: boolean
  data: Record<string, any>
  createdAt: string
  updatedAt: string
}

export const notificationService = {
  getNotifications: async (params?: { page?: number; limit?: number }) => {
    const response = await apiClient.get('/notifications', { params })
    return response.data
  },

  getUnreadCount: async () => {
    const response = await apiClient.get('/notifications/unread-count')
    return response.data
  },

  create: async (data: { type: string; title: string; content: string; recipientEmail?: string; relatedId?: string }) => {
    const response = await apiClient.post('/notifications', data)
    return response.data
  },

  markAsRead: async (notificationId: string) => {
    const response = await apiClient.put(`/notifications/${notificationId}/read`)
    return response.data
  },

  markAllAsRead: async () => {
    const response = await apiClient.put('/notifications/read-all')
    return response.data
  },

  deleteNotification: async (notificationId: string) => {
    const response = await apiClient.delete(`/notifications/${notificationId}`)
    return response.data
  },
}

export const favoriteService = {
  getFavorites: async () => {
    const response = await apiClient.get('/favorites')
    return response.data
  },

  addFavorite: async (listingId: string) => {
    const response = await apiClient.post(`/favorites/${listingId}`)
    return response.data
  },

  removeFavorite: async (listingId: string) => {
    const response = await apiClient.delete(`/favorites/${listingId}`)
    return response.data
  },

  checkFavorite: async (listingId: string) => {
    const response = await apiClient.get(`/favorites/check/${listingId}`)
    return response.data
  },
}
