import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { shopService, Shop } from '@/services/api'
import { inventoryService, InventoryItem } from '@/services/inventory'

import { toast } from 'sonner'
import { Search, Plus, Trash2, ArrowLeft, Edit, Grid3X3, List, Package } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

const GAME_TYPES = [
  { id: 'rune', name: '符文战场', color: 'bg-red' },
  { id: 'shadowverse-evolve', name: '影之诗进化对决', color: 'bg-purple' },
]

const ITEM_TYPE_MAP: Record<string, string> = {
  'card': '卡牌',
  '卡牌': '卡牌',
  'booster': '补充包',
  '补充包': '补充包',
  'accessory': '周边',
  '周边': '周边',
}

const RARITY_MAP: Record<string, string> = {
  'N': '普通',
  'N_FOIL': '普通（闪）',
  'U': '不凡',
  'U_FOIL': '不凡（闪）',
  'R': '稀有',
  'E': '史诗',
  'AA': '异画',
  'AA_SIGN': '异画（签字）',
  'AA_ULTIMATE': '异画（终极超编）',
  'common': '普通',
  'uncommon': '不凡',
  'rare': '稀有',
  'super_rare': '超级稀有',
  'ultra_rare': '超稀有',
  'secret_rare': '隐藏稀有',
}

const GAME_TYPE_MAP: Record<string, { name: string; color: string }> = {
  'rune': { name: '符文战场', color: 'bg-red-600' },
  'shadowverse-evolve': { name: '影之诗进化对决', color: 'bg-purple-600' },
}

const SOURCE_MAP: Record<string, string> = {
  'personal_inventory': '个人库存',
  'purchase': '采购',
  'trade': '交易',
  'other': '其他',
}

const getRarityDisplay = (rarity: string) => RARITY_MAP[rarity] || rarity
const getItemTypeDisplay = (type: string) => ITEM_TYPE_MAP[type] || type
const getSourceDisplay = (source: string) => SOURCE_MAP[source] || source

// 辅助函数：获取游戏类型数组（支持新旧数据格式）
const getGameTypes = (gameType: string | string[] | undefined): string[] => {
  if (!gameType) return []
  if (Array.isArray(gameType)) return gameType
  return [gameType]
}

// 辅助函数：获取背景渐变类名
const getBackgroundGradient = (gameType: string | string[] | undefined) => {
  const types = getGameTypes(gameType)
  if (types.length === 0) return 'from-primary/10 to-accent/10'
  
  const firstType = types[0]
  if (firstType === 'rune') return 'from-red-500/10 to-red-300/10'
  if (firstType === 'shadowverse-evolve') return 'from-purple-500/10 to-purple-300/10'
  
  return 'from-primary/10 to-accent/10'
}

interface ShopInventoryItem {
  _id: string;
  template: {
    _id: string;
    itemName: string;
    rarity: string;
    itemType: string;
    gameType?: string | string[];
    images?: string[];
    runeCardInfo?: {
      version?: string;
      cardNumber?: string;
    };
    cardProperty?: string;
    value?: number;
    description?: string;
  };
  quantity: number;
  price: number;
  shop: string;
  addedBy?: { _id: string; username: string };
  source?: 'personal_inventory' | 'purchase' | 'trade' | 'other';
  sourceNote?: string;
  createdAt: string;
  updatedAt: string;
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
  const [editForm, setEditForm] = useState({ quantity: 0, price: 0 })
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const queryClient = useQueryClient()

  const { data: shopData } = useQuery({
    queryKey: ['shop', shopId],
    queryFn: () => shopService.getById(shopId!),
    enabled: !!shopId
  })

