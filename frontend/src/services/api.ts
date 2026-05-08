import apiClient from '../lib/api'

export const api = apiClient

// ==================== 音乐播放器 ====================
export interface Music {
  _id: string
  title: string
  artist: string
  filePath: string
  fileSize: number
  duration?: number
  uploadedBy: any
  isActive: boolean
  playCount: number
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export const musicService = {
  // 获取音乐列表（所有用户）
  getMusicList: async () => {
    const response = await apiClient.get('/music/list')
    return response.data
  },

  // 获取所有音乐（管理员）
  getAllMusicAdmin: async () => {
    const response = await apiClient.get('/music/admin/list')
    return response.data
  },

  // 上传音乐（管理员）
  uploadMusic: async (formData: FormData) => {
    const response = await apiClient.post('/music/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  // 删除音乐（管理员）
  deleteMusic: async (id: string) => {
    const response = await apiClient.delete(`/music/${id}`)
    return response.data
  },

  // 切换音乐启用状态（管理员）
  toggleMusicActive: async (id: string) => {
    const response = await apiClient.put(`/music/${id}/toggle`)
    return response.data
  },

  // 增加播放次数
  incrementPlayCount: async (id: string) => {
    const response = await apiClient.post(`/music/${id}/play`)
    return response.data
  },
}

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
  groupChat?: string | { _id: string; name: string }
  createdAt: string
  updatedAt?: string
}

export const teamService = {
  getAll: async (params?: { page?: number; limit?: number; search?: string }) => {
    const response = await apiClient.get('/teams', { params })
    return response.data
  },

  // 获取用户所属的战队
  getMyTeams: async () => {
    const response = await apiClient.get('/teams/my')
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

  createGroupChat: async (teamId: string) => {
    const response = await apiClient.post(`/teams/${teamId}/create-group-chat`)
    return response.data
  },
  
  // ==================== 战队签约管理 ====================
  // 获取签约选手
  getSignedPlayers: async (teamId: string) => {
    const response = await apiClient.get(`/teams/${teamId}/signing/players`)
    return response.data
  },
  
  // 签约选手
  signPlayer: async (teamId: string, data: {
    playerId: string
    position?: string
    contractStart?: string
    contractEnd?: string
    salary?: number
    notes?: string
  }) => {
    const response = await apiClient.post(`/teams/${teamId}/signing/player`, data)
    return response.data
  },
  
  // 解约选手
  releasePlayer: async (teamId: string, playerId: string) => {
    const response = await apiClient.delete(`/teams/${teamId}/signing/players/${playerId}`)
    return response.data
  },
  
  // 获取赞助商
  getSponsors: async (teamId: string) => {
    const response = await apiClient.get(`/teams/${teamId}/signing/sponsors`)
    return response.data
  },
  
  // 添加赞助商
  addSponsor: async (teamId: string, data: {
    name: string
    description?: string
    sponsorshipAmount?: number
    contractStart?: string
    contractEnd?: string
    website?: string
    contactInfo?: string
    notes?: string
  }) => {
    const response = await apiClient.post(`/teams/${teamId}/signing/sponsor`, data)
    return response.data
  },
  
  // 移除赞助商
  removeSponsor: async (teamId: string, sponsorId: string) => {
    const response = await apiClient.delete(`/teams/${teamId}/signing/sponsors/${sponsorId}`)
    return response.data
  },
  
  // 获取签约店铺
  getSignedShops: async (teamId: string) => {
    const response = await apiClient.get(`/teams/${teamId}/signing/shops`)
    return response.data
  },

  // 获取战队合约列表
  getTeamContracts: async (teamId: string) => {
    const response = await apiClient.get(`/teams/${teamId}/contracts`)
    return response.data
  },

  // 下载战队合约
  downloadTeamContract: async (teamId: string, shopId: string) => {
    const response = await apiClient.get(`/teams/${teamId}/contracts/${shopId}/download`, {
      responseType: 'blob',
    })
    return response
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

// ==================== 战队构筑共享 ====================
export interface TeamDeckBorrowRequest {
  _id: string
  deck: Deck | string
  deckName: string
  requestedBy: any
  requestDate: string
  status: 'pending' | 'approved' | 'rejected'
  handledBy?: any
  handledDate?: string
  returnDate?: string
  note?: string
}

export interface TeamDeckBorrowRecord {
  _id: string
  deck: Deck | string
  deckName: string
  borrowedBy: any
  borrowedAt: string
  returnedAt?: string
  returnDate?: string
  status: 'borrowed' | 'returned'
  note?: string
}

export interface TeamSharedDeck extends Deck {
  sharedAt?: string
  isAvailable?: boolean
  borrowedBy?: any
  borrowedAt?: string
  returnDate?: string
  addedBy?: any
}

export interface TeamDeckStats {
  totalDecks: number
  availableDecks: number
  borrowedDecks: number
}

export const teamDeckService = {
  // 获取战队共享构筑列表
  getTeamDecks: async (teamId: string) => {
    const response = await apiClient.get(`/team-decks/${teamId}/decks`)
    return response.data
  },

  // 添加构筑到战队共享
  addDeckToTeam: async (teamId: string, deckId: string) => {
    const response = await apiClient.post(`/team-decks/${teamId}/decks`, { deckId })
    return response.data
  },

  // 从战队共享移除构筑
  removeDeckFromTeam: async (teamId: string, deckId: string) => {
    const response = await apiClient.delete(`/team-decks/${teamId}/decks/${deckId}`)
    return response.data
  },

  // 创建构筑借用申请
  createDeckBorrowRequest: async (teamId: string, data: {
    deckId: string
    note?: string
    returnDate?: string
  }) => {
    const response = await apiClient.post(`/team-decks/${teamId}/deck-borrow-requests`, data)
    return response.data
  },

  // 获取构筑借用申请列表
  getDeckBorrowRequests: async (teamId: string, status?: string) => {
    const params = status ? { status } : undefined
    const response = await apiClient.get(`/team-decks/${teamId}/deck-borrow-requests`, { params })
    return response.data
  },

  // 处理构筑借用申请
  handleDeckBorrowRequest: async (teamId: string, requestId: string, action: 'approve' | 'reject') => {
    const response = await apiClient.post(`/team-decks/${teamId}/deck-borrow-requests/${requestId}/handle`, { action })
    return response.data
  },

  // 获取构筑借用记录
  getDeckBorrowRecords: async (teamId: string, status?: string) => {
    const params = status ? { status } : undefined
    const response = await apiClient.get(`/team-decks/${teamId}/deck-borrow-records`, { params })
    return response.data
  },

  // 归还构筑
  returnDeck: async (teamId: string, recordId: string) => {
    const response = await apiClient.post(`/team-decks/${teamId}/deck-borrow-records/${recordId}/return`)
    return response.data
  },

  // 获取我的构筑借用记录
  getMyDeckBorrows: async (teamId: string) => {
    const response = await apiClient.get(`/team-decks/${teamId}/decks/my-borrows`)
    return response.data
  },
}

export type ShopType = 'physical' | 'online' | 'virtual';

export interface Shop {
  _id: string
  name: string
  description?: string
  type: ShopType
  location?: {
    address: string
    city: string
    province: string
    postalCode: string
  }
  logo?: string
  coverImage?: string
  contactInfo?: {
    phone: string
    email: string
    website: string
    socialMedia: {
      wechat: string
      qq: string
    }
  }
  businessHours?: {
    openTime: string
    closeTime: string
    workdays: string[]
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

  getInventory: async (shopId: string, params?: { search?: string; rarity?: string; itemType?: string }) => {
    const response = await apiClient.get(`/shops/${shopId}/inventory`, { params })
    return response.data
  },

  addToInventory: async (shopId: string, inventoryItemId: string, quantity?: number) => {
    console.log('=== 前端调用 addToInventory:', { shopId, inventoryItemId, quantity });
    const response = await apiClient.post(`/shops/${shopId}/inventory`, { inventoryItemId, quantity });
    console.log('API 响应:', response);
    return response.data;
  },

  removeFromInventory: async (shopId: string, itemId: string) => {
    const response = await apiClient.delete(`/shops/${shopId}/inventory/${itemId}`)
    return response.data
  },

  updateInventoryItem: async (shopId: string, itemId: string, data: any) => {
    const response = await apiClient.put(`/shops/${shopId}/inventory/${itemId}`, data)
    return response.data
  },

  toggleListed: async (shopId: string, itemId: string, isListed: boolean) => {
    const response = await apiClient.put(`/shops/${shopId}/inventory/${itemId}/toggle-listed`, { isListed })
    return response.data
  },

  getInventoryStats: async (shopId: string) => {
    const response = await apiClient.get(`/shops/${shopId}/inventory/stats`)
    return response.data
  },

  getEmployees: async (shopId: string) => {
    const response = await apiClient.get(`/shops/${shopId}/employees`)
    return response.data
  },

  addEmployee: async (shopId: string, email: string, role: string) => {
    const response = await apiClient.post(`/shops/${shopId}/employees`, { email, role })
    return response.data
  },

  removeEmployee: async (shopId: string, employeeId: string) => {
    const response = await apiClient.delete(`/shops/${shopId}/employees/${employeeId}`)
    return response.data
  },

  updateEmployeeRole: async (shopId: string, employeeId: string, role: string) => {
    const response = await apiClient.put(`/shops/${shopId}/employees/${employeeId}/role`, { role })
    return response.data
  },

  // 货架管理
  getShelves: async (shopId: string) => {
    const response = await apiClient.get(`/shops/${shopId}/shelves`)
    return response.data
  },

  createShelf: async (shopId: string, data: { name: string; description?: string; capacity?: number }) => {
    const response = await apiClient.post(`/shops/${shopId}/shelves`, data)
    return response.data
  },

  updateShelf: async (shopId: string, shelfId: string, data: { name?: string; description?: string; capacity?: number }) => {
    const response = await apiClient.put(`/shops/${shopId}/shelves/${shelfId}`, data)
    return response.data
  },

  deleteShelf: async (shopId: string, shelfId: string) => {
    const response = await apiClient.delete(`/shops/${shopId}/shelves/${shelfId}`)
    return response.data
  },

  addItemToShelf: async (shopId: string, shelfId: string, data: { inventoryItemId: string; quantity?: number; position?: string }) => {
    const response = await apiClient.post(`/shops/${shopId}/shelves/${shelfId}/items`, data)
    return response.data
  },

  updateShelfItem: async (shopId: string, shelfId: string, itemId: string, data: { quantity?: number; position?: string }) => {
    const response = await apiClient.put(`/shops/${shopId}/shelves/${shelfId}/items/${itemId}`, data)
    return response.data
  },

  removeItemFromShelf: async (shopId: string, shelfId: string, itemId: string) => {
    const response = await apiClient.delete(`/shops/${shopId}/shelves/${shelfId}/items/${itemId}`)
    return response.data
  },
  
  // ==================== 店铺签约管理 ====================
  // 签约战队
  signTeam: async (shopId: string, data: {
    teamId: string
    sponsorshipAmount?: number
    sponsorshipType?: string
    contractStart?: string
    contractEnd?: string
    benefits?: string
    notes?: string
  }) => {
    const response = await apiClient.post(`/shops/${shopId}/signing/team`, data)
    return response.data
  },
  
  // 获取签约战队列表
  getSignedTeams: async (shopId: string) => {
    const response = await apiClient.get(`/shops/${shopId}/signing/teams`)
    return response.data
  },
  
  // 更新签约战队
  updateSignedTeam: async (shopId: string, teamId: string, data: any) => {
    const response = await apiClient.put(`/shops/${shopId}/signing/teams/${teamId}`, data)
    return response.data
  },
  
  // 解除签约战队
  terminateSignedTeam: async (shopId: string, teamId: string, reason?: string) => {
    const response = await apiClient.delete(`/shops/${shopId}/signing/teams/${teamId}`, { data: { reason } })
    return response.data
  },

  // 上传战队合约
  uploadTeamContract: async (shopId: string, teamId: string, formData: FormData) => {
    const response = await apiClient.post(`/shops/${shopId}/signing/teams/${teamId}/contract`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  // 删除战队合约
  deleteTeamContract: async (shopId: string, teamId: string) => {
    const response = await apiClient.delete(`/shops/${shopId}/signing/teams/${teamId}/contract`)
    return response.data
  },
}

export interface Deck {
  _id: string;
  name: string;
  game: string;
  type?: 'building' | 'deck';
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

  markAllAsRead: async () => {
    const response = await apiClient.put('/trade/messages/read-all')
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
  type: 'welcome' | 'friend_request' | 'friend_accepted' | 'system' | 'trade' | 'order_created' | 'order_cancelled' | 'order_confirmed' | 'order_completed' | 'group_invite'
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

export interface Announcement {
  _id: string
  title: string
  content: string
  type: 'update' | 'announcement' | 'important' | 'event'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  isPinned: boolean
  isActive: boolean
  createdBy: string | { _id: string; username: string; avatar?: string }
  tags?: string[]
  views?: number
  expiresAt?: string
  createdAt: string
  updatedAt: string
}

export const announcementService = {
  getAnnouncements: async (params?: { page?: number; limit?: number; type?: string; isActive?: string }) => {
    const response = await apiClient.get('/announcements', { params })
    return response.data
  },

  getAnnouncement: async (id: string) => {
    const response = await apiClient.get(`/announcements/${id}`)
    return response.data
  },

  createAnnouncement: async (data: {
    title: string
    content: string
    type?: string
    priority?: string
    isPinned?: boolean
    tags?: string[]
    expiresAt?: string
  }) => {
    const response = await apiClient.post('/announcements', data)
    return response.data
  },

  updateAnnouncement: async (id: string, data: {
    title?: string
    content?: string
    type?: string
    priority?: string
    isPinned?: boolean
    isActive?: boolean
    tags?: string[]
    expiresAt?: string
  }) => {
    const response = await apiClient.put(`/announcements/${id}`, data)
    return response.data
  },

  deleteAnnouncement: async (id: string) => {
    const response = await apiClient.delete(`/announcements/${id}`)
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

export interface OrderItem {
  shopInventoryItem: string | {
    _id: string
    template?: {
      _id: string
      itemName: string
      rarity?: string
      itemType?: string
      gameType?: string[]
      images?: string[]
      runeCardInfo?: {
        version?: string
        cardNumber?: string
      }
    }
  }
  quantity: number
  price: number
  itemName: string
  itemSnapshot?: {
    rarity?: string
    itemType?: string
    gameType?: string[]
    images?: string[]
    runeCardInfo?: {
      version?: string
      cardNumber?: string
    }
  }
}

export interface Order {
  _id: string
  orderNumber: string
  user: string | { _id: string; username: string; email?: string }
  shop: string | { _id: string; name: string; logo?: string }
  items: OrderItem[]
  totalAmount: number
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  notes?: string
  groupChat?: string
  cancelReason?: string
  confirmedBy?: string
  confirmedAt?: string
  completedBy?: string
  completedAt?: string
  cancelledBy?: string
  cancelledAt?: string
  createdAt: string
  updatedAt: string
}

export const orderService = {
  createOrder: async (shopId: string, data: {
    items: Array<{ shopInventoryItemId: string; quantity: number }>
    notes?: string
  }) => {
    const response = await apiClient.post(`/shops/${shopId}/orders`, data)
    return response.data
  },

  getMyOrders: async (params?: { status?: string; page?: number; limit?: number }) => {
    const response = await apiClient.get('/orders', { params })
    return response.data
  },

  getOrderById: async (orderId: string) => {
    const response = await apiClient.get(`/orders/${orderId}`)
    return response.data
  },

  cancelOrder: async (orderId: string, reason?: string) => {
    const response = await apiClient.put(`/orders/${orderId}/cancel`, { reason })
    return response.data
  },

  confirmOrder: async (shopId: string, orderId: string) => {
    const response = await apiClient.put(`/shops/${shopId}/orders/${orderId}/confirm`)
    return response.data
  },

  completeOrder: async (shopId: string, orderId: string) => {
    const response = await apiClient.put(`/shops/${shopId}/orders/${orderId}/complete`)
    return response.data
  },

  getShopOrders: async (shopId: string, params?: { status?: string; page?: number; limit?: number }) => {
    const response = await apiClient.get(`/shops/${shopId}/orders/shop/list`, { params })
    return response.data
  },
}

export interface ShopConversation {
  _id: string
  shop: {
    _id: string
    name: string
    logo?: string
    employees?: Array<{ user: { _id: string; username: string }; role: string }>
  }
  customer: {
    _id: string
    username: string
    avatar?: string
  }
  lastMessage?: {
    content: string
    sender: { _id: string; username: string }
    createdAt: string
  }
  unreadCount: number
  createdAt: string
  updatedAt: string
  isShopConversation: boolean
}

export interface ShopMessage {
  _id: string
  conversation: string
  sender: { _id: string; username: string; avatar?: string }
  content: string
  isRead: string[]
  createdAt: string
}

export const shopMessageService = {
  getConversations: async () => {
    const response = await apiClient.get('/shop-messages/conversations')
    return response.data
  },

  getConversationMessages: async (conversationId: string) => {
    const response = await apiClient.get(`/shop-messages/conversations/${conversationId}`)
    return response.data
  },

  sendMessage: async (conversationId: string, content: string) => {
    const response = await apiClient.post(`/shop-messages/conversations/${conversationId}`, { content })
    return response.data
  },

  contactShop: async (shopId: string, initialMessage?: string) => {
    const response = await apiClient.post(`/shop-messages/contact/${shopId}`, { initialMessage })
    return response.data
  },

  getUnreadCount: async () => {
    const response = await apiClient.get('/shop-messages/unread-count')
    return response.data
  },
}

// 群聊相关接口
export interface GroupChat {
  _id: string
  name: string
  description?: string
  icon?: string
  creator: { _id: string; username: string; avatar?: string }
  members: Array<{
    user: { _id: string; username: string; avatar?: string }
    role: 'owner' | 'admin' | 'member'
    joinedAt: string
    muted: boolean
  }>
  lastMessage?: {
    content: string
    sender: { _id: string; username: string }
    createdAt: string
  }
  type: 'system' | 'team' | 'custom'
  level: number
  isPublic: boolean
  maxMembers: number
  createdAt: string
  updatedAt: string
  unreadCount?: number
  team?: { _id: string; name: string; logo?: string }
}

export interface GroupLevelConfig {
  name: string
  maxMembers: number
  icon: string
  description: string
}

export interface GroupMessage {
  _id: string
  sender: { _id: string; username: string; avatar?: string }
  content: string
  readBy: string[]
  createdAt: string
}

export const groupChatService = {
  // 获取用户的群聊列表
  getMyGroups: async (params?: { page?: number; limit?: number }) => {
    const response = await apiClient.get('/group-chats', { params })
    return response.data
  },

  // 获取所有群聊（管理员）
  getAllGroups: async (params?: { page?: number; limit?: number }) => {
    const response = await apiClient.get('/group-chats/all', { params })
    return response.data
  },

  // 获取群聊详情
  getGroup: async (groupId: string) => {
    const response = await apiClient.get(`/group-chats/${groupId}`)
    return response.data
  },

  // 创建群聊（管理员）
  createGroup: async (data: {
    name: string
    description?: string
    icon?: string
    type?: string
    isPublic?: boolean
    maxMembers?: number
    memberIds?: string[]
  }) => {
    const response = await apiClient.post('/group-chats', data)
    return response.data
  },

  // 更新群聊信息
  updateGroup: async (
    groupId: string,
    data: {
      name?: string
      description?: string
      icon?: string
      isPublic?: boolean
      maxMembers?: number
      settings?: any
    }
  ) => {
    const response = await apiClient.put(`/group-chats/${groupId}`, data)
    return response.data
  },

  // 删除群聊
  deleteGroup: async (groupId: string) => {
    const response = await apiClient.delete(`/group-chats/${groupId}`)
    return response.data
  },

  // 删除所有群聊（仅超级管理员）
  deleteAllGroups: async () => {
    const response = await apiClient.delete('/group-chats/all')
    return response.data
  },

  // 添加成员
  addMembers: async (groupId: string, userIds: string[]) => {
    const response = await apiClient.post(`/group-chats/${groupId}/members`, { userIds })
    return response.data
  },

  // 更新成员权限
  updateMember: async (
    groupId: string,
    userId: string,
    data: { role?: string; muted?: boolean }
  ) => {
    const response = await apiClient.put(`/group-chats/${groupId}/members/${userId}`, data)
    return response.data
  },

  // 移除成员
  removeMember: async (groupId: string, userId: string) => {
    const response = await apiClient.delete(`/group-chats/${groupId}/members/${userId}`)
    return response.data
  },

  // 发送消息
  sendMessage: async (groupId: string, content: string) => {
    const response = await apiClient.post(`/group-chats/${groupId}/messages`, { content })
    return response.data
  },

  // 获取消息
  getMessages: async (groupId: string, params?: { page?: number; limit?: number }) => {
    const response = await apiClient.get(`/group-chats/${groupId}/messages`, { params })
    return response.data
  },

  // 获取群聊等级配置
  getLevelConfig: async () => {
    const response = await apiClient.get('/group-chats/level-config')
    return response.data
  },

  // 标记单个群聊消息为已读
  markAsRead: async (groupId: string) => {
    const response = await apiClient.put(`/group-chats/${groupId}/read`)
    return response.data
  },

  // 标记所有群聊消息为已读
  markAllAsRead: async () => {
    const response = await apiClient.put('/group-chats/read-all')
    return response.data
  },
}

export interface Task {
  _id: string
  name: string
  description?: string
  type: 'daily' | 'weekly' | 'achievement' | 'one-time'
  category: 'inventory' | 'trade' | 'deck' | 'shop' | 'social' | 'other'
  target: {
    action: string
    value: number
    inventoryItemId?: string
    cardType?: string
    gameType?: string
  }
  rewards: {
    exp: number
    points: number
    coins: number
  }
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
  userProgress?: UserTaskProgress
}

export interface UserTaskProgress {
  _id: string
  userId: string
  taskId: string
  progress: number
  status: 'not-started' | 'in-progress' | 'completed' | 'claimed'
  completedAt?: string
  claimedAt?: string
  periodStart: string
  periodEnd?: string
}

export const taskService = {
  // 获取所有任务
  getTasks: async () => {
    const response = await apiClient.get('/tasks')
    return response.data
  },

  // 获取我的任务进度
  getMyTasks: async () => {
    const response = await apiClient.get('/tasks/my')
    return response.data
  },

  // 领取任务奖励
  claimReward: async (taskId: string) => {
    const response = await apiClient.post(`/tasks/${taskId}/claim`)
    return response.data
  },

  // 更新任务进度
  updateProgress: async (action: string, data?: any) => {
    const response = await apiClient.post(`/tasks/progress/${action}`, data)
    return response.data
  },

  // 初始化默认任务（管理员）
  initDefaultTasks: async () => {
    const response = await apiClient.post('/tasks/init-default')
    return response.data
  },

  // ==================== 管理员接口 ====================
  // 获取所有任务（管理员）
  getAllTasksAdmin: async () => {
    const response = await apiClient.get('/tasks/admin/all')
    return response.data
  },

  // 创建新任务
  createTask: async (data: Partial<Task>) => {
    const response = await apiClient.post('/tasks/admin', data)
    return response.data
  },

  // 更新任务
  updateTask: async (id: string, data: Partial<Task>) => {
    const response = await apiClient.put(`/tasks/admin/${id}`, data)
    return response.data
  },

  // 删除任务
  deleteTask: async (id: string) => {
    const response = await apiClient.delete(`/tasks/admin/${id}`)
    return response.data
  },
}

// ==================== 平台商店 ====================
export interface PlatformStoreItem {
  _id: string
  itemName: string
  description?: string
  itemType: 'inventory_item' | 'points' | 'exp' | 'badge' | 'title' | 'physical_item' | 'digital_item' | 'coupon' | 'membership' | 'other'
  currencyType: 'points' | 'coins'
  price: number
  inventoryItem?: any
  stock: number
  itemQuantity: number
  redeemedCount: number
  limitPerUser: number
  validFrom?: string
  validUntil?: string
  isActive: boolean
  sortOrder: number
  image?: string
  tags?: string[]
  createdBy?: any
  createdAt: string
  updatedAt: string
}

export interface PlatformStoreRedemption {
  _id: string
  userId: string
  storeItem: PlatformStoreItem
  itemName: string
  currencyType: 'points' | 'coins'
  price: number
  quantity: number
  status: 'pending' | 'completed' | 'failed' | 'refunded'
  userInventoryItem?: any
  notes?: string
  createdAt: string
}

export const platformStoreService = {
  // 获取所有有效的商店物品
  getStoreItems: async () => {
    const response = await apiClient.get('/platform-store')
    return response.data
  },

  // 获取单个商店物品详情
  getStoreItemById: async (id: string) => {
    const response = await apiClient.get(`/platform-store/${id}`)
    return response.data
  },

  // 兑换商店物品
  redeemStoreItem: async (id: string, quantity: number = 1) => {
    const response = await apiClient.post(`/platform-store/${id}/redeem`, { quantity })
    return response.data
  },

  // 战队兑换商店物品
  teamRedeemStoreItem: async (teamId: string, id: string, quantity: number = 1) => {
    const response = await apiClient.post(`/platform-store/${id}/team-redeem`, { teamId, quantity })
    return response.data
  },

  // 获取用户的兑换记录
  getMyRedemptions: async () => {
    const response = await apiClient.get('/platform-store/redemptions/my')
    return response.data
  },

  // 获取战队的兑换记录
  getTeamRedemptions: async (teamId: string) => {
    const response = await apiClient.get(`/platform-store/redemptions/team/${teamId}`)
    return response.data
  },

  // ==================== 管理员接口 ====================
  // 获取所有商店物品（管理员）
  getAllStoreItemsAdmin: async () => {
    const response = await apiClient.get('/platform-store/admin/all')
    return response.data
  },

  // 创建商店物品
  createStoreItem: async (data: Partial<PlatformStoreItem>) => {
    const response = await apiClient.post('/platform-store', data)
    return response.data
  },

  // 更新商店物品
  updateStoreItem: async (id: string, data: Partial<PlatformStoreItem>) => {
    const response = await apiClient.put(`/platform-store/${id}`, data)
    return response.data
  },

  // 删除商店物品
  deleteStoreItem: async (id: string) => {
    const response = await apiClient.delete(`/platform-store/${id}`)
    return response.data
  },
}

// ==================== 抽卡系统 ====================
export const gachaService = {
  // 消耗金币
  spendCoins: async (amount: number) => {
    const response = await apiClient.post('/gacha/spend', { amount })
    return response.data
  },
  
  // 增加金币
  addCoins: async (amount: number) => {
    const response = await apiClient.post('/gacha/add', { amount })
    return response.data
  },
  
  // 获取礼物状态
  getGiftStatus: async () => {
    const response = await apiClient.get('/gacha/gift/status')
    return response.data
  },
  
  // 领取礼物
  claimGift: async () => {
    const response = await apiClient.post('/gacha/gift/claim')
    return response.data
  },
}

// ==================== 抽卡概率管理 ====================
export interface RarityProbability {
  rarityId: string
  rarityName: string
  probability: number
  color: string
  bgColor: string
  borderColor: string
  glowColor: string
}

export interface GachaProbabilityConfig {
  _id?: string
  name: string
  description?: string
  isActive?: boolean
  rarities: RarityProbability[]
  createdBy?: string
  createdAt?: string
  updatedAt?: string
}

export const gachaProbabilityService = {
  // 获取当前激活的概率配置
  getActiveConfig: async () => {
    const response = await apiClient.get('/gacha-probability')
    return response.data
  },
  
  // 获取所有配置列表（管理员）
  getAllConfigs: async () => {
    const response = await apiClient.get('/gacha-probability/admin/all')
    return response.data
  },
  
  // 获取单个配置（管理员）
  getConfig: async (id: string) => {
    const response = await apiClient.get(`/gacha-probability/admin/${id}`)
    return response.data
  },
  
  // 创建新配置（管理员）
  createConfig: async (data: Partial<GachaProbabilityConfig>) => {
    const response = await apiClient.post('/gacha-probability', data)
    return response.data
  },
  
  // 更新配置（管理员）
  updateConfig: async (id: string, data: Partial<GachaProbabilityConfig>) => {
    const response = await apiClient.put(`/gacha-probability/${id}`, data)
    return response.data
  },
  
  // 删除配置（管理员）
  deleteConfig: async (id: string) => {
    const response = await apiClient.delete(`/gacha-probability/${id}`)
    return response.data
  },
  
  // 激活配置（管理员）
  activateConfig: async (id: string) => {
    const response = await apiClient.post(`/gacha-probability/${id}/activate`)
    return response.data
  },
}

// ==================== 卡片类型管理 ====================

export interface CardType {
  _id: string
  name: string
  gameType: string
  cardProperty?: string
  description?: string
  createdAt: string
  updatedAt: string
}

export const cardTypeService = {
  getAll: async (params?: { search?: string; gameType?: string; cardProperty?: string }) => {
    const response = await apiClient.get('/card-types', { params })
    return response.data
  },
  
  getById: async (id: string) => {
    const response = await apiClient.get(`/card-types/${id}`)
    return response.data
  },
  
  create: async (data: { name: string; gameType: string; cardProperty?: string; description?: string }) => {
    const response = await apiClient.post('/card-types', data)
    return response.data
  },
  
  update: async (id: string, data: { name?: string; gameType?: string; cardProperty?: string; description?: string }) => {
    const response = await apiClient.put(`/card-types/${id}`, data)
    return response.data
  },
  
  delete: async (id: string) => {
    const response = await apiClient.delete(`/card-types/${id}`)
    return response.data
  },
}

// ==================== 抽卡用户数据 ====================

// 单次抽卡结果
export interface SingleDrawResult {
  rarityId: string
  rarityName: string
  cardName?: string
  cardId?: string
  isPity?: boolean
}

// 模拟抽卡记录
export interface GachaSimulationRecord {
  _id: string
  userId: string
  configId: string
  configName: string
  drawCount: number
  results: Array<{
    rarityId: string
    rarityName: string
    count: number
    percentage: number
    expectedPercentage: number
    difference: number
  }>
  detailedResults?: SingleDrawResult[]
  note?: string
  tags?: string[]
  pityCount?: number
  isRealGacha: boolean
  createdAt: string
  updatedAt: string
}

// 收集物品
export interface CollectedItem {
  itemType: 'card' | 'badge' | 'title' | 'other'
  itemId: string
  itemName: string
  rarity?: string
  count: number
  firstObtainedAt: string
  lastObtainedAt: string
  source: 'gacha' | 'store' | 'task' | 'trade' | 'gift' | 'other'
  sourceDetail?: string
  note?: string
}

// 收集分类
export interface CollectionCategory {
  categoryId?: string
  categoryName: string
  totalItems: number
  collectedItems: number
  completionPercentage: number
  items: CollectedItem[]
}

// 用户收集进度
export interface UserCollectionProgress {
  _id: string
  userId: string
  totalCollected: number
  totalUnique: number
  categories: CollectionCategory[]
  allItems: CollectedItem[]
  gachaStats: {
    totalDraws: number
    totalSpent: number
    rarityStats: Array<{ rarityId: string; rarityName: string; count: number }>
    recentDraws: Array<{ rarityId: string; rarityName: string; cardName: string; drawTime: string }>
  }
  achievements: Array<{ achievementId: string; name: string; description: string; unlockedAt: string }>
  customData?: any
  createdAt: string
  updatedAt: string
}

// 抽卡统计
export interface GachaUserStats {
  totalDraws: number
  totalSpent: number
  rarityStats: Array<{ rarityId: string; rarityName: string; count: number }>
  recentDraws: Array<{ rarityId: string; rarityName: string; cardName: string; drawTime: string }>
  totalCollected: number
  totalUnique: number
}

export const gachaUserService = {
  // ==================== 模拟抽卡记录相关 ====================
  
  // 保存模拟抽卡记录
  saveSimulation: async (data: {
    configId: string
    configName: string
    drawCount: number
    results: any[]
    detailedResults?: SingleDrawResult[]
    note?: string
    tags?: string[]
    isRealGacha?: boolean
  }) => {
    const response = await apiClient.post('/gacha-user/simulation', data)
    return response.data
  },
  
  // 获取模拟抽卡记录列表
  getSimulations: async (params?: {
    page?: number
    limit?: number
    configId?: string
  }) => {
    const response = await apiClient.get('/gacha-user/simulation', { params })
    return response.data
  },
  
  // 获取单条抽卡记录详情
  getSimulation: async (id: string) => {
    const response = await apiClient.get(`/gacha-user/simulation/${id}`)
    return response.data
  },
  
  // 删除抽卡记录
  deleteSimulation: async (id: string) => {
    const response = await apiClient.delete(`/gacha-user/simulation/${id}`)
    return response.data
  },
  
  // ==================== 用户收集进度相关 ====================
  
  // 获取用户收集进度
  getCollection: async () => {
    const response = await apiClient.get('/gacha-user/collection')
    return response.data
  },
  
  // 添加收集物品
  addCollectedItem: async (item: Partial<CollectedItem>) => {
    const response = await apiClient.post('/gacha-user/collection/item', item)
    return response.data
  },
  
  // 更新收集物品
  updateCollectedItem: async (itemId: string, data: Partial<CollectedItem>) => {
    const response = await apiClient.put(`/gacha-user/collection/item/${itemId}`, data)
    return response.data
  },
  
  // 删除收集物品
  deleteCollectedItem: async (itemId: string) => {
    const response = await apiClient.delete(`/gacha-user/collection/item/${itemId}`)
    return response.data
  },
  
  // ==================== 统计相关 ====================
  
  // 获取用户抽卡统计
  getStats: async () => {
    const response = await apiClient.get('/gacha-user/stats')
    return response.data
  },
}

// ==================== 库存查看申请 ====================
export interface InventoryViewRequest {
  _id: string
  requester: { _id: string; username: string; avatar?: string }
  owner: { _id: string; username: string; avatar?: string }
  status: 'pending' | 'accepted' | 'rejected' | 'expired'
  message?: string
  expiresAt: string
  createdAt: string
  updatedAt: string
}

export const inventoryViewRequestService = {
  // 获取我收到的申请
  getMyReceivedRequests: async () => {
    const response = await apiClient.get('/inventory-view-requests/me/received')
    return response.data
  },

  // 获取我发送的申请
  getMySentRequests: async () => {
    const response = await apiClient.get('/inventory-view-requests/me/sent')
    return response.data
  },

  // 发送申请
  sendRequest: async (userId: string, message?: string) => {
    const response = await apiClient.post('/inventory-view-requests', { userId, message })
    return response.data
  },

  // 接受申请
  acceptRequest: async (requestId: string) => {
    const response = await apiClient.put(`/inventory-view-requests/${requestId}/accept`)
    return response.data
  },

  // 拒绝申请
  rejectRequest: async (requestId: string) => {
    const response = await apiClient.put(`/inventory-view-requests/${requestId}/reject`)
    return response.data
  },

  // 删除申请
  deleteRequest: async (requestId: string) => {
    const response = await apiClient.delete(`/inventory-view-requests/${requestId}`)
    return response.data
  },

  // 检查是否可以查看某用户库存
  checkCanView: async (userId: string) => {
    const response = await apiClient.get(`/inventory-view-requests/me/can-view/${userId}`)
    return response.data
  },

  // 获取查看权限详情
  getPermission: async (userId: string) => {
    const response = await apiClient.get(`/inventory-view-requests/me/permission/${userId}`)
    return response.data
  },

  // 获取未处理申请数量
  getPendingCount: async () => {
    const response = await apiClient.get('/inventory-view-requests/me/received/count')
    return response.data
  },
}

// ==================== 查看他人库存 ====================
export const userInventoryService = {
  // 查看他人库存
  getUserInventory: async (userId: string, params?: any) => {
    const response = await apiClient.get(`/user-inventory/user/${userId}`, { params })
    return response.data
  },
}
