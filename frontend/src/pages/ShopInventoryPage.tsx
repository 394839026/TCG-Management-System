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
import { shopService, Shop } from '@/services/api'
import { inventoryService } from '@/services/inventory'

import { toast } from 'sonner'
import { Package, Search, Plus, Trash2, ArrowLeft, Boxes, Edit } from 'lucide-react'
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

export function ShopInventoryPage() {
  const { id: shopId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [userInventorySearch, setUserInventorySearch] = useState('')
  const [showZeroQuantity, setShowZeroQuantity] = useState(true)
  const [selectedRarity, setSelectedRarity] = useState<string>('all')
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<ShopInventoryItem | null>(null)
  const [editForm, setEditForm] = useState({ quantity: 0, price: 0, condition: '', description: '' })
  const queryClient = useQueryClient()

  const { data: shopData } = useQuery({
    queryKey: ['shop', shopId],
    queryFn: () => shopService.getById(shopId!),
    enabled: !!shopId
  })

  const { data: inventoryData, isLoading } = useQuery({
    queryKey: ['shopInventory', shopId, searchTerm],
    queryFn: async () => {
      const result = await shopService.getInventory(shopId!, { search: searchTerm })
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
        limit: 50 // 限制每页50条
      })
      return result
    },
    staleTime: 5000, // 5秒内认为数据是新鲜的
    cacheTime: 30000 // 缓存30秒
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

  const shop: Shop = shopData?.data || {} as Shop
  const inventory: ShopInventoryItem[] = inventoryData?.data || []
  const userInventory = userInventoryData?.data || []

  const filteredInventory = inventory.filter(item => 
    item.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.itemCode?.toLowerCase().includes(searchTerm.toLowerCase())
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/shops')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{shop.name} - 库存管理</h1>
            <p className="text-muted-foreground">管理店铺的商品库存</p>
          </div>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          添加物品
        </Button>
      </div>

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

      {/* 搜索栏 */}
      <Card>
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

      {/* 库存列表 */}
      {isLoading ? (
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

              <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
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
    </div>
  )
}