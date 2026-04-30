import { useState, useRef, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, Grid3X3, List, Upload, Download, Trash2, Edit, SlidersHorizontal, Eye, EyeOff } from 'lucide-react'
import { inventoryService, InventoryItem } from '@/services/inventory'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import { InventoryFormDialog } from '@/components/inventory/InventoryFormDialog'
import { InventoryFilterDialog } from '@/components/inventory/InventoryFilterDialog'
import { UserInventoryEditDialog } from '@/components/inventory/UserInventoryEditDialog'
import { useAuth } from '@/contexts/AuthContext'

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
  { id: 'digimon', name: '数码宝贝', color: 'bg-blue' },
  { id: 'pokemon', name: '宝可梦', color: 'bg-green' },
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

const getRarityDisplay = (rarity: string) => RARITY_MAP[rarity] || rarity
const getItemTypeDisplay = (type: string) => ITEM_TYPE_MAP[type] || type

export function InventoryPage() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchTerm, setSearchTerm] = useState('')
  const [showZeroQuantity, setShowZeroQuantity] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin'

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

  // Fetch inventory items with pagination and filters
  const { data: inventoryData, isLoading } = useQuery({
    queryKey: ['inventory', debouncedSearch, page, selectedGame, filters.rarity.join(','), filters.itemType.join(','), filters.priceMin, filters.priceMax, filters.version, filters.cardProperty.join(','), showZeroQuantity, sortBy, sortOrder],
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

  // Excel import mutation
  const importMutation = useMutation({
    mutationFn: (file: File) => inventoryService.importExcel(file),
    onSuccess: () => {
      // 精确失效所有inventory相关查询
      queryClient.invalidateQueries({ 
        queryKey: ['inventory'],
        exact: false 
      })
      queryClient.invalidateQueries({ queryKey: ['inventoryStats'] })
      toast.success('导入成功')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || '导入失败'
      toast.error(message)
    },
  })

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      importMutation.mutate(file)
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      const blob = await inventoryService.downloadTemplate()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'inventory_template.xlsx'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      toast.success('模板下载成功')
    } catch (error) {
      toast.error('下载模板失败')
    }
  }

  const clearMutation = useMutation({
    mutationFn: () => inventoryService.clearAll(),
    onSuccess: (data) => {
      toast.success(data.message || '数据已清空')
      // 精确失效所有inventory相关查询
      queryClient.invalidateQueries({ 
        queryKey: ['inventory'],
        exact: false // 这将失效所有以 'inventory' 开头的查询
      })
      queryClient.invalidateQueries({ queryKey: ['inventoryStats'] })
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || '清空失败'
      toast.error(message)
    },
  })

  const handleClearAll = () => {
    clearMutation.mutate()
  }

  const exportMutation = useMutation({
    mutationFn: () => inventoryService.exportExcel(),
    onSuccess: (data) => {
      const url = window.URL.createObjectURL(new Blob([data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'inventory_export.xlsx')
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.success('导出成功')
    },
    onError: () => {
      toast.error('导出失败')
    },
  })

  const handleExport = () => {
    exportMutation.mutate()
  }

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      if (!id) {
        throw new Error('物品ID无效')
      }
      return inventoryService.delete(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['inventoryStats'] })
      toast.success('物品已删除')
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || error?.message || '删除失败'
      toast.error(message)
    },
  })

  const updateQuantityMutation = useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) => {
      return inventoryService.updateUserInventory(itemId, { quantity })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['inventoryStats'] })
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || '更新失败'
      toast.error(message)
    },
  })

  const handleQuantityChange = (item: InventoryItem, delta: number) => {
    const currentQuantity = item.userQuantity ?? item.quantity ?? 0
    const newQuantity = Math.max(0, currentQuantity + delta)
    const itemId = item._id?.toString() || String(item.id)
    updateQuantityMutation.mutate({ itemId, quantity: newQuantity })
  }

  const items: InventoryItem[] = inventoryData?.data || []
  const stats = statsData?.data

  // Memoized sort - 只保留排序逻辑，筛选全部在后端完成
  const filteredItems = useMemo(() => {
    let result = [...items]

    // Sort by card number for rune cards (numeric sorting)
    result.sort((a, b) => {
      if (a.gameType === 'rune' && b.gameType === 'rune') {
        const aNum = a.runeCardInfo?.cardNumber || ''
        const bNum = b.runeCardInfo?.cardNumber || ''

        // Extract numeric part from card number (e.g., "001" -> 1, "R-001" -> 1)
        const extractNumber = (str: string) => {
          const match = str.match(/\d+/)
          return match ? parseInt(match[0], 10) : 0
        }

        const aNumeric = extractNumber(aNum)
        const bNumeric = extractNumber(bNum)

        if (aNumeric !== bNumeric) {
          return aNumeric - bNumeric
        }

        // If numeric parts are equal, compare as strings
        return aNum.localeCompare(bNum)
      }
      return 0
    })

    return result
  }, [items])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">库存管理</h1>
          <p className="text-muted-foreground mt-1">管理你的卡牌收藏</p>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <>
              <Button 
                variant="outline" 
                onClick={() => fileInputRef.current?.click()}
                disabled={importMutation.isPending}
              >
                <Upload className="w-4 h-4 mr-2" />
                {importMutation.isPending ? '导入中...' : 'Excel导入'}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImport}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={handleDownloadTemplate}
              >
                <Download className="w-4 h-4 mr-2" />
                下载模板
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (window.confirm('此操作将删除所有卡牌数据，且无法撤销。确定要继续吗？')) {
                    handleClearAll()
                  }
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                清空数据
              </Button>
            </>
          )}
          {isAdmin && (
            <Button variant="premium" onClick={() => { setEditingItem(null); setFormOpen(true) }}>
              <Plus className="w-4 h-4 mr-2" />
              添加物品
            </Button>
          )}
          {isAdmin && (
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={exportMutation.isPending}
            >
              <Download className="w-4 h-4 mr-2" />
              {exportMutation.isPending ? '导出中...' : '导出数据'}
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">总物品数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? '...' : stats?.totalItems || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">总数量</CardTitle>
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
        <Card className="border-blue-500/30 hover:border-blue-400">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-600">数码宝贝</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? '...' : stats?.digimonCount || 0}</div>
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
        <Card className="border-green-500/30 hover:border-green-400">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">宝可梦</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? '...' : stats?.pokemonCount || 0}</div>
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
          {showZeroQuantity ? '显示全部' : '显示我拥有的'}
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
            const gameType = GAME_TYPES.find(g => g.id === item.gameType)
            return (
            <Card key={item.id} className="overflow-hidden card-hover group">
              <div className={`aspect-[3/4] bg-gradient-to-br ${item.gameType === 'digimon' ? 'from-blue-500/10 to-blue-300/10' : item.gameType === 'rune' ? 'from-red-500/10 to-red-300/10' : item.gameType === 'pokemon' ? 'from-green-500/10 to-green-300/10' : item.gameType === 'shadowverse-evolve' ? 'from-purple-500/10 to-purple-300/10' : 'from-primary/10 to-accent/10'} relative overflow-hidden`}>
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
                {gameType && (
                  <div className="absolute bottom-2 left-2">
                    <Badge className={`${item.gameType === 'digimon' ? 'bg-blue-600' : item.gameType === 'rune' ? 'bg-red-600' : item.gameType === 'pokemon' ? 'bg-green-600' : item.gameType === 'shadowverse-evolve' ? 'bg-purple-600' : 'bg-gray-600'} text-white text-xs`}>
                      {gameType.name}
                    </Badge>
                  </div>
                )}
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold truncate">{item.itemName || item.name}</h3>
                {item.gameType === 'rune' && item.runeCardInfo?.cardNumber && (
                  <div className="text-xs text-muted-foreground mt-1">编号: {item.runeCardInfo.cardNumber}</div>
                )}
                {item.gameType === 'rune' && item.cardProperty && item.cardProperty !== '无' && (
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
                    <span className="w-8 text-center">x{item.userQuantity ?? item.quantity}</span>
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
                  {isAdmin ? (
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => { setEditingItem(item); setFormOpen(true) }}>
                      <Edit className="w-3 h-3 mr-1" />
                      编辑
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => { setEditingItem(item); setUserEditOpen(true) }}>
                      <Edit className="w-3 h-3 mr-1" />
                      编辑
                    </Button>
                  )}
                  {isAdmin && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-red-500 hover:text-red-600"
                      onClick={() => deleteMutation.mutate(String(item.id))}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
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
                  const gameType = GAME_TYPES.find(g => g.id === item.gameType)
                  return (
                  <tr key={item.id} className="border-t hover:bg-muted/30 transition-colors">
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">{item.itemName || item.name}</span>
                        {gameType && (
                          <span className="text-xs text-muted-foreground">{gameType.name}</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-center text-muted-foreground">{item.gameType === 'rune' ? item.runeCardInfo?.cardNumber || '-' : '-'}</td>
                    <td className="p-4 text-center">{item.rarity ? <Badge variant="outline">{getRarityDisplay(item.rarity)}</Badge> : '-'}</td>
                    <td className="p-4 text-center text-muted-foreground">{item.gameType === 'rune' ? (item.cardProperty && item.cardProperty !== '无' ? item.cardProperty : '-') : '-'}</td>
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
                        <span className="w-8 text-center">{item.userQuantity ?? item.quantity}</span>
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
                      {isAdmin ? (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => { setEditingItem(item); setFormOpen(true) }}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500"
                            onClick={() => deleteMutation.mutate(String(item.id))}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => { setEditingItem(item); setUserEditOpen(true) }}>
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
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

      <InventoryFormDialog 
        open={formOpen} 
        onOpenChange={setFormOpen} 
        item={editingItem} 
      />
      <UserInventoryEditDialog
        open={userEditOpen && editingItem !== null}
        onClose={() => setUserEditOpen(false)}
        item={editingItem || ({ itemName: '', quantity: 0, value: 0 } as InventoryItem)}
      />
    </div>
  )
}
