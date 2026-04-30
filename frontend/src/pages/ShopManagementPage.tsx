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
import { shopService, Shop } from '@/services/api'
import { inventoryService } from '@/services/inventory'
import { toast } from 'sonner'
import { Package, Search, Plus, Trash2, ArrowLeft, Boxes, Edit, Users, UserPlus, UserX, LayoutDashboard, MoveUpRight } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface ShopInventoryItem {
  _id: string
  itemName: string
  itemCode?: string
  itemType: string
  rarity: string
  quantity: number
  price: number
  condition?: string
  description?: string
  gameType?: string
  addedBy?: { _id: string; username: string }
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
  addedBy: {
    _id: string
    username: string
  }
}

interface ShelfItem {
  _id: string
  inventoryItem: {
    _id: string
    itemName: string
    itemCode?: string
    price: number
  }
  quantity: number
  position: string
  addedAt: string
}

interface Shelf {
  _id: string
  name: string
  description: string
  location: string
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
  const [selectedItem, setSelectedItem] = useState<ShopInventoryItem | null>(null)
  const [selectedShelf, setSelectedShelf] = useState<Shelf | null>(null)
  const [selectedShelfItem, setSelectedShelfItem] = useState<ShelfItem | null>(null)
  const [editForm, setEditForm] = useState({ quantity: 0, price: 0, condition: '', description: '' })
  const [shelfForm, setShelfForm] = useState({ name: '', description: '', location: '', capacity: 0 })
  const [shelfItemForm, setShelfItemForm] = useState({ inventoryItemId: '', quantity: 1, position: '' })
  const [editShelfForm, setEditShelfForm] = useState({ name: '', description: '', location: '', capacity: 0 })
  const [editShelfItemForm, setEditShelfItemForm] = useState({ quantity: 1, position: '' })
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

