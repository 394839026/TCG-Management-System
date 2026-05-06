import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { orderService, Order, shopMessageService } from '@/services/api'
import { toast } from 'sonner'
import { Package, Search, Eye, X, Store, Clock, CheckCircle, XCircle, MessageCircle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: '待确认', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  confirmed: { label: '已确认', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
  completed: { label: '已完成', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  cancelled: { label: '已取消', color: 'bg-red-100 text-red-800', icon: XCircle },
}

export function OrdersPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const queryClient = useQueryClient()

  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['myOrders', statusFilter],
    queryFn: () => orderService.getMyOrders({ status: statusFilter !== 'all' ? statusFilter : undefined })
  })

  // 检查URL参数中是否有orderId，有则打开订单详情
  useEffect(() => {
    const orderId = searchParams.get('orderId')
    if (orderId && ordersData?.data && ordersData.data.length > 0) {
      const order = ordersData.data.find((o: Order) => o._id === orderId)
      if (order) {
        setSelectedOrder(order)
      }
    }
  }, [searchParams, ordersData])

  const cancelMutation = useMutation({
    mutationFn: (orderId: string) => orderService.cancelOrder(orderId, cancelReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myOrders'] })
      toast.success('订单已取消')
      setCancelDialogOpen(false)
      setSelectedOrder(null)
      setCancelReason('')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || '取消失败')
    }
  })

  const contactShopMutation = useMutation({
    mutationFn: (shopId: string) => shopMessageService.contactShop(shopId),
    onSuccess: (data) => {
      navigate(`/messages?shopConversationId=${data.data.conversationId}`)
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || '无法联系店铺')
    }
  })

  const orders: Order[] = ordersData?.data || []

  const filteredOrders = orders.filter(order => {
    if (!searchTerm) return true
    return order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase())
  })

  const handleCancel = (order: Order) => {
    setSelectedOrder(order)
    setCancelDialogOpen(true)
  }

  const confirmCancel = () => {
    if (selectedOrder) {
      cancelMutation.mutate(selectedOrder._id)
    }
  }

  const handleContactShop = (order: Order) => {
    if (order.groupChat) {
      navigate(`/messages?groupChatId=${order.groupChat}`)
      return
    }
    const shopId = typeof order.shop === 'object' ? order.shop?._id : order.shop
    if (!shopId) {
      toast.error('无法联系店铺：店铺信息不存在')
      return
    }
    contactShopMutation.mutate(shopId)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">我的订单</h1>
          <p className="text-muted-foreground mt-1">查看和管理您的店铺订购记录</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索订单号..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">状态:</span>
              <div className="flex gap-1">
                {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map(status => (
                  <Button
                    key={status}
                    variant={statusFilter === status ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatusFilter(status)}
                  >
                    {status === 'all' ? '全部' : STATUS_MAP[status]?.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">暂无订单记录</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate('/shops')}>
              去店铺选购
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const statusInfo = STATUS_MAP[order.status]
            const StatusIcon = statusInfo?.icon || Clock

            return (
              <Card key={order._id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Package className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{order.orderNumber}</CardTitle>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <Store className="w-4 h-4" />
                          <span>
                            {typeof order.shop === 'object' ? order.shop.name : '未知店铺'}
                          </span>
                          <span>•</span>
                          <span>{new Date(order.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    <Badge className={statusInfo?.color}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {statusInfo?.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {order.items.slice(0, 3).map((item, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{item.itemName}</span>
                          {item.itemSnapshot?.runeCardInfo?.cardNumber && (
                            <span className="text-muted-foreground">
                              ({item.itemSnapshot.runeCardInfo.cardNumber})
                            </span>
                          )}
                          <span className="text-muted-foreground">×{item.quantity}</span>
                        </div>
                        <span className="font-medium">{formatCurrency(item.price * item.quantity)}</span>
                      </div>
                    ))}
                    {order.items.length > 3 && (
                      <p className="text-sm text-muted-foreground">
                        还有 {order.items.length - 3} 件商品...
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between pt-3 border-t">
                      <div className="text-lg font-bold">
                        总计: <span className="text-primary">{formatCurrency(order.totalAmount)}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedOrder(order)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          查看详情
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleContactShop(order)}
                        >
                          <MessageCircle className="w-4 h-4 mr-1" />
                          联系店铺
                        </Button>
                        {order.status === 'pending' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-500 hover:text-red-600"
                            onClick={() => handleCancel(order)}
                          >
                            <X className="w-4 h-4 mr-1" />
                            取消订单
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={!!selectedOrder && !cancelDialogOpen} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>订单详情</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">订单号</p>
                  <p className="font-medium">{selectedOrder.orderNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">状态</p>
                  <Badge className={STATUS_MAP[selectedOrder.status]?.color}>
                    {STATUS_MAP[selectedOrder.status]?.label}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">店铺</p>
                  <p className="font-medium">
                    {typeof selectedOrder.shop === 'object' ? selectedOrder.shop.name : '未知店铺'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">下单时间</p>
                  <p className="font-medium">{new Date(selectedOrder.createdAt).toLocaleString()}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">商品列表</h4>
                <div className="space-y-2">
                  {selectedOrder.items.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">{item.itemName}</p>
                        <p className="text-sm text-muted-foreground">
                          单价: {formatCurrency(item.price)} × {item.quantity}
                        </p>
                      </div>
                      <p className="font-medium">{formatCurrency(item.price * item.quantity)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between text-lg font-bold">
                  <span>订单总计</span>
                  <span className="text-primary">{formatCurrency(selectedOrder.totalAmount)}</span>
                </div>
              </div>

              {selectedOrder.notes && (
                <div className="border-t pt-4">
                  <p className="text-sm text-muted-foreground">备注</p>
                  <p className="mt-1">{selectedOrder.notes}</p>
                </div>
              )}

              {selectedOrder.cancelReason && (
                <div className="border-t pt-4">
                  <p className="text-sm text-muted-foreground">取消原因</p>
                  <p className="mt-1 text-red-500">{selectedOrder.cancelReason}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            {selectedOrder && (
              <Button variant="outline" onClick={() => handleContactShop(selectedOrder)}>
                <MessageCircle className="w-4 h-4 mr-1" />
                联系店铺
              </Button>
            )}
            <Button variant="outline" onClick={() => setSelectedOrder(null)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>取消订单</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              确定要取消订单 {selectedOrder?.orderNumber} 吗？
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium">取消原因（可选）</label>
              <Input
                placeholder="请输入取消原因..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
              返回
            </Button>
            <Button
              variant="destructive"
              onClick={confirmCancel}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? '取消中...' : '确认取消'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
