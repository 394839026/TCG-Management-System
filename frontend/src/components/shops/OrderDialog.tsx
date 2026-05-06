import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { orderService } from '@/services/api'
import { toast } from 'sonner'
import { ShoppingCart, Minus, Plus, Trash2, Package } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface ShopInventoryItemData {
  _id: string
  template?: {
    _id: string
    itemName: string
    rarity?: string
    itemType?: string
    gameType?: string[]
    images?: string[]
    runeCardInfo?: {
      version?: string
      cardNumber?: string
    }
  }
  price: number
  quantity: number
  addedBy?: {
    _id: string
    username: string
  }
}

interface ShelfItem {
  _id: string
  inventoryItem: ShopInventoryItemData
  quantity: number
}

interface OrderItem {
  shelfItem: ShelfItem
  quantity: number
}

interface OrderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  shopId: string
  shopName: string
  shelves: any[]
  initialOrderItems?: OrderItem[]
  onOrderItemsChange?: (items: OrderItem[]) => void
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
}

const getRarityDisplay = (rarity: string) => RARITY_MAP[rarity] || rarity

export function OrderDialog({ open, onOpenChange, shopId, shopName, shelves, initialOrderItems = [], onOrderItemsChange }: OrderDialogProps) {
  const [orderItems, setOrderItems] = useState<OrderItem[]>(initialOrderItems)
  const [notes, setNotes] = useState('')
  const queryClient = useQueryClient()

  // 当 initialOrderItems 变化时同步更新
  useEffect(() => {
    setOrderItems(initialOrderItems)
  }, [initialOrderItems])

  const createOrderMutation = useMutation({
    mutationFn: () => {
      const items = orderItems.map(item => ({
        shopInventoryItemId: item.shelfItem.inventoryItem._id,
        quantity: item.quantity
      }))
      return orderService.createOrder(shopId, { items, notes })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myOrders'] })
      toast.success('订单创建成功！')
      setOrderItems([])
      setNotes('')
      onOrderItemsChange?.([])
      onOpenChange(false)
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || '创建订单失败')
    }
  })

  const addToOrder = (shelfItem: ShelfItem) => {
    const existingIndex = orderItems.findIndex(
      item => item.shelfItem.inventoryItem._id === shelfItem.inventoryItem._id
    )
    
    let newItems: OrderItem[]
    if (existingIndex >= 0) {
      newItems = [...orderItems]
      if (newItems[existingIndex].quantity < shelfItem.quantity) {
        newItems[existingIndex].quantity += 1
      }
    } else {
      newItems = [...orderItems, { shelfItem, quantity: 1 }]
    }
    setOrderItems(newItems)
    onOrderItemsChange?.(newItems)
  }

  const updateQuantity = (index: number, delta: number) => {
    const newItems = [...orderItems]
    const newQuantity = newItems[index].quantity + delta
    
    if (newQuantity <= 0) {
      newItems.splice(index, 1)
    } else if (newQuantity <= newItems[index].shelfItem.quantity) {
      newItems[index].quantity = newQuantity
    }
    
    setOrderItems(newItems)
    onOrderItemsChange?.(newItems)
  }

  const removeItem = (index: number) => {
    const newItems = [...orderItems]
    newItems.splice(index, 1)
    setOrderItems(newItems)
    onOrderItemsChange?.(newItems)
  }

  const getTotalAmount = () => {
    return orderItems.reduce((sum, item) => 
      sum + item.shelfItem.inventoryItem.price * item.quantity, 0
    )
  }

  const allItems: ShelfItem[] = shelves.flatMap((shelf: any) => 
    (shelf.items || []).map((item: any) => ({
      _id: item._id,
      inventoryItem: item.inventoryItem,
      quantity: item.quantity
    }))
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            在 {shopName} 订购商品
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-2 gap-4 py-4">
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">货架商品</h3>
            {allItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>暂无可订购的商品</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                {shelves.map((shelf: any) => (
                  <div key={shelf._id} className="space-y-2">
                    <h4 className="font-medium text-sm text-muted-foreground">{shelf.name}</h4>
                    {(shelf.items || []).map((item: any) => {
                      const inOrder = orderItems.some(
                        orderItem => orderItem.shelfItem.inventoryItem._id === item.inventoryItem._id
                      )
                      
                      return (
                        <div
                          key={item._id}
                          className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
                            inOrder ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
                          }`}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{item.inventoryItem?.template?.itemName}</p>
                              {item.inventoryItem?.template?.rarity && (
                                <Badge variant="outline" className="text-xs">
                                  {getRarityDisplay(item.inventoryItem.template.rarity)}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                              {item.inventoryItem?.template?.runeCardInfo?.cardNumber && (
                                <span>编号: {item.inventoryItem.template.runeCardInfo.cardNumber}</span>
                              )}
                              <span>库存: {item.quantity}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <p className="font-bold text-primary">
                              {formatCurrency(item.inventoryItem?.price)}
                            </p>
                            <Button
                              size="sm"
                              onClick={() => addToOrder(item)}
                              disabled={item.quantity <= 0}
                            >
                              {inOrder ? '已添加' : '添加'}
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-lg">订购清单</h3>
            {orderItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>请从左侧选择商品</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                {orderItems.map((item, index) => (
                  <div key={item.shelfItem.inventoryItem._id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{item.shelfItem.inventoryItem.template?.itemName}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(item.shelfItem.inventoryItem.price)} × {item.quantity}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center border rounded-md">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => updateQuantity(index, -1)}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => updateQuantity(index, 1)}
                          disabled={item.quantity >= item.shelfItem.quantity}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                        onClick={() => removeItem(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {orderItems.length > 0 && (
              <div className="space-y-3 pt-3 border-t">
                <div className="flex items-center justify-between text-lg font-bold">
                  <span>总计:</span>
                  <span className="text-primary">{formatCurrency(getTotalAmount())}</span>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">备注（可选）</label>
                  <Input
                    placeholder="例如：希望尽快发货..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    maxLength={500}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            onClick={() => createOrderMutation.mutate()}
            disabled={orderItems.length === 0 || createOrderMutation.isPending}
          >
            {createOrderMutation.isPending ? '提交中...' : `提交订单 (${formatCurrency(getTotalAmount())})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
