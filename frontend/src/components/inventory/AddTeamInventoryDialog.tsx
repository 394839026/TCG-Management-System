import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Search, Plus, CheckCircle2, Package } from 'lucide-react'
import { inventoryService, InventoryItem } from '@/services/inventory'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddItem: (itemId: string, quantity: number) => void
  teamId: string
}

export function AddTeamInventoryDialog({ open, onOpenChange, onAddItem }: Omit<Props, 'teamId'>) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedItem, setSelectedItem] = useState<string | null>(null)
  const [selectedQuantity, setSelectedQuantity] = useState(1)

  const { data: inventoryData } = useQuery({
    queryKey: ['inventory', searchTerm],
    queryFn: () => inventoryService.getAll({ search: searchTerm })
  })

  const items: InventoryItem[] = inventoryData?.data || []

  const filteredItems = items.filter(item => {
    // 只显示数量大于0的
    const quantity = item.userQuantity ?? item.quantity ?? 0
    if (quantity <= 0) return false
    
    // Search filter
    const matchesSearch = searchTerm === '' ||
      item.itemName.toLowerCase().includes(searchTerm.toLowerCase())
      
    return matchesSearch
  })

  // 获取当前选中的物品
  const currentSelectedItem = filteredItems.find(item => item.id === selectedItem)
  const maxQuantity = currentSelectedItem 
    ? (currentSelectedItem.userQuantity ?? currentSelectedItem.quantity ?? 1)
    : 1

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'bg-gray-500'
      case 'uncommon': return 'bg-green-500'
      case 'rare': return 'bg-blue-500'
      case 'super_rare': return 'bg-purple-500'
      case 'ultra_rare': return 'bg-red-500'
      case 'secret_rare': return 'bg-yellow-500'
      default: return 'bg-gray-500'
    }
  }

  const getConditionLabel = (condition: string) => {
    switch (condition) {
      case 'mint': return '完美'
      case 'near_mint': return '近完美'
      case 'excellent': return '优秀'
      case 'good': return '良好'
      case 'light_played': return '轻微プレイ'
      case 'played': return 'プレイ済'
      case 'poor': return '不良'
      default: return condition
    }
  }

  const handleAdd = () => {
    if (!selectedItem) {
      toast.error('请选择要添加的物品')
      return
    }
    if (selectedQuantity < 1 || selectedQuantity > maxQuantity) {
      toast.error(`请选择1到${maxQuantity}之间的数量`)
      return
    }
    onAddItem(selectedItem, selectedQuantity)
    setSelectedItem(null)
    setSelectedQuantity(1)
    setSearchTerm('')
  }

  useEffect(() => {
    if (!open) {
      setSearchTerm('')
      setSelectedItem(null)
      setSelectedQuantity(1)
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>添加物品到战队库存</DialogTitle>
          <DialogDescription>从您的个人库存中选择要添加到战队共享库存的物品</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="搜索您的库存物品..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {/* 数量选择器 */}
          {selectedItem && (
            <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="text-sm font-medium">捐赠数量:</div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedQuantity(Math.max(1, selectedQuantity - 1))}
                  disabled={selectedQuantity <= 1}
                >
                  -
                </Button>
                <Input
                  type="number"
                  value={selectedQuantity}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 1
                    setSelectedQuantity(Math.min(Math.max(1, val), maxQuantity))
                  }}
                  className="w-20 text-center"
                  min={1}
                  max={maxQuantity}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedQuantity(Math.min(maxQuantity, selectedQuantity + 1))}
                  disabled={selectedQuantity >= maxQuantity}
                >
                  +
                </Button>
                <div className="text-sm text-muted-foreground">
                  (最大: {maxQuantity})
                </div>
              </div>
            </div>
          )}

          <div className="max-h-96 overflow-y-auto space-y-2">
            {filteredItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>没有找到匹配的库存物品</p>
              </div>
            ) : (
              filteredItems.map((item) => (
                <Card
                  key={item.id}
                  className={`cursor-pointer transition-all border-2 ${
                    selectedItem === String(item.id)
                      ? 'border-primary bg-primary/5'
                      : 'border-transparent hover:border-primary/30'
                  }`}
                  onClick={() => setSelectedItem(String(item.id))}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0 ${getRarityColor(item.rarity)}`}>
                        {item.itemType === 'card' ? 'C' : item.itemType === 'booster' ? 'B' : 'P'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-medium truncate">{item.itemName}</h4>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge variant="outline" className="text-xs">
                              {item.itemType === 'card' ? '卡牌' : item.itemType === 'booster' ? '补充包' : '周边'}
                            </Badge>
                            <Badge className={`text-xs text-white ${getRarityColor(item.rarity)}`}>
                              {item.rarity === 'common' ? '普通' :
                               item.rarity === 'uncommon' ? '非普通' :
                               item.rarity === 'rare' ? '稀有' :
                               item.rarity === 'super_rare' ? '超稀有' :
                               item.rarity === 'ultra_rare' ? '极稀有' :
                               item.rarity === 'secret_rare' ? '秘密稀有' : item.rarity}
                            </Badge>
                            {item.condition && (
                              <Badge variant="outline" className="text-xs">
                                {getConditionLabel(item.condition)}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm text-muted-foreground">数量</p>
                        <p className="font-semibold">{item.userQuantity ?? item.quantity}</p>
                        <p className="text-sm text-muted-foreground mt-1">价值</p>
                        <p className="font-semibold">{formatCurrency(item.userValue ?? item.value)}</p>
                      </div>
                      {selectedItem === item.id && (
                        <div className="flex-shrink-0">
                          <CheckCircle2 className="w-6 h-6 text-primary" />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
            <Button onClick={handleAdd} disabled={!selectedItem}>
              <Plus className="w-4 h-4 mr-2" />
              添加到战队库存
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}