  const { data: inventoryData, isLoading } = useQuery({
    queryKey: ['shopInventory', shopId, searchTerm],
    queryFn: async () => {
      console.log('=== 前端请求店铺库存，shopId:', shopId);
      const result = await shopService.getInventory(shopId!, { search: searchTerm });
      console.log('=== 后端返回结果:', JSON.stringify(result, null, 2));
      return result;
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

  const shop: Shop = shopData?.data || {} as Shop
  const inventory: ShopInventoryItem[] = inventoryData?.data || []
  
  // 添加安全检查，只保留有模板的项
  const validInventory = inventory.filter(item => item.template)
  console.log('=== 有效店铺库存数据:', inventory.length, '项，其中有模板的:', validInventory.length, '项');

  const filteredInventory = validInventory.filter(item => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return (
      item.template.itemName.toLowerCase().includes(term) ||
      item.template.runeCardInfo?.cardNumber?.toLowerCase().includes(term)
    )
  })

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
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
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">库存总量</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventoryData?.stats?.totalQuantity || validInventory.reduce((sum, item) => sum + item.quantity, 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">物品种类</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{validInventory.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">库存价值</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(inventoryData?.stats?.totalValue || validInventory.reduce((sum, item) => sum + (item.price * item.quantity), 0))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 搜索和视图切换栏 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索物品名称或编号..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center border rounded-md">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-r-none"
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-l-none"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
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
            <p className="text-muted-foreground">暂无库存物品</p>
            <Button variant="outline" className="mt-4" onClick={() => setAddDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              添加物品
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredInventory.map((item) => {
            const gameTypes = getGameTypes(item.template.gameType)
            const displayGameTypes = gameTypes.map(type => GAME_TYPE_MAP[type]).filter(Boolean)
            
            return (
              <Card key={item._id} className="overflow-hidden card-hover group">
                <div className={`aspect-[3/4] bg-gradient-to-br ${getBackgroundGradient(item.template.gameType)} relative overflow-hidden`}>
                  {item.template.images && item.template.images.length > 0 ? (
                    <img
                      src={item.template.images[0]}
                      alt={item.template.itemName}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-6xl opacity-20">🎴</span>
                    </div>
                  )}
                  {item.template.rarity && (
                    <div className="absolute top-2 right-2">
                      <Badge variant={item.template.rarity === 'UR' ? 'default' : item.template.rarity === 'SR' ? 'secondary' : 'outline'}>
                        {getRarityDisplay(item.template.rarity)}
                      </Badge>
                    </div>
                  )}
                  {displayGameTypes.length > 0 && (
                    <div className="absolute bottom-2 left-2 flex gap-1 flex-wrap">
                      {displayGameTypes.map((game, idx) => (
                        <Badge key={idx} className={`${game.color} text-white text-xs`}>
                          {game.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold truncate">{item.template.itemName}</h3>
                  {gameTypes.includes('rune') && item.template.runeCardInfo?.cardNumber && (
                    <div className="text-xs text-muted-foreground mt-1">编号: {item.template.runeCardInfo.cardNumber}</div>
                  )}
                  {gameTypes.includes('rune') && item.template.cardProperty && item.template.cardProperty !== '无' && (
                    <div className="text-xs text-muted-foreground mt-1">属性: {item.template.cardProperty}</div>
                  )}
                  {item.addedBy?.username && (
                    <div className="text-xs text-muted-foreground mt-1">来源于 {item.addedBy.username}</div>
                  )}
                  <div className="flex items-center justify-between mt-2 text-sm text-muted-foreground">
                    <span>{getItemTypeDisplay(item.template.itemType)}</span>
                    <span>x{item.quantity}</span>
                  </div>
                  <div className="flex items-center justify-end mt-3">
                    <span className="font-bold text-primary">{formatCurrency(item.price)}</span>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEdit(item)}>
                      <Edit className="w-3 h-3 mr-1" />
                      编辑
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-500 hover:text-red-600"
                      onClick={() => {
                        if (window.confirm('确定要从店铺库存中移除这个物品吗？')) {
                          removeMutation.mutate(item._id)
                        }
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="p-4 text-left">物品</th>
                    <th className="p-4 text-center">编号</th>
                    <th className="p-4 text-center">稀有度</th>
                    <th className="p-4 text-center">属性</th>
                    <th className="p-4 text-center">添加者</th>
                    <th className="p-4 text-center">数量</th>
                    <th className="p-4 text-center">价格</th>
                    <th className="p-4 text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInventory.map((item) => {
                    const gameTypes = getGameTypes(item.template.gameType);
                    const displayGameTypes = gameTypes.map(type => GAME_TYPE_MAP[type]).filter(Boolean);
                    return (
                    <tr key={item._id} className="border-t hover:bg-muted/30 transition-colors">
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          <span className="font-medium">{item.template.itemName}</span>
                          {displayGameTypes.length > 0 && (
                            <div className="flex gap-1 flex-wrap">
                              {displayGameTypes.map((game, idx) => (
                                <Badge key={idx} className={`${game.color} text-white text-xs`}>{game.name}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-center text-muted-foreground">{gameTypes.includes('rune') ? item.template.runeCardInfo?.cardNumber || '-' : '-'}</td>
                      <td className="p-4 text-center">{item.template.rarity ? <Badge variant="outline">{getRarityDisplay(item.template.rarity)}</Badge> : '-'}</td>
                      <td className="p-4 text-center text-muted-foreground">{gameTypes.includes('rune') ? (item.template.cardProperty && item.template.cardProperty !== '无' ? item.template.cardProperty : '-') : '-'}</td>
                      <td className="p-4 text-center text-muted-foreground">{item.addedBy?.username || '-'}</td>
                      <td className="p-4 text-center font-medium">{item.quantity}</td>
                      <td className="p-4 text-center font-medium">{formatCurrency(item.price)}</td>
                      <td className="p-4 text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500"
                          onClick={() => {
                            if (window.confirm('确定要从店铺库存中移除这个物品吗？')) {
                              removeMutation.mutate(item._id)
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
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
                <p className="font-medium">{selectedItem.template.itemName}</p>
                {selectedItem.template.runeCardInfo?.cardNumber && (
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
    </div>
  )
}