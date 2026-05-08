import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { shopService, Shop, orderService, Order } from '@/services/api'
import { inventoryService } from '@/services/inventory'
import { authService, User } from '@/services/auth'
import { toast } from 'sonner'
import { Package, Search, Plus, Trash2, ArrowLeft, Boxes, Edit, Users, UserPlus, UserX, LayoutDashboard, MoveUpRight, ShoppingCart, Clock, CheckCircle, XCircle, Eye, MessageCircle, Briefcase, Upload, FileText, Download } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { SigningManagementDialog } from '@/components/teams/SigningManagementDialog'
import { SignTeamDialog } from '@/components/shops/SignTeamDialog'

interface ShopInventoryItem {
  _id: string
  template: {
    _id: string
    itemName: string
    rarity: string
    itemType: string
    gameType?: string | string[]
    images?: string[]
    runeCardInfo?: {
      version?: string
      cardNumber?: string
    }
    cardProperty?: string
    value?: number
    description?: string
  }
  quantity: number
  price: number
  shop: string
  addedBy?: { _id: string; username: string }
  source?: 'personal_inventory' | 'purchase' | 'trade' | 'other'
  sourceNote?: string
  isListed: boolean
  createdAt: string
  updatedAt: string
}

interface ShopEmployee {
  _id: string
  user: {
    _id: string
    username: string
    email: string
  }
  role: string
  hiredAt: string
  addedBy?: {
    _id: string
    username: string
  }
  permissions?: {
    canManageInventory?: boolean
    canRecordSales?: boolean
    canViewReports?: boolean
    canManageEmployees?: boolean
  }
}

interface ShelfItem {
  _id: string
  inventoryItem: ShopInventoryItem
  quantity: number
  addedAt: string
}

interface Shelf {
  _id: string
  name: string
  description: string
  capacity: number
  items: ShelfItem[]
  createdAt: string
  updatedAt: string
}

