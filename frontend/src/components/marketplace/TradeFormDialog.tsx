import { useState, useEffect, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { tradeService, TradeListing } from '@/services/api'
import { inventoryService, InventoryItem } from '@/services/inventory'
import { toast } from 'sonner'
import { Plus, Minus, X, Package, Clock, FileText, Search } from 'lucide-react'

interface TradeFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  listing?: TradeListing | null
}

interface TradeItem {
  itemId: string
  itemName: string
  quantity: number
  value: number
}

export function TradeFormDialog({ open, onOpenChange, listing }: TradeFormDialogProps) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    type: 'sell' as 'sell' | 'buy' | 'trade',
    price: 0,
    items: [] as TradeItem[],
    requestedItems: [] as TradeItem[],
    expiresAt: '',
    description: '',
  })
  const [itemSearchTerm, setItemSearchTerm] = useState('')

  const { data: inventoryData, isLoading: inventoryLoading, error: inventoryError, refetch } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => inventoryService.getAll(),
    enabled: open,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0,
  })

  const inventoryItems: InventoryItem[] = inventoryData?.data || []

  const filteredInventoryItems = useMemo(() => {
    return inventoryItems.filter(item => {
      const hasStock = (item.userQuantity || 0) > 0
      const matchesSearch = itemSearchTerm === '' || 
        (item.itemName || item.name || '').toLowerCase().includes(itemSearchTerm.toLowerCase())
      return hasStock && matchesSearch
    })
  }, [inventoryItems, itemSearchTerm])

  useEffect(() => {
    if (open) {
      refetch()
    }
  }, [open, refetch])

  useEffect(() => {
    console.log('Inventory loaded:', inventoryItems.length, 'items')
    if (inventoryError) {
      console.error('Failed to load inventory:', inventoryError)
      toast.error('加载库存失败，请稍后重试')
    }
  }, [inventoryError, inventoryItems])

  useEffect(() => {
    if (listing) {
      const items: TradeItem[] = listing.items?.map((i: any) => {
        const item = inventoryItems.find(inv => inv._id === i.item || inv.id === i.item)
        return {
          itemId: typeof i.item === 'string' ? i.item : '',
          itemName: item?.itemName || item?.name || `物品 ${i.item}`,
          quantity: i.quantity || 1,
          value: item?.value || 0,
        }
      }) || []
      const requestedItems: TradeItem[] = listing.requestedItems?.map((i: any) => ({
        itemId: typeof i.item === 'string' ? i.item : '',
        itemName: `物品 ${i.item}`,
        quantity: i.quantity || 1,
        value: 0,
      })) || []
      setFormData({
        type: listing.type || 'sell',
        price: listing.price || 0,
        items,
        requestedItems,
        expiresAt: listing.expiresAt || '',
        description: '',
      })
    } else {
      setFormData({
        type: 'sell',
        price: 0,
        items: [],
        requestedItems: [],
        expiresAt: '',
        description: '',
      })
    }
  }, [listing, open])

  const createMutation = useMutation({
    mutationFn: (data: Partial<TradeListing>) => tradeService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tradeListings'] })
      toast.success('交易发布成功')
      onOpenChange(false)
    },
    onError: (error: any) => {
      const errorMsg = error.response?.data?.message || error.response?.data?.errors?.[0]?.msg || error.message || '发布失败'
      console.error('创建订单失败:', error)
      toast.error(errorMsg)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TradeListing> }) =>
      tradeService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tradeListings'] })
      toast.success('交易更新成功')
      onOpenChange(false)
    },
    onError: (error: any) => {
      const errorMsg = error.response?.data?.message || error.response?.data?.errors?.[0]?.msg || error.message || '更新失败'
      console.error('更新订单失败:', error)
      toast.error(errorMsg)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (formData.items.length === 0) {
      toast.error('请至少选择一个物品')
      return
    }

    if (formData.type === 'trade' && formData.requestedItems.length === 0) {
      toast.error('交换类型需要选择期望获得的物品')
      return
    }

    let itemsData;
    if (formData.type === 'buy') {
      itemsData = formData.items.map(item => ({
        itemName: item.itemName,
        quantity: item.quantity,
      }))
    } else {
      itemsData = formData.items.map(item => ({
        item: item.itemId,
        itemName: item.itemName,
        quantity: item.quantity,
      }))
    }

    const requestedItemsData = formData.requestedItems.map(item => ({
      itemName: item.itemName,
      quantity: item.quantity,
    }))

    const submitData: Partial<TradeListing> = {
      type: formData.type,
      price: formData.price,
      items: itemsData,
      requestedItems: requestedItemsData.length > 0 ? requestedItemsData : undefined,
      expiresAt: formData.expiresAt || undefined,
    }

    if (listing?._id) {
      updateMutation.mutate({ id: listing._id, data: submitData })
    } else {
      createMutation.mutate(submitData)
    }
  }

  const addItem = () => {
    if (filteredInventoryItems.length === 0) {
      toast.error('您的库存中没有可用物品')
      return
    }
    
    // 找到第一个未在列表中的物品
    let newItem = null
    for (const item of filteredInventoryItems) {
      const itemId = item._id?.toString() || item.id.toString()
      const existingItem = formData.items.find(i => i.itemId === itemId)
      if (!existingItem) {
        newItem = item
        break
      }
    }
    
    if (!newItem) {
      toast.error('您已将所有可用物品添加到列表中')
      return
    }
    
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          itemId: newItem._id?.toString() || newItem.id.toString(),
          itemName: newItem.itemName || newItem.name || '未命名物品',
          quantity: 1,
          value: newItem.value,
        },
      ],
    })
  }

  const addRequestedItem = () => {
    setFormData({
      ...formData,
      requestedItems: [
        ...formData.requestedItems,
        {
          itemId: '',
          itemName: '输入物品名称',
          quantity: 1,
          value: 0,
        },
      ],
    })
  }

  const updateItemQuantity = (index: number, delta: number, isRequested = false) => {
    const array = isRequested ? 'requestedItems' : 'items'
    const newArray = [...formData[array]]
    newArray[index] = {
      ...newArray[index],
      quantity: Math.max(1, newArray[index].quantity + delta),
    }
    setFormData({ ...formData, [array]: newArray })
  }

  const updateItemName = (index: number, name: string) => {
    const newRequestedItems = [...formData.requestedItems]
    newRequestedItems[index] = { ...newRequestedItems[index], itemName: name }
    setFormData({ ...formData, requestedItems: newRequestedItems })
  }

  const removeItem = (index: number, isRequested = false) => {
    const array = isRequested ? 'requestedItems' : 'items'
    setFormData({
      ...formData,
      [array]: formData[array].filter((_, i) => i !== index),
    })
  }

  const selectFromInventory = (index: number, itemId: string) => {
    const inventoryItem = inventoryItems.find(inv => (inv._id?.toString() || inv.id.toString()) === itemId)
    if (!inventoryItem) return
    
    // 检查是否其他位置已经选择了这个物品
    const otherIndex = formData.items.findIndex((item, i) => i !== index && item.itemId === itemId)
    if (otherIndex !== -1) {
      toast.error('该物品已在列表中')
      return
    }
    
    const newItems = [...formData.items]
    newItems[index] = {
      itemId: itemId,
      itemName: inventoryItem.itemName || inventoryItem.name || '未命名物品',
      quantity: 1,
      value: inventoryItem.value,
    }
    setFormData({ ...formData, items: newItems })
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  const totalValue = formData.items.reduce((sum, item) => sum + item.value * item.quantity, 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{listing ? '编辑交易' : '发布交易'}</DialogTitle>
            <DialogDescription>
              {listing ? '修改交易信息' : '发布新的交易信息'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="type">交易类型</Label>
              <Select value={formData.type} onValueChange={(value: 'sell' | 'buy' | 'trade') => setFormData({ ...formData, type: value, requestedItems: [] })}>
                <SelectTrigger>
                  <SelectValue placeholder="选择交易类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sell">出售</SelectItem>
                  <SelectItem value="buy">求购</SelectItem>
                  <SelectItem value="trade">交换</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(formData.type === 'sell' || formData.type === 'buy') && (
              <div className="grid gap-2">
                <Label htmlFor="price">价格 (¥)</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  placeholder="输入价格"
                />
              </div>
            )}

            {formData.type === 'trade' && (
              <div className="text-sm text-muted-foreground">
                交换模式：选择您要交换的物品和期望获得的物品
              </div>
            )}

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  {formData.type === 'buy' ? '求购物品' : '交易物品'}
                </Label>
                {formData.type !== 'buy' && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addItem}
                    disabled={inventoryLoading}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    添加物品
                  </Button>
                )}
              </div>
              
              {formData.type === 'buy' ? (
                <div className="space-y-2">
                  {formData.items.map((item, index) => (
                    <div key={index} className="flex items-center gap-2 p-3 border rounded-lg">
                      <Input
                        placeholder="输入求购物品名称"
                        value={item.itemName}
                        onChange={(e) => {
                          const newItems = [...formData.items]
                          newItems[index] = { ...newItems[index], itemName: e.target.value }
                          setFormData({ ...formData, items: newItems })
                        }}
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => {
                          const newItems = [...formData.items]
                          newItems[index] = { ...newItems[index], quantity: Math.max(1, parseInt(e.target.value) || 1) }
                          setFormData({ ...formData, items: newItems })
                        }}
                        className="w-20"
                        placeholder="数量"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(index)}
                        className="text-red-500 hover:text-red-600"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        items: [...formData.items, { itemId: '', itemName: '', quantity: 1, value: 0 }],
                      })
                    }}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    添加物品
                  </Button>
                </div>
              ) : formData.items.length === 0 ? (
                <div className="p-4 border border-dashed rounded-lg text-center text-muted-foreground">
                  <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>点击"添加物品"从库存中选择</p>
                  {inventoryLoading && <p className="text-sm mt-1">加载库存中...</p>}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="mb-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="搜索物品..."
                        value={itemSearchTerm}
                        onChange={(e) => setItemSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  {formData.items.map((item, index) => (
                    <div key={index} className="flex items-center gap-2 p-3 border rounded-lg">
                      <div className="flex-1">
                        <Select
                          value={item.itemId}
                          onValueChange={(value) => selectFromInventory(index, value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="选择物品" />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredInventoryItems.map(inv => (
                              <SelectItem key={inv._id || inv.id} value={inv._id?.toString() || inv.id.toString()}>
                                {inv.itemName || inv.name} (¥{inv.value}) - x{inv.userQuantity || 0}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => updateItemQuantity(index, -1)}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-8 text-center font-medium">{item.quantity}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => updateItemQuantity(index, 1)}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                      <Badge variant="secondary">¥{(item.value * item.quantity).toFixed(2)}</Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(index)}
                        className="text-red-500 hover:text-red-600"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  {totalValue > 0 && (
                    <div className="text-right text-sm font-medium">
                      物品总值: ¥{totalValue.toFixed(2)}
                    </div>
                  )}
                </div>
              )}
            </div>

            {formData.type === 'trade' && (
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    期望获得的物品
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addRequestedItem}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    添加物品
                  </Button>
                </div>
                
                {formData.requestedItems.length === 0 ? (
                  <div className="p-4 border border-dashed rounded-lg text-center text-muted-foreground">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>点击"添加物品"输入期望获得的物品</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {formData.requestedItems.map((item, index) => (
                      <div key={index} className="flex items-center gap-2 p-3 border rounded-lg">
                        <Input
                          value={item.itemName}
                          onChange={(e) => updateItemName(index, e.target.value)}
                          placeholder="输入物品名称"
                          className="flex-1"
                        />
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => updateItemQuantity(index, -1, true)}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-8 text-center font-medium">{item.quantity}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => updateItemQuantity(index, 1, true)}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(index, true)}
                          className="text-red-500 hover:text-red-600"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="grid gap-2">
              <Label className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                有效期（可选）
              </Label>
              <Input
                type="datetime-local"
                value={formData.expiresAt}
                onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                描述（可选）
              </Label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                placeholder="添加交易描述..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              取消
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? '保存中...' : listing ? '更新' : '发布'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}