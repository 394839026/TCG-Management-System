import { useState, useRef, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Upload, Download, Trash2, Plus, Database, AlertCircle, Edit, Search, Grid3X3, List } from 'lucide-react'
import { inventoryService, InventoryItem } from '@/services/inventory'
import { toast } from 'sonner'
import { InventoryTemplateDialog } from '@/components/inventory/InventoryTemplateDialog'

const GAME_TYPES = [
  { id: 'rune', name: '符文战场', color: 'bg-red-600' },
  { id: 'shadowverse-evolve', name: '影之诗进化对决', color: 'bg-purple-600' },
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

export function InventoryDataManagementPage() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedGame, setSelectedGame] = useState<string>('')
  const [formOpen, setFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [clearing, setClearing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  useEffect(() => {
    if (!selectedGame) {
    }
  }, [selectedGame])

  const queryKey = useMemo(() => [
    'inventory-templates',
    debouncedSearch,
    page,
    selectedGame,
  ], [debouncedSearch, page, selectedGame])

  const { data: inventoryData, isLoading } = useQuery({
    queryKey,
    queryFn: () => inventoryService.getAllTemplates({
      search: debouncedSearch,
      page,
      gameType: selectedGame || undefined,
    }),
  })

  const importMutation = useMutation({
    mutationFn: (file: File) => inventoryService.importExcel(file, true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-templates'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['inventoryStats'] })
      toast.success('导入成功')
      setImporting(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || '导入失败'
      toast.error(message)
      setImporting(false)
    },
  })

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImporting(true)
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
    mutationFn: () => inventoryService.clearAllTemplates(),
    onSuccess: (data) => {
      toast.success(data.message || '数据已清空')
      queryClient.invalidateQueries({ queryKey: ['inventory-templates'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['inventoryStats'] })
      setClearing(false)
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || '清空失败'
      toast.error(message)
      setClearing(false)
    },
  })

  const handleClearAll = () => {
    if (window.confirm('⚠️ 警告：此操作将删除所有库存模板数据，且无法撤销。确定要继续吗？')) {
      setClearing(true)
      clearMutation.mutate()
    }
  }

  const exportMutation = useMutation({
    mutationFn: () => inventoryService.exportExcel(true),
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
      setExporting(false)
    },
    onError: () => {
      toast.error('导出失败')
      setExporting(false)
    },
  })

  const handleExport = () => {
    setExporting(true)
    exportMutation.mutate()
  }

  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      if (!id) {
        throw new Error('物品ID无效')
      }
      return inventoryService.delete(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-templates'] })
      queryClient.invalidateQueries({ queryKey: ['inventoryStats'] })
      toast.success('模板已删除')
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || error?.message || '删除失败'
      toast.error(message)
    },
  })

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item)
    setFormOpen(true)
  }

  const handleAdd = () => {
    setEditingItem(null)
    setFormOpen(true)
  }

  const items: InventoryItem[] = inventoryData?.data || []

  const filteredItems = useMemo(() => {
    return items
  }, [items])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Database className="w-8 h-8 text-red-600" />
            库存模板数据管理
          </h1>
          <p className="text-muted-foreground mt-1">管理库存物品模板数据，不含价格和数量，仅超级管理员可访问</p>
        </div>
      </div>

      <Card className="border-red-500/30">
        <CardHeader className="bg-red-500/10">
          <CardTitle className="flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5" />
            模板管理操作
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg bg-gray-50">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <Upload className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-medium">Excel导入</h3>
                  <p className="text-sm text-muted-foreground">从Excel文件批量导入库存模板</p>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImport}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                className="w-full"
              >
                <Upload className="w-4 h-4 mr-2" />
                {importing ? '导入中...' : '选择文件导入'}
              </Button>
            </div>

            <div className="p-4 border rounded-lg bg-gray-50">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Download className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium">下载模板</h3>
                  <p className="text-sm text-muted-foreground">下载导入模板文件</p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={handleDownloadTemplate}
                className="w-full"
              >
                <Download className="w-4 h-4 mr-2" />
                下载模板
              </Button>
            </div>

            <div className="p-4 border rounded-lg bg-gray-50">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Download className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-medium">导出数据</h3>
                  <p className="text-sm text-muted-foreground">导出所有模板数据到Excel</p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={handleExport}
                disabled={exporting}
                className="w-full"
              >
                <Download className="w-4 h-4 mr-2" />
                {exporting ? '导出中...' : '导出数据'}
              </Button>
            </div>

            <div className="p-4 border rounded-lg bg-gray-50">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Plus className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">添加模板</h3>
                  <p className="text-sm text-muted-foreground">手动添加单个库存模板</p>
                </div>
              </div>
              <Button
                variant="premium"
                onClick={handleAdd}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                添加模板
              </Button>
            </div>

            <div className="p-4 border rounded-lg bg-red-50/50">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-medium text-red-700">清空数据</h3>
                  <p className="text-sm text-muted-foreground">删除所有库存模板数据</p>
                </div>
              </div>
              <Button
                variant="destructive"
                onClick={handleClearAll}
                disabled={clearing}
                className="w-full"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {clearing ? '清空中...' : '清空所有数据'}
              </Button>
            </div>
          </div>

          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-800">操作注意事项</h4>
                <ul className="text-sm text-amber-700 mt-2 space-y-1">
                  <li>• Excel导入会覆盖现有数据，请确保数据格式正确</li>
                  <li>• 清空数据操作不可逆，请谨慎操作</li>
                  <li>• 建议在进行大规模操作前导出数据备份</li>
                  <li>• 导入模板包含必填字段说明，请先下载模板查看格式要求</li>
                  <li>• 模板数据不含价格和数量字段，价格数量由用户在个人库存中设置</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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
            className={`${selectedGame === game.id ? `${game.color} text-white hover:opacity-90` : ''}`}
            onClick={() => setSelectedGame(selectedGame === game.id ? '' : game.id)}
          >
            {game.name}
          </Button>
        ))}
        <div className="flex-1" />
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

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="搜索物品模板..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredItems.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">暂无模板数据，点击"添加模板"开始</p>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredItems.map((item: InventoryItem) => {
            const gameType = GAME_TYPES.find(g => g.id === item.gameType)
            return (
            <Card key={item.id} className="overflow-hidden card-hover group">
              <div className={`aspect-[3/4] bg-gradient-to-br ${item.gameType === 'rune' ? 'from-red-500/10 to-red-300/10' : item.gameType === 'shadowverse-evolve' ? 'from-purple-500/10 to-purple-300/10' : 'from-primary/10 to-accent/10'} relative overflow-hidden`}>
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
                    <Badge className={`${gameType.color} text-white text-xs`}>
                      {gameType.name}
                    </Badge>
                  </div>
                )}
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold truncate">{item.itemName || item.name}</h3>
                {item.gameType === 'rune' && item.runeCardInfo?.cardNumber && (
                  <div className="text-xs text-muted-foreground mt-1">编号：{item.runeCardInfo.cardNumber}</div>
                )}
                {item.gameType === 'rune' && item.cardProperty && item.cardProperty !== '无' && (
                  <div className="text-xs text-muted-foreground mt-1">属性：{item.cardProperty}</div>
                )}
                <div className="flex items-center justify-between mt-2 text-sm text-muted-foreground">
                  <span>{getItemTypeDisplay(item.itemType)}</span>
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
                    onClick={() => deleteMutation.mutate(String(item.id))}
                  >
                    <Trash2 className="w-3 h-3" />
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
                    <td className="p-4 text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}>
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
                  )
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

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

      <InventoryTemplateDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        item={editingItem}
      />
    </div>
  )
}