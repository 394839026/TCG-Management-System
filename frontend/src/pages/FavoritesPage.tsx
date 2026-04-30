import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Heart, Send, X, Trash2, ShoppingCart } from 'lucide-react'
import { favoriteService, messageService, TradeListing } from '@/services/api'
import { formatCurrency } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'

export function FavoritesPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: favoritesData, isLoading } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => favoriteService.getFavorites(),
  })

  const sendInterestMutation = useMutation({
    mutationFn: async ({ listing, sellerId }: { listing: any; sellerId: string }) => {
      const message = `我对你的挂牌【${listing.title || '未命名交易'}】有意向，想和你聊聊交易细节。`
      await messageService.sendMessage(sellerId, message)
    },
    onSuccess: () => {
      toast.success('已发送意向，可以在消息中心与对方沟通')
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
    onError: () => {
      toast.error('发送意向失败')
    },
  })

  const removeFavoriteMutation = useMutation({
    mutationFn: (listingId: string) => favoriteService.removeFavorite(listingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] })
      toast.success('已取消收藏')
    },
    onError: () => {
      toast.error('取消收藏失败')
    },
  })

  const favorites = favoritesData?.data || []

  const isOwnListing = (listing: any) => {
    if (!user) return false
    const sellerId = typeof listing.seller === 'object' ? listing.seller._id : listing.seller
    return sellerId === user._id
  }

  const handleSendInterest = (listing: any) => {
    const sellerId = typeof listing.seller === 'object' ? listing.seller._id : listing.seller
    if (!sellerId) {
      toast.error('无法获取发布者信息')
      return
    }
    sendInterestMutation.mutate({ listing, sellerId })
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Heart className="w-8 h-8" />
          我收藏的订单
        </h1>
        <p className="text-muted-foreground mt-1">管理你收藏的订单</p>
      </div>

      {favorites.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Heart className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">暂无收藏的订单</p>
            <p className="text-sm text-muted-foreground mt-1">去星网订单看看有什么感兴趣的</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {favorites.map((listing: any) => (
            <Card key={listing._id} className="card-hover">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={listing.type === 'sell' ? 'destructive' : listing.type === 'buy' ? 'success' : 'default'}>
                        {listing.type === 'sell' ? '出售' : listing.type === 'buy' ? '求购' : '交换'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(listing.createdAt).toLocaleDateString()}
                      </span>
                      {listing.status === 'cancelled' && (
                        <Badge variant="outline" className="text-red-500">已取消</Badge>
                      )}
                    </div>
                    <CardTitle className="text-lg">
  {listing.items?.map((i: any) => {
    const name = i.itemName || (typeof i.item === 'object' && i.item?.itemName) || (typeof i.item === 'string' ? `物品 #${i.item.slice(0, 8)}` : '未知');
    const quantity = i.quantity > 1 ? ` x${i.quantity}` : '';
    return `${name}${quantity}`;
  }).join(', ') || '未指定物品'}
</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      发布者: {typeof listing.seller === 'object' ? listing.seller.username : `用户 #${typeof listing.seller === 'string' ? listing.seller.slice(0, 8) : '未知'}`}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      收藏时间: {new Date(listing.favoritedAt).toLocaleDateString()}
                    </p>
                  </div>
                  {listing.price > 0 && (
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">{formatCurrency(listing.price)}</p>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  {listing.status !== 'cancelled' && !isOwnListing(listing) && (
                    <>
                      <Button className="flex-1" onClick={() => handleSendInterest(listing)}>
                        <Send className="w-4 h-4 mr-2" />
                        有意向
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeFavoriteMutation.mutate(listing._id)}
                      >
                        <Heart className="w-4 h-4 fill-current text-red-500" />
                      </Button>
                    </>
                  )}
                  {listing.status !== 'cancelled' && isOwnListing(listing) && (
                    <Button className="flex-1" disabled variant="outline">
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      自己的挂牌
                    </Button>
                  )}
                  {listing.status === 'cancelled' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-500"
                      onClick={() => removeFavoriteMutation.mutate(listing._id)}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      删除
                    </Button>
                  )}
                </div>
                {listing.type === 'trade' && listing.requestedItems && listing.requestedItems.length > 0 && (
                  <div className="mt-4 pt-4 border-t text-sm">
                    <p className="text-muted-foreground">期望获得:</p>
                    <p className="font-medium">
                      {listing.requestedItems!.map((i: any) => `${i.itemName} x${i.quantity}`).join(', ')}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