export function ShopManagementPage() {
  const { id: shopId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('inventory')
  const [searchTerm, setSearchTerm] = useState('')
  const [userInventorySearch, setUserInventorySearch] = useState('')
  const [showZeroQuantity, setShowZeroQuantity] = useState(true)
  const [selectedRarity, setSelectedRarity] = useState<string>('all')
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [addEmployeeDialogOpen, setAddEmployeeDialogOpen] = useState(false)
  const [addShelfDialogOpen, setAddShelfDialogOpen] = useState(false)
  const [editShelfDialogOpen, setEditShelfDialogOpen] = useState(false)
  const [addItemToShelfDialogOpen, setAddItemToShelfDialogOpen] = useState(false)
  const [editShelfItemDialogOpen, setEditShelfItemDialogOpen] = useState(false)
  const [listItemDialogOpen, setListItemDialogOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<ShopInventoryItem | null>(null)
  const [selectedShelf, setSelectedShelf] = useState<Shelf | null>(null)
  const [selectedShelfItem, setSelectedShelfItem] = useState<ShelfItem | null>(null)
  const [editForm, setEditForm] = useState({ quantity: 0, price: 0 })
  const [shelfForm, setShelfForm] = useState({ name: '', description: '', capacity: 0 })
  const [shelfItemForm, setShelfItemForm] = useState({ inventoryItemId: '', quantity: 1 })
  const [listItemForm, setListItemForm] = useState({ shelfId: '', quantity: 1 })
  const [editShelfForm, setEditShelfForm] = useState({ name: '', description: '', capacity: 0 })
  const [editShelfItemForm, setEditShelfItemForm] = useState({ quantity: 1 })
  const [employeeSearch, setEmployeeSearch] = useState('')
  const [newEmployeeEmail, setNewEmployeeEmail] = useState('')
  const [newEmployeeRole, setNewEmployeeRole] = useState('staff')
  const [editShopDialogOpen, setEditShopDialogOpen] = useState(false)
  const [editShopForm, setEditShopForm] = useState({
    name: '',
    description: '',
    logo: '',
    coverImage: '',
    location: { address: '', city: '', province: '', postalCode: '' },
    contactInfo: { phone: '', email: '', website: '', socialMedia: { wechat: '', qq: '' } },
    businessHours: { openTime: '', closeTime: '', workdays: [] }
  })
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [orderDetailDialogOpen, setOrderDetailDialogOpen] = useState(false)
  const [signingDialogOpen, setSigningDialogOpen] = useState(false)
  const [editSignTeamOpen, setEditSignTeamOpen] = useState(false)
  const [editingTeam, setEditingTeam] = useState<any>(null)
  const [contractUploadOpen, setContractUploadOpen] = useState(false)
  const [selectedContractTeam, setSelectedContractTeam] = useState<any>(null)
  const [selectedContractFile, setSelectedContractFile] = useState<File | null>(null)
  
  // 签约管理相关状态和查询
  const { data: signedTeamsData, isLoading: signedTeamsLoading, refetch: refetchSignedTeams } = useQuery({
    queryKey: ['shop-signed-teams', shopId],
    queryFn: () => shopService.getSignedTeams(shopId!),
    enabled: !!shopId,
  })
  const signedTeams = signedTeamsData?.data || []
  
  // 计算签约统计
  const activeTeamsCount = signedTeams.filter((t: any) => t.status === 'active').length
  const totalSponsorshipAmount = signedTeams.reduce((sum: number, t: any) => sum + (t.sponsorshipAmount || 0), 0)
  
  // 删除签约战队突变
  const deleteSignTeamMutation = useMutation({
    mutationFn: async (teamId: string) => {
      return await shopService.terminateSignedTeam(shopId!, teamId)
    },
    onSuccess: () => {
      toast.success('已解除战队签约')
      refetchSignedTeams()
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || '解除签约失败')
    }
  })
  
  // 上传合约突变
  const uploadContractMutation = useMutation({
    mutationFn: async ({ teamId, file }: { teamId: string; file: File }) => {
      const formData = new FormData()
      formData.append('contract', file)
      return await shopService.uploadTeamContract(shopId!, teamId, formData)
    },
    onSuccess: () => {
      toast.success('合约上传成功')
      refetchSignedTeams()
      setContractUploadOpen(false)
      setSelectedContractFile(null)
      setSelectedContractTeam(null)
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || '合约上传失败')
    }
  })
  
  // 删除合约突变
  const deleteContractMutation = useMutation({
    mutationFn: async (teamId: string) => {
      return await shopService.deleteTeamContract(shopId!, teamId)
    },
    onSuccess: () => {
      toast.success('合约已删除')
      refetchSignedTeams()
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || '合约删除失败')
    }
  })
  
  // 编辑签约战队处理函数
  const handleEditTeam = (team: any) => {
    setEditingTeam(team)
    setEditSignTeamOpen(true)
  }
  
  // 删除签约战队处理函数
  const handleDeleteTeam = (teamId: string) => {
    if (window.confirm('确定要解除与该战队的签约吗？')) {
      deleteSignTeamMutation.mutate(teamId)
    }
  }
  
  // 上传合约处理函数
  const handleUploadContract = (team: any) => {
    setSelectedContractTeam(team)
    setContractUploadOpen(true)
  }
  
  // 删除合约处理函数
  const handleDeleteContract = (teamId: string) => {
    if (window.confirm('确定要删除该战队的合约吗？')) {
      deleteContractMutation.mutate(teamId)
    }
  }
  
  // 处理合约文件选择
  const handleContractFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedContractFile(e.target.files[0])
    }
  }
  
  // 提交合约上传
  const handleSubmitContract = () => {
    if (!selectedContractFile || !selectedContractTeam) {
      toast.error('请选择合约文件')
      return
    }
    uploadContractMutation.mutate({ 
      teamId: selectedContractTeam.team, 
      file: selectedContractFile 
    })
  }
  
  // 计算物品已在所有货架上的总数量
  const getTotalOnShelves = (inventoryItemId: string) => {
    if (!shop) return 0
    let total = 0
    shop.shelves?.forEach(shelf => {
      shelf.items?.forEach(item => {
        if (item.inventoryItem?._id === inventoryItemId) {
          total += item.quantity
        }
      })
    })
    return total
  }

  // 获取当前用户
  const currentUser = authService.getCurrentUser()

  // 检查当前用户是否有权限管理员工
  const canManageEmployees = () => {
    if (!currentUser || !shop) return false
    // 检查是否是店主
    if (shop.owner === currentUser._id) return true
    // 检查是否是员工，且有员工管理权限
    const currentEmployee = shop.employees?.find(
      (emp) => emp.user === currentUser._id || (typeof emp.user === 'object' && emp.user._id === currentUser._id)
    )
    if (currentEmployee) {
      // 检查角色或权限
      if (currentEmployee.role === 'owner' || currentEmployee.role === 'operator') {
        return true
      }
      if (currentEmployee.permissions?.canManageEmployees) {
        return true
      }
    }
    return false
  }

  const queryClient = useQueryClient()

  const { data: shopData } = useQuery({
    queryKey: ['shop', shopId],
    queryFn: () => shopService.getById(shopId!),
    enabled: !!shopId
  })

  const { data: inventoryData, isLoading: inventoryLoading } = useQuery({
    queryKey: ['shopInventory', shopId, searchTerm],
    queryFn: async () => {
      const result = await shopService.getInventory(shopId!, { search: searchTerm })
      return result
    },
    enabled: !!shopId
  })

  const { data: employeesData, isLoading: employeesLoading } = useQuery({
    queryKey: ['shopEmployees', shopId],
    queryFn: async () => {
      const result = await shopService.getEmployees(shopId!)
      return result
    },
    enabled: !!shopId
  })

  const { data: userInventoryData } = useQuery({
    queryKey: ['userInventory', userInventorySearch, showZeroQuantity, selectedRarity],
    queryFn: async () => {
      const result = await inventoryService.getAll({
        search: userInventorySearch || undefined,
        showZeroQuantity: showZeroQuantity ? 'true' : 'false',
        rarity: selectedRarity !== 'all' ? selectedRarity : undefined,
        sort: 'createdAt',
        order: 'desc',
        limit: 50
      })
      return result
    },
    staleTime: 5000,
    cacheTime: 30000
  })

  const { data: shelvesData, isLoading: shelvesLoading } = useQuery({
    queryKey: ['shopShelves', shopId],
    queryFn: async () => {
      const result = await shopService.getShelves(shopId!)
      return result
    },
    enabled: !!shopId
  })

  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['shopOrders', shopId, orderStatusFilter],
    queryFn: async () => {
      const result = await orderService.getShopOrders(shopId!, { 
        status: orderStatusFilter !== 'all' ? orderStatusFilter : undefined 
      })
      return result
    },
    enabled: !!shopId
  })

  const removeMutation = useMutation({
    mutationFn: (itemId: string) => shopService.removeFromInventory(shopId!, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopInventory', shopId] })
      queryClient.invalidateQueries({ queryKey: ['userInventory'] })
      toast.success('物品已从店铺库存移除并还回个人库存')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || '移除失败')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; data: any }) => 
      shopService.updateInventoryItem(shopId!, itemId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopInventory', shopId] })
      toast.success('库存物品已更新')
      setEditDialogOpen(false)
      setSelectedItem(null)
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || '更新失败')
    },
  })

  const toggleListedMutation = useMutation({
    mutationFn: ({ itemId, isListed }: { itemId: string; isListed: boolean }) => 
      shopService.toggleListed(shopId!, itemId, isListed),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['shopInventory', shopId] })
      toast.success(data?.message || '状态已更新')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || '操作失败')
    },
  })

  const addMutation = useMutation({
    mutationFn: ({ inventoryItemId, quantity }: { inventoryItemId: string; quantity: number }) => 
      shopService.addToInventory(shopId!, inventoryItemId, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopInventory', shopId] })
      queryClient.invalidateQueries({ queryKey: ['userInventory'] })
      toast.success('物品已添加到店铺库存')
      setAddDialogOpen(false)
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || '添加失败')
    },
  })

  const addEmployeeMutation = useMutation({
    mutationFn: ({ email, role }: { email: string; role: string }) => 
      shopService.addEmployee(shopId!, email, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopEmployees', shopId] })
      toast.success('员工已添加')
      setAddEmployeeDialogOpen(false)
      setNewEmployeeEmail('')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || '添加员工失败')
    },
  })

  const removeEmployeeMutation = useMutation({
    mutationFn: (employeeId: string) => shopService.removeEmployee(shopId!, employeeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopEmployees', shopId] })
      toast.success('员工已移除')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || '移除员工失败')
    },
  })

  const updateShopMutation = useMutation({
    mutationFn: (data: any) => shopService.update(shopId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop', shopId] })
      toast.success('店铺信息更新成功')
      setEditShopDialogOpen(false)
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || '更新店铺失败')
    },
  })

  const createShelfMutation = useMutation({
    mutationFn: (data: any) => shopService.createShelf(shopId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopShelves', shopId] })
      toast.success('货架创建成功')
      setAddShelfDialogOpen(false)
      setShelfForm({ name: '', description: '', location: '', capacity: 0 })
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || '创建货架失败')
    },
  })

  const updateShelfMutation = useMutation({
    mutationFn: ({ shelfId, data }: { shelfId: string; data: any }) => 
      shopService.updateShelf(shopId!, shelfId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopShelves', shopId] })
      toast.success('货架更新成功')
      setEditShelfDialogOpen(false)
      setSelectedShelf(null)
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || '更新货架失败')
    },
  })

  const deleteShelfMutation = useMutation({
    mutationFn: (shelfId: string) => shopService.deleteShelf(shopId!, shelfId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopShelves', shopId] })
      toast.success('货架删除成功')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || '删除货架失败')
    },
  })

  const addItemToShelfMutation = useMutation({
    mutationFn: ({ shelfId, data }: { shelfId: string; data: any }) => 
      shopService.addItemToShelf(shopId!, shelfId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopShelves', shopId] })
      toast.success('物品已添加到货架')
      setAddItemToShelfDialogOpen(false)
      setSelectedShelf(null)
      setShelfItemForm({ inventoryItemId: '', quantity: 1, position: '' })
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || '添加物品到货架失败')
    },
  })

  const updateShelfItemMutation = useMutation({
    mutationFn: ({ shelfId, itemId, data }: { shelfId: string; itemId: string; data: any }) => 
      shopService.updateShelfItem(shopId!, shelfId, itemId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopShelves', shopId] })
      toast.success('货架物品更新成功')
      setEditShelfItemDialogOpen(false)
      setSelectedShelf(null)
      setSelectedShelfItem(null)
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || '更新货架物品失败')
    },
  })

  const removeItemFromShelfMutation = useMutation({
    mutationFn: ({ shelfId, itemId }: { shelfId: string; itemId: string }) => 
      shopService.removeItemFromShelf(shopId!, shelfId, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopShelves', shopId] })
      toast.success('物品已从货架移除')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || '移除物品失败')
    },
  })

  const confirmOrderMutation = useMutation({
    mutationFn: (orderId: string) => orderService.confirmOrder(shopId!, orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopOrders', shopId] })
      queryClient.invalidateQueries({ queryKey: ['shopInventory', shopId] })
      toast.success('订单已确认，库存已扣减')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || '确认订单失败')
    },
  })

  const completeOrderMutation = useMutation({
    mutationFn: (orderId: string) => orderService.completeOrder(shopId!, orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopOrders', shopId] })
      toast.success('订单已完成')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || '完成订单失败')
    },
  })

  const cancelOrderMutation = useMutation({
    mutationFn: ({ orderId, reason }: { orderId: string; reason?: string }) =>
      orderService.cancelOrder(orderId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopOrders', shopId] })
      toast.success('订单已取消')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || '取消订单失败')
    },
  })

  const handleContactCustomer = (order: Order) => {
    // 获取订单用户信息
    const user = typeof order.user === 'object' ? order.user : null
    if (user && user._id) {
      navigate(`/messages?friendId=${user._id}`)
    } else {
      toast.error('无法联系顾客')
    }
  }

  const shop: Shop = shopData?.data || {} as Shop
  const inventory: ShopInventoryItem[] = inventoryData?.data || []
  const employees: ShopEmployee[] = employeesData?.data || []
  const shelves: Shelf[] = shelvesData?.data || []
  const userInventory = userInventoryData?.data || []
  const orders: Order[] = ordersData?.data || []

  const STATUS_MAP: Record<string, { label: string; color: string }> = {
    pending: { label: '待确认', color: 'bg-yellow-100 text-yellow-800' },
    confirmed: { label: '已确认', color: 'bg-blue-100 text-blue-800' },
    completed: { label: '已完成', color: 'bg-green-100 text-green-800' },
    cancelled: { label: '已取消', color: 'bg-red-100 text-red-800' },
  }

  const filteredInventory = inventory.filter(item => 
    item.template?.itemName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.template?.runeCardInfo?.cardNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredEmployees = employees.filter(emp => 
    emp.user.username.toLowerCase().includes(employeeSearch.toLowerCase()) ||
    emp.user.email.toLowerCase().includes(employeeSearch.toLowerCase())
  )

  const getRarityColor = (rarity: string) => {
    const colors: Record<string, string> = {
      'N': 'bg-gray-100 text-gray-700',
      'N_FOIL': 'bg-gray-200 text-gray-800',
      'U': 'bg-blue-100 text-blue-700',
      'U_FOIL': 'bg-blue-200 text-blue-800',
      'R': 'bg-purple-100 text-purple-700',
      'E': 'bg-orange-100 text-orange-700',
      'AA': 'bg-red-100 text-red-700',
      'AA_SIGN': 'bg-red-200 text-red-800',
      'AA_ULTIMATE': 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white',
      'common': 'bg-gray-100 text-gray-700',
      'uncommon': 'bg-green-100 text-green-700',
      'rare': 'bg-blue-100 text-blue-700',
      'super_rare': 'bg-purple-100 text-purple-700',
      'ultra_rare': 'bg-red-100 text-red-700',
      'secret_rare': 'bg-gradient-to-r from-pink-500 to-purple-500 text-white',
      'other': 'bg-gray-100 text-gray-700'
    }
    return colors[rarity] || 'bg-gray-100 text-gray-700'
  }

  const handleEdit = (item: ShopInventoryItem) => {
    setSelectedItem(item)
    setEditForm({
      quantity: item.quantity,
      price: item.price
    })
    setEditDialogOpen(true)
  }

  const handleUpdate = () => {
    if (!selectedItem) return
    updateMutation.mutate({
      itemId: selectedItem._id,
      data: editForm
    })
  }

  const handleAddEmployee = () => {
    if (!newEmployeeEmail.trim()) {
      toast.error('请输入员工邮箱')
      return
    }
    addEmployeeMutation.mutate({ email: newEmployeeEmail, role: newEmployeeRole })
  }

  const handleEditShop = () => {
    setEditShopForm({
      name: shop.name || '',
      description: shop.description || '',
      logo: shop.logo || '',
      coverImage: shop.coverImage || '',
      location: {
        address: shop.location?.address || '',
        city: shop.location?.city || '',
        province: shop.location?.province || '',
        postalCode: shop.location?.postalCode || ''
      },
      contactInfo: {
        phone: shop.contactInfo?.phone || '',
        email: shop.contactInfo?.email || '',
        website: shop.contactInfo?.website || '',
        socialMedia: {
          wechat: shop.contactInfo?.socialMedia?.wechat || '',
          qq: shop.contactInfo?.socialMedia?.qq || ''
        }
      },
      businessHours: {
        openTime: shop.businessHours?.openTime || '09:00',
        closeTime: shop.businessHours?.closeTime || '21:00',
        workdays: shop.businessHours?.workdays || []
      }
    })
    setEditShopDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/shops')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{shop.name} - 店铺管理</h1>
            <p className="text-muted-foreground">管理店铺的员工和库存</p>
          </div>
        </div>
        <Button onClick={handleEditShop}>
          <Edit className="w-4 h-4 mr-2" />
          编辑店铺
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="inventory">
            <Boxes className="w-4 h-4 mr-2" />
            库存管理
          </TabsTrigger>
          <TabsTrigger value="shelves">
            <LayoutDashboard className="w-4 h-4 mr-2" />
            货架管理
          </TabsTrigger>
          <TabsTrigger value="orders">
            <ShoppingCart className="w-4 h-4 mr-2" />
            订单管理
          </TabsTrigger>
          <TabsTrigger value="employees">
            <Users className="w-4 h-4 mr-2" />
            员工管理
          </TabsTrigger>
          <TabsTrigger value="signing">
            <Briefcase className="w-4 h-4 mr-2" />
            签约管理
          </TabsTrigger>
        </TabsList>

        {/* 库存管理标签页 */}
        <TabsContent value="inventory" className="space-y-6">
          {/* 统计卡片 */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">库存总量</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{inventoryData?.stats?.totalQuantity || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">物品种类</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{inventory.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">库存价值</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(inventory.reduce((sum, item) => sum + (item.price * item.quantity), 0))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 搜索栏和添加按钮 */}
          <div className="flex gap-4 flex-wrap">
            <Card className="flex-1 min-w-[300px]">
              <CardContent className="p-4">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="搜索物品..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              添加物品
            </Button>
          </div>

          {/* 库存列表 */}
          {inventoryLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredInventory.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Boxes className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">暂无库存物品</p>
                <Button variant="outline" className="mt-4" onClick={() => setAddDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  添加物品
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredInventory.map((item) => (
                <Card key={item._id} className={`overflow-hidden ${!item.isListed ? 'opacity-60 bg-gray-50' : ''}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Package className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            {item.template?.itemName}
                            {!item.isListed && (
                              <Badge variant="outline" className="text-gray-500 bg-gray-100">
                                已下架
                              </Badge>
                            )}
                          </CardTitle>
                          {item.template?.runeCardInfo?.cardNumber && (
                            <p className="text-sm text-muted-foreground">编号: {item.template.runeCardInfo.cardNumber}</p>
                          )}
                        </div>
                      </div>
                      <Badge className={getRarityColor(item.template?.rarity)}>{item.template?.rarity}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {item.addedBy?.username && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">来源</span>
                          <span className="text-sm">来源于 {item.addedBy.username}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">数量</span>
                        <span className="font-bold">{item.quantity}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">单价</span>
                        <span className="font-bold">{formatCurrency(item.price)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">总价</span>
                        <span className="font-bold text-primary">{formatCurrency(item.price * item.quantity)}</span>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleEdit(item)}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          编辑
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className={item.isListed 
                            ? 'text-orange-500 hover:text-orange-600 hover:bg-orange-500/10' 
                            : 'text-green-500 hover:text-green-600 hover:bg-green-500/10'}
                          onClick={() => {
                            if (item.isListed) {
                              toggleListedMutation.mutate({ itemId: item._id, isListed: false })
                            } else {
                              setSelectedItem(item)
                              setListItemForm({ shelfId: '', quantity: 1, position: '' })
                              setListItemDialogOpen(true)
                            }
                          }}
                          disabled={toggleListedMutation.isPending}
                        >
                          {item.isListed ? '下架' : '上架'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                          onClick={() => {
                            if (window.confirm('确定要从店铺库存中移除这个物品吗？')) {
                              removeMutation.mutate(item._id)
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* 员工管理标签页 */}
        <TabsContent value="employees" className="space-y-6">
          {/* 统计卡片 */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">员工总数</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{employees.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">经营者</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{employees.filter(e => e.role === 'owner').length}</div>
              </CardContent>
            </Card>
          </div>

          {/* 搜索栏和添加按钮 */}
          <div className="flex gap-4 flex-wrap">
            <Card className="flex-1 min-w-[300px]">
              <CardContent className="p-4">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="搜索员工姓名或邮箱..."
                    className="pl-10"
                    value={employeeSearch}
                    onChange={(e) => setEmployeeSearch(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
            {canManageEmployees() && (
              <Button onClick={() => setAddEmployeeDialogOpen(true)}>
                <UserPlus className="w-4 h-4 mr-2" />
                添加员工
              </Button>
            )}
          </div>

          {/* 员工列表 */}
          {employeesLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredEmployees.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">暂无员工</p>
                <Button variant="outline" className="mt-4" onClick={() => setAddEmployeeDialogOpen(true)}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  添加员工
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {filteredEmployees.map((employee) => (
                    <div key={employee._id} className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{employee.user.username}</p>
                          <p className="text-sm text-muted-foreground">{employee.user.email}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline">
                              {employee.role === 'owner' || employee.role === 'operator' ? '经营者' : '店员'}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              加入于 {new Date(employee.hiredAt).toLocaleDateString('zh-CN')}
                            </span>
                          </div>
                        </div>
                      </div>
                      {canManageEmployees() && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                          disabled={employee.role === 'owner' && (typeof employee.user === 'string' ? employee.user === shop.owner : employee.user._id === shop.owner)}
                          onClick={() => {
                            if (window.confirm('确定要移除这个员工吗？')) {
                              removeEmployeeMutation.mutate(employee._id)
                            }
                          }}
                        >
                          <UserX className="w-4 h-4 mr-2" />
                          移除
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 货架管理标签页 */}
        <TabsContent value="shelves" className="space-y-6">
          {/* 统计卡片 */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">货架数量</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{shelves.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">上架物品</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {shelves.reduce((sum, shelf) => sum + shelf.items.length, 0)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">总容量</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {shelves.reduce((sum, shelf) => sum + shelf.capacity, 0)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 添加货架按钮 */}
          <div className="flex justify-end">
            <Button onClick={() => setAddShelfDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              新增货架
            </Button>
          </div>

          {/* 货架列表 */}
          {shelvesLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : shelves.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <LayoutDashboard className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">暂无货架</p>
                <Button variant="outline" className="mt-4" onClick={() => setAddShelfDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  创建货架
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {shelves.map((shelf) => (
                <Card key={shelf._id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                          <LayoutDashboard className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{shelf.name}</CardTitle>
                          {shelf.description && (
                            <p className="text-sm text-muted-foreground">{shelf.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Package className="w-3 h-3" />
                          {shelf.items.length}/{shelf.capacity || '∞'}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedShelf(shelf)
                            setEditShelfForm({
                              name: shelf.name,
                              description: shelf.description,
                              capacity: shelf.capacity
                            })
                            setEditShelfDialogOpen(true)
                          }}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          编辑
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                          onClick={() => {
                            if (window.confirm('确定要删除这个货架吗？')) {
                              deleteShelfMutation.mutate(shelf._id)
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          删除
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* 货架物品 */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">上架物品</h4>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedShelf(shelf)
                            setShelfItemForm({ inventoryItemId: '', quantity: 1 })
                            setAddItemToShelfDialogOpen(true)
                          }}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          添加物品
                        </Button>
                      </div>
                      
                      {shelf.items.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          暂无上架物品
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {shelf.items.map((item) => (
                            <Card key={item._id} className="border">
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                      <Package className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                      <p className="font-medium">{item.inventoryItem?.template?.itemName}</p>
                                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                        {item.inventoryItem?.template?.runeCardInfo?.cardNumber && (
                                          <span>编号: {item.inventoryItem.template.runeCardInfo.cardNumber}</span>
                                        )}
                                        <span>数量: {item.quantity}</span>
                                        <span className="text-primary font-medium">
                                          {formatCurrency(item.inventoryItem?.price)}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedShelf(shelf)
                                        setSelectedShelfItem(item)
                                        setEditShelfItemForm({
                                          quantity: item.quantity
                                        })
                                        setEditShelfItemDialogOpen(true)
                                      }}
                                    >
                                      <Edit className="w-4 h-4 mr-1" />
                                      编辑
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                      onClick={() => {
                                        if (window.confirm('确定要从货架移除这个物品吗？')) {
                                          removeItemFromShelfMutation.mutate({
                                            shelfId: shelf._id,
                                            itemId: item._id
                                          })
                                        }
                                      }}
                                    >
                                      <UserX className="w-4 h-4 mr-1" />
                                      移除
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* 订单管理标签页 */}
        <TabsContent value="orders" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">店铺订单</h3>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">状态:</span>
              <div className="flex gap-1">
                {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map(status => (
                  <Button
                    key={status}
                    variant={orderStatusFilter === status ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setOrderStatusFilter(status)}
                  >
                    {status === 'all' ? '全部' : STATUS_MAP[status]?.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {ordersLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : orders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <ShoppingCart className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">暂无订单</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => {
                const statusInfo = STATUS_MAP[order.status]
                return (
                  <Card key={order._id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <ShoppingCart className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{order.orderNumber}</CardTitle>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                              <span>
                                {typeof order.user === 'object' ? order.user.username : '用户'}
                              </span>
                              <span>•</span>
                              <span>{new Date(order.createdAt).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                        <Badge className={statusInfo?.color}>{statusInfo?.label}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {order.items.slice(0, 3).map((item, index) => (
                          <div key={index} className="flex items-center justify-between text-sm">
                            <div>
                              <p className="font-medium">{item.itemName}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatCurrency(item.price)} × {item.quantity}
                              </p>
                            </div>
                            <p className="font-medium">{formatCurrency(item.price * item.quantity)}</p>
                          </div>
                        ))}
                        {order.items.length > 3 && (
                          <p className="text-sm text-muted-foreground">
                            还有 {order.items.length - 3} 件商品...
                          </p>
                        )}
                        
                        <div className="flex items-center justify-between pt-3 border-t">
                          <div className="text-lg font-bold">
                            总计: <span className="text-primary">{formatCurrency(order.totalAmount)}</span>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedOrder(order)
                                setOrderDetailDialogOpen(true)
                              }}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              详情
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleContactCustomer(order)}
                            >
                              <MessageCircle className="w-4 h-4 mr-1" />
                              联系顾客
                            </Button>
                            {order.status === 'pending' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => {
                                    const reason = prompt('请输入取消原因（可选）：')
                                    cancelOrderMutation.mutate({ orderId: order._id, reason: reason || undefined })
                                  }}
                                  disabled={cancelOrderMutation.isPending}
                                >
                                  <XCircle className="w-4 h-4 mr-1" />
                                  取消
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => confirmOrderMutation.mutate(order._id)}
                                  disabled={confirmOrderMutation.isPending}
                                >
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  确认
                                </Button>
                              </>
                            )}
                            {order.status === 'confirmed' && (
                              <Button
                                size="sm"
                                onClick={() => completeOrderMutation.mutate(order._id)}
                                disabled={completeOrderMutation.isPending}
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                完成
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* 签约管理标签页 */}
        <TabsContent value="signing" className="space-y-6">
          {/* 统计卡片 */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">签约战队数</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{signedTeams.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">活跃战队</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{activeTeamsCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">赞助总额</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">{formatCurrency(totalSponsorshipAmount)}</div>
              </CardContent>
            </Card>
          </div>

          {/* 操作按钮和内容 */}
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">战队签约管理</h3>
            <Button onClick={() => setSigningDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              签约新战队
            </Button>
          </div>

          {/* 签约战队列表 */}
          {signedTeamsLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : signedTeams.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Briefcase className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">暂无签约战队</p>
                <Button variant="outline" className="mt-4" onClick={() => setSigningDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  签约新战队
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {signedTeams.map((signedTeam: any) => {
                const statusMap: Record<string, { label: string; color: string }> = {
                  active: { label: '活跃', color: 'bg-green-100 text-green-800' },
                  expired: { label: '已过期', color: 'bg-yellow-100 text-yellow-800' },
                  terminated: { label: '已终止', color: 'bg-red-100 text-red-800' },
                }
                const statusInfo = statusMap[signedTeam.status] || statusMap.active
                
                return (
                  <Card key={signedTeam._id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Users className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{signedTeam.teamInfo?.name || '未知战队'}</CardTitle>
                            {signedTeam.teamInfo?.description && (
                              <p className="text-sm text-muted-foreground mt-1">{signedTeam.teamInfo.description}</p>
                            )}
                          </div>
                        </div>
                        <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">赞助金额:</span>
                          <p className="font-medium">{formatCurrency(signedTeam.sponsorshipAmount || 0)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">赞助类型:</span>
                          <p className="font-medium">
                            {signedTeam.sponsorshipType === 'cash' ? '现金' : 
                             signedTeam.sponsorshipType === 'product' ? '实物' : 
                             signedTeam.sponsorshipType === 'service' ? '服务' : '混合'}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">签约日期:</span>
                          <p className="font-medium">{signedTeam.signedDate ? new Date(signedTeam.signedDate).toLocaleDateString() : '-'}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">合同到期:</span>
                          <p className="font-medium">{signedTeam.contractEnd ? new Date(signedTeam.contractEnd).toLocaleDateString() : '无限制'}</p>
                        </div>
                      </div>
                      {signedTeam.benefits && (
                        <div className="mt-4 pt-4 border-t">
                          <p className="text-sm text-muted-foreground mb-1">权益说明:</p>
                          <p className="text-sm">{signedTeam.benefits}</p>
                        </div>
                      )}
                      {signedTeam.notes && (
                        <div className="mt-2">
                          <p className="text-sm text-muted-foreground mb-1">备注:</p>
                          <p className="text-sm">{signedTeam.notes}</p>
                        </div>
                      )}
                      {signedTeam.contractDocument && (
                        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-blue-600" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-blue-900">合约已上传</p>
                              <p className="text-xs text-blue-700">{signedTeam.contractDocument}</p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-500 hover:text-red-600 border-red-200 hover:border-red-300"
                              onClick={() => handleDeleteContract(signedTeam.team)}
                              disabled={deleteContractMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              删除
                            </Button>
                          </div>
                        </div>
                      )}
                      {signedTeam.status === 'active' && (
                            <div className="mt-4 flex gap-2 flex-wrap">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleEditTeam(signedTeam)}
                              >
                                <Edit className="w-4 h-4 mr-1" />
                                编辑
                              </Button>
                              {!signedTeam.contractDocument ? (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleUploadContract(signedTeam)}
                                >
                                  <Upload className="w-4 h-4 mr-1" />
                                  上传合约
                                </Button>
                              ) : (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleUploadContract(signedTeam)}
                                >
                                  <Upload className="w-4 h-4 mr-1" />
                                  更新合约
                                </Button>
                              )}
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-red-500 hover:text-red-600"
                                onClick={() => handleDeleteTeam(signedTeam.team)}
                                disabled={deleteSignTeamMutation.isPending}
                              >
                                <UserX className="w-4 h-4 mr-1" />
                                解除签约
                              </Button>
                            </div>
                          )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* 签约管理对话框 */}
      <SigningManagementDialog
        open={signingDialogOpen}
        onOpenChange={setSigningDialogOpen}
        type="shop"
        shopId={shopId}
        onSuccess={() => {
          refetchSignedTeams()
        }}
      />
      
      {/* 编辑战队签约对话框 */}
      {editSignTeamOpen && (
        <SignTeamDialog
          open={editSignTeamOpen}
          onOpenChange={(open) => {
            setEditSignTeamOpen(open)
            if (!open) setEditingTeam(null)
          }}
          shopId={shopId}
          mode="edit"
          existingTeam={editingTeam}
          onSuccess={() => {
            refetchSignedTeams()
          }}
        />
      )}
      
      {/* 合约上传对话框 */}
      <Dialog open={contractUploadOpen} onOpenChange={(open) => {
        setContractUploadOpen(open)
        if (!open) {
          setSelectedContractFile(null)
          setSelectedContractTeam(null)
        }
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {selectedContractTeam?.contractDocument ? '更新战队合约' : '上传战队合约'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedContractTeam && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">战队: {selectedContractTeam.teamInfo?.name || '未知战队'}</p>
                {selectedContractTeam.contractDocument && (
                  <p className="text-sm text-muted-foreground mt-1">
                    当前合约: {selectedContractTeam.contractDocument}
                  </p>
                )}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="contract-file">选择合约文件</Label>
              <Input
                id="contract-file"
                type="file"
                accept=".pdf"
                onChange={handleContractFileChange}
              />
              {selectedContractFile && (
                <p className="text-sm text-muted-foreground">
                  已选择: {selectedContractFile.name}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                只支持 PDF 格式，最大 50MB
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setContractUploadOpen(false)
              setSelectedContractFile(null)
              setSelectedContractTeam(null)
            }}>
              取消
            </Button>
            <Button 
              onClick={handleSubmitContract}
              disabled={!selectedContractFile || uploadContractMutation.isPending}
            >
              {uploadContractMutation.isPending ? '上传中...' : (selectedContractTeam?.contractDocument ? '更新合约' : '上传合约')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 添加物品对话框 */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>添加物品到店铺库存</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground">从您的个人库存中选择物品添加到店铺</p>

            {/* 搜索和过滤 */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="搜索物品名称或编号..."
                  className="pl-10"
                  value={userInventorySearch}
                  onChange={(e) => setUserInventorySearch(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg flex-wrap">
                <div className="flex items-center gap-2">
                  <Switch
                    id="show-zero"
                    checked={showZeroQuantity}
                    onCheckedChange={setShowZeroQuantity}
                  />
                  <Label htmlFor="show-zero">
                    {showZeroQuantity ? '显示全部物品' : '只显示有货物品'}
                  </Label>
                </div>

                <div className="flex items-center gap-2">
                  <Label htmlFor="rarity">稀有度:</Label>
                  <Select value={selectedRarity} onValueChange={setSelectedRarity}>
                    <SelectTrigger id="rarity" className="w-[180px]">
                      <SelectValue placeholder="选择稀有度" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部</SelectItem>
                      <SelectItem value="N">N</SelectItem>
                      <SelectItem value="N_FOIL">N-闪</SelectItem>
                      <SelectItem value="U">U</SelectItem>
                      <SelectItem value="U_FOIL">U-闪</SelectItem>
                      <SelectItem value="R">R</SelectItem>
                      <SelectItem value="E">E</SelectItem>
                      <SelectItem value="AA">AA</SelectItem>
                      <SelectItem value="AA_SIGN">AA-签名</SelectItem>
                      <SelectItem value="AA_ULTIMATE">AA-终极</SelectItem>
                      <SelectItem value="common">普通</SelectItem>
                      <SelectItem value="uncommon">非普通</SelectItem>
                      <SelectItem value="rare">稀有</SelectItem>
                      <SelectItem value="super_rare">超级稀有</SelectItem>
                      <SelectItem value="ultra_rare">超稀有</SelectItem>
                      <SelectItem value="secret_rare">隐藏稀有</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="text-sm text-muted-foreground ml-auto">
                  共 {userInventory.length} 种物品
                </div>
              </div>
            </div>

            {/* 物品列表 */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {userInventory.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  {userInventorySearch ? '没有找到匹配的物品' : '您的个人库存中没有物品'}
                </p>
              ) : (
                userInventory.map((item: any) => (
                  <div
                    key={item._id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <Package className="w-8 h-8 text-primary" />
                      <div>
                        <p className="font-medium">{item.itemName}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {item.itemCode && (
                            <span className="font-mono">编号: {item.itemCode}</span>
                          )}
                          <span>拥有: {item.userQuantity}</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => addMutation.mutate({ inventoryItemId: item._id, quantity: 1 })}
                      disabled={item.userQuantity <= 0}
                    >
                      添加
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑物品对话框 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>编辑库存物品</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{selectedItem.template?.itemName}</p>
                {selectedItem.template?.runeCardInfo?.cardNumber && (
                  <p className="text-sm text-muted-foreground">编号: {selectedItem.template.runeCardInfo.cardNumber}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  其他属性由库存模板管理，不可直接编辑
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">数量</label>
                  <Input
                    type="number"
                    min="0"
                    value={editForm.quantity}
                    onChange={(e) => setEditForm({ ...editForm, quantity: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">单价</label>
                  <Input
                    type="number"
                    min="0"
                    value={editForm.price}
                    onChange={(e) => setEditForm({ ...editForm, price: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 添加员工对话框 */}
      <Dialog open={addEmployeeDialogOpen} onOpenChange={setAddEmployeeDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>添加员工</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">员工邮箱</label>
              <Input
                type="email"
                placeholder="请输入员工的邮箱地址"
                value={newEmployeeEmail}
                onChange={(e) => setNewEmployeeEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">职位</label>
              <Select value={newEmployeeRole} onValueChange={setNewEmployeeRole}>
                <SelectTrigger>
                  <SelectValue placeholder="选择职位" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">店员</SelectItem>
                  <SelectItem value="operator">经营者</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>经营者</strong>：拥有店铺全部管理权限<br />
                <strong>店员</strong>：只拥有上架下架的权限
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddEmployeeDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleAddEmployee} disabled={addEmployeeMutation.isPending}>
              {addEmployeeMutation.isPending ? '添加中...' : '添加员工'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 创建货架对话框 */}
      <Dialog open={addShelfDialogOpen} onOpenChange={setAddShelfDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>创建新货架</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">货架名称 *</label>
              <Input
                placeholder="例如: 卡牌展示架A"
                value={shelfForm.name}
                onChange={(e) => setShelfForm({ ...shelfForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">容量</label>
              <Input
                type="number"
                min="0"
                placeholder="0表示不限容量"
                value={shelfForm.capacity || ''}
                onChange={(e) => setShelfForm({ ...shelfForm, capacity: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">描述</label>
              <Textarea
                placeholder="货架描述"
                value={shelfForm.description}
                onChange={(e) => setShelfForm({ ...shelfForm, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddShelfDialogOpen(false)}>
              取消
            </Button>
            <Button 
              onClick={() => createShelfMutation.mutate(shelfForm)}
              disabled={createShelfMutation.isPending}
            >
              {createShelfMutation.isPending ? '创建中...' : '创建货架'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑货架对话框 */}
      <Dialog open={editShelfDialogOpen} onOpenChange={setEditShelfDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>编辑货架</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">货架名称 *</label>
              <Input
                value={editShelfForm.name}
                onChange={(e) => setEditShelfForm({ ...editShelfForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">容量</label>
              <Input
                type="number"
                min="0"
                value={editShelfForm.capacity || ''}
                onChange={(e) => setEditShelfForm({ ...editShelfForm, capacity: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">描述</label>
              <Textarea
                value={editShelfForm.description}
                onChange={(e) => setEditShelfForm({ ...editShelfForm, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditShelfDialogOpen(false)}>
              取消
            </Button>
            <Button 
              onClick={() => updateShelfMutation.mutate({
                shelfId: selectedShelf!._id,
                data: editShelfForm
              })}
              disabled={updateShelfMutation.isPending}
            >
              {updateShelfMutation.isPending ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 添加物品到货架对话框 */}
      <Dialog open={addItemToShelfDialogOpen} onOpenChange={setAddItemToShelfDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>添加物品到货架</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">从店铺库存中选择物品添加到货架</p>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">选择物品 *</label>
                <Select 
                  value={shelfItemForm.inventoryItemId} 
                  onValueChange={(value) => setShelfItemForm({ ...shelfItemForm, inventoryItemId: value, quantity: 1 })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择物品" />
                  </SelectTrigger>
                  <SelectContent>
                    {inventory.map((item) => {
                      const totalOnShelves = getTotalOnShelves(item._id)
                      const available = item.quantity - totalOnShelves
                      return (
                        <SelectItem key={item._id} value={item._id}>
                          {item.template?.itemName} - 库存: {item.quantity} - 已上架: {totalOnShelves} - 可上架: {available}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
              {shelfItemForm.inventoryItemId && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">数量</label>
                  {(() => {
                    const selectedInventoryItem = inventory.find(i => i._id === shelfItemForm.inventoryItemId)
                    if (!selectedInventoryItem) return null
                    const totalOnShelves = getTotalOnShelves(shelfItemForm.inventoryItemId)
                    const available = selectedInventoryItem.quantity - totalOnShelves
                    return (
                      <>
                        <Input
                          type="number"
                          min="1"
                          max={available}
                          value={shelfItemForm.quantity}
                          onChange={(e) => setShelfItemForm({ 
                            ...shelfItemForm, 
                            quantity: Math.min(
                              Math.max(1, parseInt(e.target.value) || 1), 
                              available
                            )
                          })}
                        />
                        {available <= 0 && (
                          <p className="text-sm text-red-500">库存已全部上架</p>
                        )}
                      </>
                    )
                  })()}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddItemToShelfDialogOpen(false)}>
              取消
            </Button>
            <Button 
              onClick={() => addItemToShelfMutation.mutate({
                shelfId: selectedShelf!._id,
                data: shelfItemForm
              })}
              disabled={(() => {
                if (addItemToShelfMutation.isPending || !shelfItemForm.inventoryItemId) return true
                const selectedInventoryItem = inventory.find(i => i._id === shelfItemForm.inventoryItemId)
                if (!selectedInventoryItem) return true
                const totalOnShelves = getTotalOnShelves(shelfItemForm.inventoryItemId)
                const available = selectedInventoryItem.quantity - totalOnShelves
                return available <= 0
              })()}
            >
              {addItemToShelfMutation.isPending ? '添加中...' : '添加到货架'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 上架到货架对话框 */}
      <Dialog open={listItemDialogOpen} onOpenChange={setListItemDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>上架商品到货架</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{selectedItem.template?.itemName}</p>
                {selectedItem.template?.runeCardInfo?.cardNumber && (
                  <p className="text-sm text-muted-foreground">编号: {selectedItem.template.runeCardInfo.cardNumber}</p>
                )}
                <p className="text-sm text-muted-foreground mt-1">库存数量: {selectedItem.quantity}</p>
                <p className="text-sm text-muted-foreground">已上架: {getTotalOnShelves(selectedItem._id)}</p>
                <p className="text-sm text-primary font-medium">
                  可上架: {selectedItem.quantity - getTotalOnShelves(selectedItem._id)}
                </p>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">选择货架 *</label>
                  {shelves.length === 0 ? (
                    <div className="p-3 border rounded-lg text-center text-muted-foreground">
                      暂无可选货架，请先创建货架
                    </div>
                  ) : (
                    <Select 
                      value={listItemForm.shelfId} 
                      onValueChange={(value) => setListItemForm({ ...listItemForm, shelfId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择货架" />
                      </SelectTrigger>
                      <SelectContent>
                        {shelves.map((shelf) => (
                          <SelectItem key={shelf._id} value={shelf._id}>
                            {shelf.name} ({shelf.items.length}/{shelf.capacity || '∞'})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">数量</label>
                  <Input
                    type="number"
                    min="1"
                    max={selectedItem.quantity - getTotalOnShelves(selectedItem._id)}
                    value={listItemForm.quantity}
                    onChange={(e) => setListItemForm({ 
                      ...listItemForm, 
                      quantity: Math.min(
                        Math.max(1, parseInt(e.target.value) || 1), 
                        selectedItem.quantity - getTotalOnShelves(selectedItem._id)
                      )
                    })}
                  />
                  {(selectedItem.quantity - getTotalOnShelves(selectedItem._id)) <= 0 && (
                    <p className="text-sm text-red-500">库存已全部上架</p>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setListItemDialogOpen(false)}>
              取消
            </Button>
            <Button 
              onClick={() => {
                if (selectedItem) {
                  addItemToShelfMutation.mutate({
                    shelfId: listItemForm.shelfId,
                    data: {
                      inventoryItemId: selectedItem._id,
                      quantity: listItemForm.quantity
                    }
                  }, {
                    onSuccess: () => {
                      toggleListedMutation.mutate({ itemId: selectedItem._id, isListed: true })
                      setListItemDialogOpen(false)
                    }
                  })
                }
              }}
              disabled={
                addItemToShelfMutation.isPending || 
                !listItemForm.shelfId || 
                shelves.length === 0 || 
                (selectedItem && selectedItem.quantity - getTotalOnShelves(selectedItem._id) <= 0)
              }
            >
              {addItemToShelfMutation.isPending ? '上架中...' : '上架'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑货架物品对话框 */}
      <Dialog open={editShelfItemDialogOpen} onOpenChange={setEditShelfItemDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>编辑货架物品</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedShelfItem && (
              <div className="space-y-4">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-medium">{selectedShelfItem.inventoryItem?.template?.itemName}</p>
                  {selectedShelfItem.inventoryItem?.template?.runeCardInfo?.cardNumber && (
                    <p className="text-sm text-muted-foreground">编号: {selectedShelfItem.inventoryItem.template.runeCardInfo.cardNumber}</p>
                  )}
                  {selectedShelfItem.inventoryItem && (
                    <>
                      <p className="text-sm text-muted-foreground mt-1">
                        库存数量: {selectedShelfItem.inventoryItem.quantity}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        当前上架: {selectedShelfItem.quantity}
                      </p>
                      {(() => {
                        const totalOnShelves = getTotalOnShelves(selectedShelfItem.inventoryItem._id)
                        const available = selectedShelfItem.inventoryItem.quantity - totalOnShelves + selectedShelfItem.quantity
                        return (
                          <>
                            <p className="text-sm text-muted-foreground">
                              已上架其他货架: {totalOnShelves - selectedShelfItem.quantity}
                            </p>
                            <p className="text-sm text-primary font-medium">
                              最大可设: {available}
                            </p>
                          </>
                        )
                      })()}
                    </>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">数量</label>
                  {selectedShelfItem.inventoryItem && (
                    <>
                      <Input
                        type="number"
                        min="1"
                        max={(() => {
                          const totalOnShelves = getTotalOnShelves(selectedShelfItem.inventoryItem._id)
                          return selectedShelfItem.inventoryItem.quantity - totalOnShelves + selectedShelfItem.quantity
                        })()}
                        value={editShelfItemForm.quantity}
                        onChange={(e) => setEditShelfItemForm({ 
                          ...editShelfItemForm, 
                          quantity: Math.min(
                            Math.max(1, parseInt(e.target.value) || 1), 
                            (() => {
                              const totalOnShelves = getTotalOnShelves(selectedShelfItem.inventoryItem!._id)
                              return selectedShelfItem.inventoryItem!.quantity - totalOnShelves + selectedShelfItem.quantity
                            })()
                          )
                        })}
                      />
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditShelfItemDialogOpen(false)}>
              取消
            </Button>
            <Button 
              onClick={() => updateShelfItemMutation.mutate({
                shelfId: selectedShelf!._id,
                itemId: selectedShelfItem!._id,
                data: editShelfItemForm
              })}
              disabled={updateShelfItemMutation.isPending}
            >
              {updateShelfItemMutation.isPending ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑店铺对话框 */}
      <Dialog open={editShopDialogOpen} onOpenChange={setEditShopDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>编辑店铺</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">店铺名称 *</label>
              <Input
                placeholder="请输入店铺名称"
                value={editShopForm.name}
                onChange={(e) => setEditShopForm({ ...editShopForm, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">店铺描述</label>
              <Textarea
                placeholder="请输入店铺描述"
                value={editShopForm.description}
                onChange={(e) => setEditShopForm({ ...editShopForm, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Logo 地址</label>
              <Input
                placeholder="请输入 Logo 图片地址"
                value={editShopForm.logo}
                onChange={(e) => setEditShopForm({ ...editShopForm, logo: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">封面图片地址</label>
              <Input
                placeholder="请输入封面图片地址"
                value={editShopForm.coverImage}
                onChange={(e) => setEditShopForm({ ...editShopForm, coverImage: e.target.value })}
              />
            </div>

            <div className="border-t pt-4">
              <h3 className="text-lg font-medium mb-4">店铺位置</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">详细地址</label>
                  <Input
                    placeholder="请输入详细地址"
                    value={editShopForm.location.address}
                    onChange={(e) => setEditShopForm({ 
                      ...editShopForm, 
                      location: { ...editShopForm.location, address: e.target.value } 
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">城市</label>
                  <Input
                    placeholder="请输入城市"
                    value={editShopForm.location.city}
                    onChange={(e) => setEditShopForm({ 
                      ...editShopForm, 
                      location: { ...editShopForm.location, city: e.target.value } 
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">省份</label>
                  <Input
                    placeholder="请输入省份"
                    value={editShopForm.location.province}
                    onChange={(e) => setEditShopForm({ 
                      ...editShopForm, 
                      location: { ...editShopForm.location, province: e.target.value } 
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">邮编</label>
                  <Input
                    placeholder="请输入邮编"
                    value={editShopForm.location.postalCode}
                    onChange={(e) => setEditShopForm({ 
                      ...editShopForm, 
                      location: { ...editShopForm.location, postalCode: e.target.value } 
                    })}
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="text-lg font-medium mb-4">联系方式</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">联系电话</label>
                  <Input
                    placeholder="请输入联系电话"
                    value={editShopForm.contactInfo.phone}
                    onChange={(e) => setEditShopForm({ 
                      ...editShopForm, 
                      contactInfo: { ...editShopForm.contactInfo, phone: e.target.value } 
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">联系邮箱</label>
                  <Input
                    placeholder="请输入联系邮箱"
                    type="email"
                    value={editShopForm.contactInfo.email}
                    onChange={(e) => setEditShopForm({ 
                      ...editShopForm, 
                      contactInfo: { ...editShopForm.contactInfo, email: e.target.value } 
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">网站</label>
                  <Input
                    placeholder="请输入网站地址"
                    value={editShopForm.contactInfo.website}
                    onChange={(e) => setEditShopForm({ 
                      ...editShopForm, 
                      contactInfo: { ...editShopForm.contactInfo, website: e.target.value } 
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">微信号</label>
                  <Input
                    placeholder="请输入微信号"
                    value={editShopForm.contactInfo.socialMedia.wechat}
                    onChange={(e) => setEditShopForm({ 
                      ...editShopForm, 
                      contactInfo: { 
                        ...editShopForm.contactInfo, 
                        socialMedia: { ...editShopForm.contactInfo.socialMedia, wechat: e.target.value } 
                      } 
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">QQ号</label>
                  <Input
                    placeholder="请输入QQ号"
                    value={editShopForm.contactInfo.socialMedia.qq}
                    onChange={(e) => setEditShopForm({ 
                      ...editShopForm, 
                      contactInfo: { 
                        ...editShopForm.contactInfo, 
                        socialMedia: { ...editShopForm.contactInfo.socialMedia, qq: e.target.value } 
                      } 
                    })}
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="text-lg font-medium mb-4">营业时间</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">开门时间</label>
                  <Input
                    type="time"
                    value={editShopForm.businessHours.openTime}
                    onChange={(e) => setEditShopForm({ 
                      ...editShopForm, 
                      businessHours: { ...editShopForm.businessHours, openTime: e.target.value } 
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">关门时间</label>
                  <Input
                    type="time"
                    value={editShopForm.businessHours.closeTime}
                    onChange={(e) => setEditShopForm({ 
                      ...editShopForm, 
                      businessHours: { ...editShopForm.businessHours, closeTime: e.target.value } 
                    })}
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditShopDialogOpen(false)}>
              取消
            </Button>
            <Button 
              onClick={() => updateShopMutation.mutate(editShopForm)}
              disabled={updateShopMutation.isPending || !editShopForm.name.trim()}
            >
              {updateShopMutation.isPending ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 订单详情对话框 */}
      <Dialog open={orderDetailDialogOpen} onOpenChange={setOrderDetailDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>订单详情</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">订单号</p>
                  <p className="font-medium">{selectedOrder.orderNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">状态</p>
                  <Badge className={STATUS_MAP[selectedOrder.status]?.color}>
                    {STATUS_MAP[selectedOrder.status]?.label}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">订购用户</p>
                  <p className="font-medium">
                    {typeof selectedOrder.user === 'object' ? selectedOrder.user.username : '用户'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">下单时间</p>
                  <p className="font-medium">{new Date(selectedOrder.createdAt).toLocaleString()}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">商品列表</h4>
                <div className="space-y-2">
                  {selectedOrder.items.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">{item.itemName}</p>
                        <p className="text-sm text-muted-foreground">
                          单价: {formatCurrency(item.price)} × {item.quantity}件
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(item.price * item.quantity)}</p>
                        <p className="text-xs text-muted-foreground">单品总价</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between text-lg font-bold">
                  <span>订单总计</span>
                  <span className="text-primary">{formatCurrency(selectedOrder.totalAmount)}</span>
                </div>
              </div>

              {selectedOrder.notes && (
                <div className="border-t pt-4">
                  <p className="text-sm text-muted-foreground">备注</p>
                  <p className="mt-1">{selectedOrder.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            {selectedOrder && (
              <Button variant="outline" onClick={() => handleContactCustomer(selectedOrder)}>
                <MessageCircle className="w-4 h-4 mr-1" />
                联系顾客
              </Button>
            )}
            <Button variant="outline" onClick={() => setOrderDetailDialogOpen(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
