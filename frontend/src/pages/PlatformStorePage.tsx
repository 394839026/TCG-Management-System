import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { platformStoreService, PlatformStoreItem, PlatformStoreRedemption } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { ShoppingCart, Gift, Star, Sparkles, Coins, Timer, Package } from 'lucide-react'

// 工具函数：日期格式化
const formatDate = (dateString?: string) => {
  if (!dateString) return null
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 获取商品类型对应的图标
const getItemIcon = (itemType: string) => {
  switch (itemType) {
    case 'inventory_item': return Package
    case 'points': return Sparkles
    case 'exp': return Star
    case 'badge': return Star
    case 'title': return Gift
    default: return Package
  }
}

// 获取支付方式对应的图标
const getCurrencyIcon = (currencyType: string) => {
  switch (currencyType) {
    case 'points': return Star
    case 'coins': return Coins
    default: return Star
  }
}

// 获取商品类型对应的文本
const getItemTypeText = (itemType: string) => {
  switch (itemType) {
    case 'inventory_item': return '物品'
    case 'points': return '积分'
    case 'exp': return '经验'
    case 'badge': return '徽章'
    case 'title': return '称号'
    default: return '其他'
  }
}

// 获取支付方式对应的文本
const getCurrencyText = (currencyType: string) => {
  switch (currencyType) {
    case 'points': return '积分'
    case 'coins': return '星币'
    default: return '积分'
  }
}

export function PlatformStorePage() {
  const { user, setUser } = useAuth()
  const queryClient = useQueryClient()
  const [selectedItem, setSelectedItem] = useState<PlatformStoreItem | null>(null)
  const [showDetailDialog, setShowDetailDialog] = useState(false)

  // 获取商店商品列表
  const { data: storeItemsData, isLoading: isItemsLoading } = useQuery({
    queryKey: ['platformStoreItems'],
    queryFn: platformStoreService.getStoreItems,
  })

  // 获取我的兑换记录
  const { data: redemptionsData, isLoading: isRedemptionsLoading } = useQuery({
    queryKey: ['platformStoreRedemptions'],
    queryFn: platformStoreService.getMyRedemptions,
  })

  // 兑换商品
  const redeemMutation = useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity: number }) =>
      platformStoreService.redeemStoreItem(id, quantity),
    onSuccess: (response) => {
      toast.success('兑换成功！')
      setShowDetailDialog(false)
      queryClient.invalidateQueries({ queryKey: ['platformStoreItems'] })
      queryClient.invalidateQueries({ queryKey: ['platformStoreRedemptions'] })
      
      // 更新用户星币/积分
      if (response.success && response.data.user && user && setUser) {
        const updatedUser = {
          ...user,
          points: response.data.user.points,
          coins: response.data.user.coins
        }
        setUser(updatedUser)
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || '兑换失败')
    },
  })

  // 显示商品详情
  const handleViewDetail = (item: PlatformStoreItem) => {
    setSelectedItem(item)
    setShowDetailDialog(true)
  }

  // 处理兑换
  const handleRedeem = (item: PlatformStoreItem, quantity: number = 1) => {
    if (window.confirm(`确定要兑换 ${item.itemName} ${quantity > 1 ? `× ${quantity}` : ''} 吗？`)) {
      redeemMutation.mutate({ id: item._id, quantity })
    }
  }

  const storeItems: PlatformStoreItem[] = storeItemsData?.data || []
  const redemptions: PlatformStoreRedemption[] = redemptionsData?.data || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ShoppingCart className="w-8 h-8 text-primary" />
            智库兑换窗口
          </h1>
          <p className="text-muted-foreground mt-1">
            使用积分或星币兑换你喜欢的物品
          </p>
        </div>
      </div>

      {/* 用户余额显示 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              我的积分
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-yellow-600">
              {user?.points?.toLocaleString() || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Coins className="w-5 h-5 text-amber-500" />
              我的星币
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-amber-600">
              {user?.coins?.toLocaleString() || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="shop" className="space-y-6">
        <TabsList>
          <TabsTrigger value="shop">
            <ShoppingCart className="w-4 h-4 mr-2" />
            商店
          </TabsTrigger>
          <TabsTrigger value="history">
            <Timer className="w-4 h-4 mr-2" />
            兑换记录
          </TabsTrigger>
        </TabsList>

        {/* 商店标签页 */}
        <TabsContent value="shop">
          {isItemsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : storeItems.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">暂无商品</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {storeItems.map((item) => {
                const Icon = getItemIcon(item.itemType)
                const CurrencyIcon = getCurrencyIcon(item.currencyType)
                const isOutOfStock = item.stock > 0 && item.redeemedCount >= item.stock
                const canAffordPoints = item.currencyType === 'points' && user?.points >= item.price
                const canAffordCoins = item.currencyType === 'coins' && user?.coins >= item.price
                const canAfford = canAffordPoints || canAffordCoins

                return (
                  <Card
                    key={item._id}
                    className={`overflow-hidden transition-all hover:shadow-lg ${isOutOfStock ? 'opacity-60' : ''}`}
                  >
                    {item.image && (
                      <div className="h-40 bg-cover bg-center" style={{ backgroundImage: `url(${item.image})` }} />
                    )}
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Icon className="w-5 h-5 text-primary" />
                            {item.itemName}
                          </CardTitle>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline">{getItemTypeText(item.itemType)}</Badge>
                            <Badge variant="outline">
                              <CurrencyIcon className="w-3 h-3 mr-1" />
                              {item.price} {getCurrencyText(item.currencyType)}
                            </Badge>
                            {item.itemQuantity > 1 && (
                              <Badge variant="outline">×{item.itemQuantity}</Badge>
                            )}
                          </div>
                        </div>
                        {item.tags?.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {item.tags.slice(0, 2).map((tag, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    {item.description && (
                      <CardContent className="pb-2">
                        <p className="text-muted-foreground text-sm line-clamp-2">{item.description}</p>
                      </CardContent>
                    )}
                    <CardContent>
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-sm text-muted-foreground">
                          {item.stock > 0 ? (
                            <span>库存: {item.redeemedCount}/{item.stock}</span>
                          ) : item.stock === 0 ? (
                            <span className="text-red-500">已售罄</span>
                          ) : (
                            <span>无限库存</span>
                          )}
                        </div>
                        {item.limitPerUser > 0 && (
                          <span className="text-xs text-muted-foreground">每人限兑: {item.limitPerUser}</span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => handleViewDetail(item)}
                          className="flex-1"
                        >
                          查看详情
                        </Button>
                        <Button
                          onClick={() => handleRedeem(item)}
                          disabled={isOutOfStock || !canAfford || redeemMutation.isPending}
                          className="flex-1"
                        >
                          <Gift className="w-4 h-4 mr-2" />
                          立即兑换
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* 兑换记录标签页 */}
        <TabsContent value="history">
          {isRedemptionsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : redemptions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Timer className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">暂无兑换记录</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {redemptions.map((redemption) => {
                const CurrencyIcon = getCurrencyIcon(redemption.currencyType)
                return (
                  <Card key={redemption._id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg">{redemption.itemName}</CardTitle>
                        <Badge
                          variant={redemption.status === 'completed' ? 'default' : 'outline'}
                        >
                          {redemption.status === 'completed' ? '已完成' :
                            redemption.status === 'pending' ? '待处理' :
                            redemption.status === 'failed' ? '失败' : '已退款'}
                        </Badge>
                      </div>
                      <CardDescription>{formatDate(redemption.createdAt)}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <CurrencyIcon className="w-4 h-4" />
                          <span>消耗: {redemption.price} {getCurrencyText(redemption.currencyType)}</span>
                          {redemption.quantity > 1 && (
                            <span className="text-sm">× {redemption.quantity}</span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          总计: {redemption.price * redemption.quantity} {getCurrencyText(redemption.currencyType)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* 商品详情对话框 */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="sm:max-w-lg">
          {selectedItem && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedItem.itemName}</DialogTitle>
              </DialogHeader>
              {selectedItem.image && (
                <div className="h-64 bg-cover bg-center rounded-md" style={{ backgroundImage: `url(${selectedItem.image})` }} />
              )}
              <div className="space-y-4">
                {selectedItem.description && (
                  <p className="text-muted-foreground">{selectedItem.description}</p>
                )}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label>类型</Label>
                    <p className="font-medium">{getItemTypeText(selectedItem.itemType)}</p>
                  </div>
                  <div>
                    <Label>价格</Label>
                    <p className="font-medium flex items-center gap-1">
                      {(() => {
                        const CurrencyIcon = getCurrencyIcon(selectedItem.currencyType)
                        return <CurrencyIcon className="w-4 h-4" />
                      })()}
                      {selectedItem.price} {getCurrencyText(selectedItem.currencyType)}
                    </p>
                  </div>
                  <div>
                    <Label>兑换获得</Label>
                    <p className="font-medium">×{selectedItem.itemQuantity}</p>
                  </div>
                  <div>
                    <Label>库存</Label>
                    <p className="font-medium">
                      {selectedItem.stock === -1 ? '无限' : `${selectedItem.redeemedCount}/${selectedItem.stock}`}
                    </p>
                  </div>
                  {selectedItem.limitPerUser > 0 && (
                    <div>
                      <Label>每人限兑</Label>
                      <p className="font-medium">{selectedItem.limitPerUser}</p>
                    </div>
                  )}
                </div>
                {selectedItem.tags?.length > 0 && (
                  <div>
                    <Label>标签</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedItem.tags.map((tag, i) => (
                        <Badge key={i} variant="outline">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
                  取消
                </Button>
                <Button
                  onClick={() => handleRedeem(selectedItem)}
                  disabled={redeemMutation.isPending}
                >
                  <Gift className="w-4 h-4 mr-2" />
                  立即兑换
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
