import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, Grid3X3, List, Upload, Trash2, Edit, SlidersHorizontal } from 'lucide-react'
import { inventoryService, InventoryItem } from '@/services/inventory'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import { InventoryFormDialog } from '@/components/inventory/InventoryFormDialog'
import { InventoryFilterDialog } from '@/components/inventory/InventoryFilterDialog'

interface FilterState {
  rarity: string[];
  itemType: string[];
  condition: string[];
  priceMin: string;
  priceMax: string;
}

export function InventoryPage() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchTerm, setSearchTerm] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [filters, setFilters] = useState<FilterState>({
    rarity: [],
    itemType: [],
    condition: [],
    priceMin: '',
    priceMax: '',
  })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  // Fetch inventory items
  const { data: inventoryData, isLoading } = useQuery({
    queryKey: ['inventory', searchTerm],
    queryFn: () => inventoryService.getAll({ search: searchTerm }),
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
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
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

  const items: InventoryItem[] = inventoryData?.data || []
  const stats = statsData?.data

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">库存管理</h1>
          <p className="text-muted-foreground mt-1">管理你的卡牌收藏</p>
        </div>
        <div className="flex items-center gap-3">
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
          <Button variant="premium" onClick={() => { setEditingItem(null); setFormOpen(true) }}>
            <Plus className="w-4 h-4 mr-2" />
            添加卡牌
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
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
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">物品种类</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? '...' : stats?.itemTypes || 0}</div>
          </CardContent>
        </Card>
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
            />
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
          {(filters.rarity.length > 0 || filters.itemType.length > 0 || filters.condition.length > 0 || filters.priceMin || filters.priceMax) && (
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
              <Badge variant="outline" className="flex items-center gap-1">
                <SlidersHorizontal className="w-3 h-3" />
                筛选条件
              </Badge>
              {filters.rarity.map(r => (
                <Badge key={r} variant="secondary">稀有度: {r}</Badge>
              ))}
              {filters.itemType.map(t => (
                <Badge key={t} variant="secondary">类型: {t}</Badge>
              ))}
              {filters.condition.map(c => (
                <Badge key={c} variant="secondary">品相: {c}</Badge>
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
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">暂无物品，点击"添加卡牌"开始</p>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item: InventoryItem) => (
            <Card key={item.id} className="overflow-hidden card-hover group">
              <div className="aspect-[3/4] bg-gradient-to-br from-primary/10 to-accent/10 relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-6xl opacity-20">🎴</span>
                </div>
                {item.rarity && (
                  <div className="absolute top-2 right-2">
                    <Badge variant={item.rarity === 'UR' ? 'default' : item.rarity === 'SR' ? 'secondary' : 'outline'}>
                      {item.rarity}
                    </Badge>
                  </div>
                )}
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold truncate">{item.itemName || item.name}</h3>
                <div className="flex items-center justify-between mt-2 text-sm text-muted-foreground">
                  <span>{item.itemType}</span>
                  <span>x{item.quantity}</span>
                </div>
                <div className="flex items-center justify-between mt-3">
                  {item.condition && (
                    <Badge variant="outline" className="text-xs">{item.condition}</Badge>
                  )}
                  <span className="font-bold text-primary">{formatCurrency(item.value)}</span>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => { setEditingItem(item); setFormOpen(true) }}>
                    <Edit className="w-3 h-3 mr-1" />
                    编辑
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-red-500 hover:text-red-600"
                    onClick={() => deleteMutation.mutate(String(item.id))}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-medium">物品名称</th>
                  <th className="text-left p-4 font-medium">类型</th>
                  <th className="text-left p-4 font-medium">稀有度</th>
                  <th className="text-left p-4 font-medium">数量</th>
                  <th className="text-left p-4 font-medium">状态</th>
                  <th className="text-left p-4 font-medium">单价</th>
                  <th className="text-right p-4 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item: InventoryItem) => (
                  <tr key={item.id} className="border-t hover:bg-muted/30 transition-colors">
                    <td className="p-4 font-medium">{item.itemName || item.name}</td>
                    <td className="p-4 text-muted-foreground">{item.itemType}</td>
                    <td className="p-4">{item.rarity ? <Badge variant="outline">{item.rarity}</Badge> : '-'}</td>
                    <td className="p-4">{item.quantity}</td>
                    <td className="p-4">{item.condition || '-'}</td>
                    <td className="p-4 font-medium">{formatCurrency(item.value)}</td>
                    <td className="p-4 text-right">
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <InventoryFormDialog 
        open={formOpen} 
        onOpenChange={setFormOpen} 
        item={editingItem} 
      />
    </div>
  )
}
