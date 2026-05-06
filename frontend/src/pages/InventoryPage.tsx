import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Search, Grid3X3, List, Edit, SlidersHorizontal, Eye, EyeOff, Trash2, AlertTriangle } from 'lucide-react'
import { inventoryService, InventoryItem } from '@/services/inventory'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import { InventoryFilterDialog } from '@/components/inventory/InventoryFilterDialog'
import { UserInventoryEditDialog } from '@/components/inventory/UserInventoryEditDialog'

interface FilterState {
  rarity: string[];
  itemType: string[];
  priceMin: string;
  priceMax: string;
  version: string;
  cardProperty: string[];
}

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
  'secret_rare': '秘稀有',
}

const GAME_TYPE_MAP: Record<string, { name: string; color: string }> = {
  'rune': { name: '符文战场', color: 'bg-red-600' },
  'shadowverse-evolve': { name: '影之诗进化对决', color: 'bg-purple-600' },
}

const getRarityDisplay = (rarity: string) => RARITY_MAP[rarity] || rarity
const getItemTypeDisplay = (type: string) => ITEM_TYPE_MAP[type] || type

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

export function InventoryPage() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchTerm, setSearchTerm] = useState('')
  const [showZeroQuantity, setShowZeroQuantity] = useState(true)
  const [userEditOpen, setUserEditOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [selectedGame, setSelectedGame] = useState<string>('')
  const [filters, setFilters] = useState<FilterState>({
    rarity: [],
    itemType: [],
    priceMin: '',
    priceMax: '',
    version: '',
    cardProperty: [],
  })
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState<'userQuantity' | 'userValue' | 'runeCardInfo.cardNumber' | 'createdAt'>('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false)
  const queryClient = useQueryClient()
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [pendingUpdates, setPendingUpdates] = useState<Record<string, number>>({})

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // 当选择全部游戏时，重置所有筛选条件
  useEffect(() => {
    if (!selectedGame) {
      setFilters({
        rarity: [],
        itemType: [],
        priceMin: '',
        priceMax: '',
        version: '',
        cardProperty: [],
      })
    }
  }, [selectedGame])

  // Stable query key using JSON.stringify for arrays
  const queryKey = useMemo(() => [
    'inventory',
    debouncedSearch,
    page,
    selectedGame,
    JSON.stringify(filters.rarity),
    JSON.stringify(filters.itemType),
    filters.priceMin,
    filters.priceMax,
    filters.version,
    JSON.stringify(filters.cardProperty),
    showZeroQuantity,
    sortBy,
    sortOrder,
  ], [debouncedSearch, page, selectedGame, filters, showZeroQuantity, sortBy, sortOrder])

  // Fetch inventory items with pagination and filters
  const { data: inventoryData, isLoading } = useQuery({
    queryKey,
    queryFn: () => inventoryService.getAll({ 
      search: debouncedSearch, 
      page,
      gameType: selectedGame || undefined,
      rarity: filters.rarity.length > 0 ? filters.rarity.join(',') : undefined,
      itemType: filters.itemType.length > 0 ? filters.itemType.join(',') : undefined,
      priceMin: filters.priceMin || undefined,
      priceMax: filters.priceMax || undefined,
      version: filters.version || undefined,
      cardProperty: filters.cardProperty.length > 0 ? filters.cardProperty.join(',') : undefined,
      showZeroQuantity: showZeroQuantity ? 'true' : 'false',
      sort: sortBy,
      order: sortOrder,
    }),
  })

  // Fetch stats
  const { data: statsData } = useQuery({
    queryKey: ['inventoryStats'],
    queryFn: () => inventoryService.getStats(),
  })

  // 清空用户库存 mutation
  const clearUserInventoryMutation = useMutation({
    mutationFn: () => inventoryService.clearUserInventory(),
    onSuccess: (data) => {
      toast.success(data?.message || '个人库存已清空')
      queryClient.invalidateQueries({ queryKey: ['inventory'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['inventoryStats'] })
      setClearConfirmOpen(false)
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || '清空失败'
      toast.error(message)
    },
  })

  const updateQuantityMutation = useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) => {
      return inventoryService.updateUserInventory(itemId, { quantity })
    },
    onMutate: async ({ itemId, quantity }) => {
      await queryClient.cancelQueries({ queryKey: ['inventory'] })
      const previousData = queryClient.getQueryData(queryKey)
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return old
        return {
          ...old,
          data: old.data.map((item: InventoryItem) => 
            (item._id?.toString() || String(item.id)) === itemId 
              ? { ...item, userQuantity: quantity }
              : item
          )
        }
      })
      return { previousData }
    },
    onError: (error: any, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData)
      }
      const message = error?.response?.data?.message || '更新失败'
      toast.error(message)
    },
    onSettled: () => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['inventory'] })
        queryClient.invalidateQueries({ queryKey: ['inventoryStats'] })
      }, 1000)
    },
  })

  const handleQuantityChange = (item: InventoryItem, delta: number) => {
    const itemId = item._id?.toString() || String(item.id)
    const currentQuantity = (pendingUpdates[itemId] ?? item.userQuantity ?? item.quantity ?? 0)
    const newQuantity = Math.max(0, currentQuantity + delta)
    setPendingUpdates(prev => ({ ...prev, [itemId]: newQuantity }))
    updateQuantityMutation.mutate({ itemId, quantity: newQuantity })
  }

  const getDisplayQuantity = (item: InventoryItem) => {
    const itemId = item._id?.toString() || String(item.id)
    return pendingUpdates[itemId] ?? item.userQuantity ?? item.quantity ?? 0
  }

  const items: InventoryItem[] = inventoryData?.data || []
  const stats = statsData?.data

  // Memoized sort - 只保留排序逻辑，筛选全部在后端完成
  const filteredItems = useMemo(() => {
    return items
  }, [items])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">个人库存管理</h1>
          <p className="text-muted-foreground mt-1">管理你的个人卡牌收藏</p>
        </div>
        <Button
          variant="destructive"
          onClick={() => setClearConfirmOpen(true)}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          清空我的库存
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">种类总数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? '...' : stats?.totalItems || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">物品总数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? '...' : stats?.totalQuantity || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">总价值</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? '...' : formatCurrency(stats?.totalValue || 0)}</div>
          </CardContent>
        </Card>
        <Card className="border-red-500/30 hover:border-red-400">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600">符文战场</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? '...' : stats?.runeCount || 0}</div>
          </CardContent>
        </Card>
        <Card className="border-purple-500/30 hover:border-purple-400">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-600">影之诗进化对决</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? '...' : stats?.shadowverseEvolveCount || 0}</div>
          </CardContent>
        </Card>
        
      </div>

      {/* Game Type Filter */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={selectedGame === '' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedGame('')}
        >
          全部游戏
        </Button>
        {GAME_TYPES.map((game) => (
          <Button
            key={game.id}
            variant={selectedGame === game.id ? 'default' : 'outline'}
            size="sm"
            className={`${selectedGame === game.id ? 'bg-purple-600 hover:bg-purple-700' : ''}`}
            onClick={() => setSelectedGame(selectedGame === game.id ? '' : game.id)}
          >
            {game.name}
          </Button>
        ))}
        <div className="flex-1" />
        <Button
          variant={showZeroQuantity ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowZeroQuantity(!showZeroQuantity)}
          className={showZeroQuantity ? 'bg-green-600 hover:bg-green-700' : ''}
        >
          {showZeroQuantity ? <Eye className="w-4 h-4 mr-1" /> : <EyeOff className="w-4 h-4 mr-1" />}
          {showZeroQuantity ? '显示全部' : '仅显示有库存'}
        </Button>
      </div>

      {/* Filters and search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="搜索物品..." 
                className="pl-10" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <InventoryFilterDialog 
              onFilter={setFilters} 
              currentFilters={filters}
              selectedGame={selectedGame}
            />
            <div className="flex items-center gap-2">
              <Select
                value={sortBy}
                onValueChange={(value) => {
                  setSortBy(value as typeof sortBy);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="排序" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt">创建时间</SelectItem>
                  <SelectItem value="userQuantity">拥有数量</SelectItem>
                  <SelectItem value="userValue">价格</SelectItem>
                  <SelectItem value="runeCardInfo.cardNumber">编号</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  setPage(1);
                }}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </Button>
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

          {/* Active filters */}
          {(filters.rarity.length > 0 || filters.itemType.length > 0 || filters.priceMin || filters.priceMax) && (
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
              <Badge variant="outline" className="flex items-center gap-1">
                <SlidersHorizontal className="w-3 h-3" />
                筛选条件
              </Badge>
              {filters.rarity.map(r => (
                <Badge key={r} variant="secondary">稀有度: {getRarityDisplay(r)}</Badge>
              ))}
              {filters.itemType.map(t => (
                <Badge key={t} variant="secondary">类型: {getItemTypeDisplay(t)}</Badge>
              ))}
              {filters.priceMin && (
                <Badge key="priceMin" variant="secondary">最低: ¥{filters.priceMin}</Badge>
              )}
              {filters.priceMax && (
                <Badge key="priceMax" variant="secondary">最高: ¥{filters.priceMax}</Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Items grid/list */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredItems.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">暂无物品，点击"添加卡牌"开始</p>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredItems.map((item: InventoryItem) => {
            const gameTypes = getGameTypes(item.gameType)
            const displayGameTypes = gameTypes.map(type => GAME_TYPE_MAP[type]).filter(Boolean)
            
            return (
            <Card key={item.id} className="overflow-hidden card-hover group">
              <div className={`aspect-[3/4] bg-gradient-to-br ${getBackgroundGradient(item.gameType)} relative overflow-hidden`}>
                {item.images && item.images.length > 0 ? (
                  <img
                    src={item.images[0]}
                    alt={item.itemName}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-6xl opacity-20">🎴</span>
                  </div>
                )}
                {item.rarity && (
                  <div className="absolute top-2 right-2">
                    <Badge variant={item.rarity === 'UR' ? 'default' : item.rarity === 'SR' ? 'secondary' : 'outline'}>
                      {getRarityDisplay(item.rarity)}
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
                <h3 className="font-semibold truncate">{item.itemName || item.name}</h3>
                {gameTypes.includes('rune') && item.runeCardInfo?.cardNumber && (
                  <div className="text-xs text-muted-foreground mt-1">编号: {item.runeCardInfo.cardNumber}</div>
                )}
                {gameTypes.includes('rune') && item.cardProperty && item.cardProperty !== '无' && (
                  <div className="text-xs text-muted-foreground mt-1">属性: {item.cardProperty}</div>
                )}
                <div className="flex items-center justify-between mt-2 text-sm text-muted-foreground">
                  <span>{getItemTypeDisplay(item.itemType)}</span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-6 h-6 -ml-2"
                      onClick={() => handleQuantityChange(item, -1)}
                      title="减少数量"
                    >
                      <span className="text-lg leading-none">-</span>
                    </Button>
                    <span className="w-8 text-center">x{getDisplayQuantity(item)}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-6 h-6 -mr-2"
                      onClick={() => handleQuantityChange(item, 1)}
                      title="增加数量"
                    >
                      <span className="text-lg leading-none">+</span>
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-end mt-3">
                  <span className="font-bold text-primary">{formatCurrency(item.userValue ?? item.value)}</span>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => { setEditingItem(item); setUserEditOpen(true) }}>
                    <Edit className="w-3 h-3 mr-1" />
                    编辑
                  </Button>
                </div>
              </CardContent>
            </Card>
          )})}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-medium">物品名称</th>
                  <th className="text-center p-4 font-medium">编号</th>
                  <th className="text-center p-4 font-medium">稀有度</th>
                  <th className="text-center p-4 font-medium">属性</th>
                  <th className="text-center p-4 font-medium">数量</th>
                  <th className="text-center p-4 font-medium">单价</th>
                  <th className="text-right p-4 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item: InventoryItem) => {
                  const gameTypes = getGameTypes(item.gameType);
                  const displayGameTypes = gameTypes.map(type => GAME_TYPE_MAP[type]).filter(Boolean);
                  return (
                  <tr key={item.id} className="border-t hover:bg-muted/30 transition-colors">
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">{item.itemName || item.name}</span>
                        {displayGameTypes.length > 0 && (
                          <div className="flex gap-1 flex-wrap">
                            {displayGameTypes.map((game, idx) => (
                              <span key={idx} className="text-xs text-muted-foreground">{game.name}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-center text-muted-foreground">{gameTypes.includes('rune') ? item.runeCardInfo?.cardNumber || '-' : '-'}</td>
                    <td className="p-4 text-center">{item.rarity ? <Badge variant="outline">{getRarityDisplay(item.rarity)}</Badge> : '-'}</td>
                    <td className="p-4 text-center text-muted-foreground">{gameTypes.includes('rune') ? (item.cardProperty && item.cardProperty !== '无' ? item.cardProperty : '-') : '-'}</td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-6 h-6"
                          onClick={() => handleQuantityChange(item, -1)}
                          title="减少数量"
                        >
                          <span className="text-sm leading-none">-</span>
                        </Button>
                        <span className="w-8 text-center">{getDisplayQuantity(item)}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-6 h-6"
                          onClick={() => handleQuantityChange(item, 1)}
                          title="增加数量"
                        >
                          <span className="text-sm leading-none">+</span>
                        </Button>
                      </div>
                    </td>
                    <td className="p-4 text-center font-medium">{formatCurrency(item.userValue ?? item.value)}</td>
                    <td className="p-4 text-right">
                      <Button variant="ghost" size="sm" onClick={() => { setEditingItem(item); setUserEditOpen(true) }}>
                        <Edit className="w-4 h-4" />
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

      {/* Pagination */}
      {inventoryData?.pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            上一页
          </Button>
          <span className="text-sm text-muted-foreground">
            第 {page} / {inventoryData.pages} 页，共 {inventoryData.total} 条
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= inventoryData.pages}
            onClick={() => setPage(p => p + 1)}
          >
            下一页
          </Button>
        </div>
      )}

      <UserInventoryEditDialog
        open={userEditOpen && editingItem !== null}
        onClose={() => setUserEditOpen(false)}
        item={editingItem || ({ itemName: '', quantity: 0, value: 0 } as InventoryItem)}
      />

      {/* 清空库存确认对话框 */}
      <Dialog open={clearConfirmOpen} onOpenChange={setClearConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              确认清空个人库存？
            </DialogTitle>
            <DialogDescription>
              此操作将把你所有物品的数量设置为 0。此操作不可逆！
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              库存模板数据不会受到影响，只有你个人的物品数量会被清空。
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setClearConfirmOpen(false)}
              disabled={clearUserInventoryMutation.isPending}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => clearUserInventoryMutation.mutate()}
              disabled={clearUserInventoryMutation.isPending}
            >
              {clearUserInventoryMutation.isPending ? '清空中...' : '确认清空'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