  const removeMutation = useMutation({
    mutationFn: (itemId: string) => shopService.removeFromInventory(shopId!, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopInventory', shopId] })
      toast.success('物品已从店铺库存移除')
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

  const addMutation = useMutation({
    mutationFn: ({ inventoryItemId, quantity }: { inventoryItemId: string; quantity: number }) => 
      shopService.addToInventory(shopId!, inventoryItemId, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopInventory', shopId] })
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

  const shop: Shop = shopData?.data || {} as Shop
  const inventory: ShopInventoryItem[] = inventoryData?.data || []
  const employees: ShopEmployee[] = employeesData?.data || []
  const shelves: Shelf[] = shelvesData?.data || []
  const userInventory = userInventoryData?.data || []

  const filteredInventory = inventory.filter(item => 
    item.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.itemCode?.toLowerCase().includes(searchTerm.toLowerCase())
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
      price: item.price,
      condition: item.condition || '',
      description: item.description || ''
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
          <TabsTrigger value="employees">
            <Users className="w-4 h-4 mr-2" />
            员工管理
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
                <Card key={item._id} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Package className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{item.itemName}</CardTitle>
                          {item.itemCode && (
                            <p className="text-sm text-muted-foreground">编号: {item.itemCode}</p>
                          )}
                        </div>
                      </div>
                      <Badge className={getRarityColor(item.rarity)}>{item.rarity}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
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
                      {item.condition && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">品相</span>
                          <Badge variant="outline">{item.condition}</Badge>
                        </div>
                      )}
                      {item.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                      )}
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
            <Button onClick={() => setAddEmployeeDialogOpen(true)}>
              <UserPlus className="w-4 h-4 mr-2" />
              添加员工
            </Button>
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
                            <Badge variant="outline">{employee.role === 'owner' ? '经营者' : '店员'}</Badge>
                            <span className="text-xs text-muted-foreground">
                              加入于 {new Date(employee.hiredAt).toLocaleDateString('zh-CN')}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                        onClick={() => {
                          if (window.confirm('确定要移除这个员工吗？')) {
                            removeEmployeeMutation.mutate(employee._id)
                          }
                        }}
                      >
                        <UserX className="w-4 h-4 mr-2" />
                        移除
                      </Button>
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
                          {shelf.location && (
                            <p className="text-sm text-muted-foreground">位置: {shelf.location}</p>
                          )}
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
                              location: shelf.location,
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
                            setShelfItemForm({ inventoryItemId: '', quantity: 1, position: '' })
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
                                      <p className="font-medium">{item.inventoryItem.itemName}</p>
                                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                        {item.inventoryItem.itemCode && (
                                          <span>编号: {item.inventoryItem.itemCode}</span>
                                        )}
                                        <span>数量: {item.quantity}</span>
                                        {item.position && <span>位置: {item.position}</span>}
                                        <span className="text-primary font-medium">
                                          {formatCurrency(item.inventoryItem.price)}
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
                                          quantity: item.quantity,
                                          position: item.position
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
      </Tabs>

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
                <p className="font-medium">{selectedItem.itemName}</p>
                {selectedItem.itemCode && (
                  <p className="text-sm text-muted-foreground">编号: {selectedItem.itemCode}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">数量</label>
                  <Input
                    type="number"
                    min="1"
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
              <div className="space-y-2">
                <label className="text-sm font-medium">品相</label>
                <Input
                  value={editForm.condition}
                  onChange={(e) => setEditForm({ ...editForm, condition: e.target.value })}
                  placeholder="例如: mint, near_mint, excellent"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">描述</label>
                <Textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="物品描述"
                  rows={3}
                />
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
                  <SelectItem value="owner">经营者</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>经营者</strong>：拥有全部权限<br />
                <strong>店员</strong>：只能查看库存和处理销售
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
              <label className="text-sm font-medium">位置</label>
              <Input
                placeholder="例如: 入口左侧"
                value={shelfForm.location}
                onChange={(e) => setShelfForm({ ...shelfForm, location: e.target.value })}
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
              <label className="text-sm font-medium">位置</label>
              <Input
                value={editShelfForm.location}
                onChange={(e) => setEditShelfForm({ ...editShelfForm, location: e.target.value })}
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
                  onValueChange={(value) => setShelfItemForm({ ...shelfItemForm, inventoryItemId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择物品" />
                  </SelectTrigger>
                  <SelectContent>
                    {inventory.map((item) => (
                      <SelectItem key={item._id} value={item._id}>
                        {item.itemName} - 库存: {item.quantity}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">数量</label>
                  <Input
                    type="number"
                    min="1"
                    value={shelfItemForm.quantity}
                    onChange={(e) => setShelfItemForm({ ...shelfItemForm, quantity: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">位置</label>
                  <Input
                    placeholder="例如: 第一层左边"
                    value={shelfItemForm.position}
                    onChange={(e) => setShelfItemForm({ ...shelfItemForm, position: e.target.value })}
                  />
                </div>
              </div>
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
              disabled={addItemToShelfMutation.isPending || !shelfItemForm.inventoryItemId}
            >
              {addItemToShelfMutation.isPending ? '添加中...' : '添加到货架'}
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
                  <p className="font-medium">{selectedShelfItem.inventoryItem.itemName}</p>
                  {selectedShelfItem.inventoryItem.itemCode && (
                    <p className="text-sm text-muted-foreground">编号: {selectedShelfItem.inventoryItem.itemCode}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">数量</label>
                  <Input
                    type="number"
                    min="1"
                    value={editShelfItemForm.quantity}
                    onChange={(e) => setEditShelfItemForm({ ...editShelfItemForm, quantity: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">位置</label>
                  <Input
                    placeholder="例如: 第一层左边"
                    value={editShelfItemForm.position}
                    onChange={(e) => setEditShelfItemForm({ ...editShelfItemForm, position: e.target.value })}
                  />
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
    </div>
  )
}
