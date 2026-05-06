import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Search, ShoppingCart, X, Trash2, Grid3X3, List, Send, Heart, TrendingUp, TrendingDown, ArrowRightLeft, Package } from 'lucide-react'
import { tradeService, messageService, favoriteService, TradeListing } from '@/services/api'
import { formatCurrency } from '@/lib/utils'
import { TradeFormDialog } from '@/components/marketplace/TradeFormDialog'
import { MarketplaceFilterDialog } from '@/components/marketplace/MarketplaceFilterDialog'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'

export function MarketplacePage() {
  const [formOpen, setFormOpen] = useState(false)
  const [editingListing, setEditingListing] = useState<TradeListing | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sentInterests, setSentInterests] = useState<Set<string>>(new Set())
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'sell' | 'buy' | 'trade'>('all')
  const [advancedFilters, setAdvancedFilters] = useState({
    types: [] as ('sell' | 'buy' | 'trade')[],
    priceMin: '',
    priceMax: '',
  })
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: listingsData, isLoading } = useQuery({
    queryKey: ['tradeListings', { search: searchTerm }],
    queryFn: () => tradeService.getListings({ search: searchTerm }),
  })

  const { data: statsData } = useQuery({
    queryKey: ['tradeStats'],
    queryFn: () => tradeService.getStats(),
  })

  // 判断是否为自己的发布
  const isOwnListing = (listing: TradeListing) => {
    if (!user) return false
    const sellerId = typeof listing.seller === 'object' ? listing.seller._id : listing.seller
    return sellerId === user._id
  }

  const { data: favoritesData } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => favoriteService.getFavorites(),
  })

  useEffect(() => {
    if (favoritesData?.data) {
      const favoriteIds = new Set<string>(favoritesData.data.map((f: any) => String(f._id)))
      setFavorites(favoriteIds)
    }
  }, [favoritesData])

  const cancelMutation = useMutation({
    mutationFn: (id: string) => tradeService.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tradeListings'] })
      toast.success('交易已取消')
    },
    onError: () => {
      toast.error('取消失败')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => tradeService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tradeListings'] })
      toast.success('交易已删除')
    },
    onError: () => {
      toast.error('删除失败')
    },
  })

  const sendInterestMutation = useMutation({
    mutationFn: async ({ listing, sellerId }: { listing: TradeListing; sellerId: string }) => {
      const itemNames = listing.items?.map((i: any) => i.itemName || (i.item && typeof i.item === 'object' ? (i.item.itemName || i.item.name) : '未知')).join(', ') || '未指定物品'
      const message = `我对你的挂牌【${itemNames}】有意向，想和你聊聊交易细节。`
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

  const toggleFavoriteMutation = useMutation({
    mutationFn: async (listingId: string) => {
      if (favorites.has(listingId)) {
        await favoriteService.removeFavorite(listingId)
        return { action: 'removed', listingId }
      } else {
        await favoriteService.addFavorite(listingId)
        return { action: 'added', listingId }
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] })
      if (favorites.has(variables)) {
        toast.success('已取消收藏')
      } else {
        toast.success('已添加收藏')
      }
    },
    onError: () => {
      toast.error('操作失败，请重试')
    },
  })

  const listings: TradeListing[] = listingsData?.data || []

  const filteredListings = useMemo(() => {
    return listings.filter(listing => {
      // 快速筛选按钮 - 只显示自己的发布
      const isOwn = isOwnListing(listing)
      const matchesQuickFilter = (() => {
        if (filterType === 'all') return true
        return isOwn && listing.type === filterType
      })()
      
      // 高级筛选 - 类型
      const matchesAdvancedType = advancedFilters.types.length === 0 || 
        advancedFilters.types.includes(listing.type)
      
      // 高级筛选 - 价格范围
      const matchesPrice = (() => {
        if (!advancedFilters.priceMin && !advancedFilters.priceMax) return true
        
        const price = listing.price || 0
        const minPrice = advancedFilters.priceMin ? parseFloat(advancedFilters.priceMin) : 0
        const maxPrice = advancedFilters.priceMax ? parseFloat(advancedFilters.priceMax) : Infinity
        
        return price >= minPrice && price <= maxPrice
      })()
      
      // 搜索筛选现在由后端处理
      return matchesQuickFilter && matchesAdvancedType && matchesPrice
    })
  }, [listings, filterType, advancedFilters, user])

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin'

  const handleSendInterest = (listing: TradeListing) => {
    const sellerId = typeof listing.seller === 'object' ? listing.seller._id : listing.seller
    if (!sellerId) {
      toast.error('无法获取发布者信息')
      return
    }
    sendInterestMutation.mutate({ listing, sellerId })
    setSentInterests(prev => new Set([...prev, listing._id]))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">星网订单</h1>
          <p className="text-muted-foreground mt-1">发布和查看订单</p>
        </div>
        <Button variant="premium" onClick={() => { setEditingListing(null); setFormOpen(true) }}>
          <ShoppingCart className="w-4 h-4 mr-2" />
          发布订单
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总订单数</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsData?.data?.total ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">求购订单</CardTitle>
            <TrendingDown className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsData?.data?.buy ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">出售订单</CardTitle>
            <TrendingUp className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsData?.data?.sell ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">交换订单</CardTitle>
            <ArrowRightLeft className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsData?.data?.trade ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="搜索订单" 
                className="pl-10" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button 
                variant={filterType === 'all' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setFilterType('all')}
              >
                全部
              </Button>
              <Button 
                variant={filterType === 'sell' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setFilterType('sell')}
              >
                我的出售
              </Button>
              <Button 
                variant={filterType === 'buy' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setFilterType('buy')}
              >
                我的求购
              </Button>
              <Button 
                variant={filterType === 'trade' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setFilterType('trade')}
              >
                我的交换
              </Button>
            </div>
            <MarketplaceFilterDialog 
              onFilter={setAdvancedFilters}
              currentFilters={advancedFilters}
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
        </CardContent>
        
        {/* 筛选标签 */}
        {(filterType !== 'all' || advancedFilters.types.length > 0 || advancedFilters.priceMin || advancedFilters.priceMax) && (
          <div className="px-4 pb-4 border-t">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground">当前筛选：</span>
              
              {filterType !== 'all' && (
                <Badge variant="outline" className="flex items-center gap-1">
                  {filterType === 'sell' ? '我的出售' : filterType === 'buy' ? '我的求购' : '我的交换'}
                  <button 
                    onClick={() => setFilterType('all')}
                    className="hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              
              {advancedFilters.types.map(type => (
                <Badge key={type} variant="outline" className="flex items-center gap-1">
                  {type === 'sell' ? '出售' : type === 'buy' ? '求购' : '交换'}
                  <button 
                    onClick={() => setAdvancedFilters(prev => ({
                      ...prev,
                      types: prev.types.filter(t => t !== type)
                    }))}
                    className="hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
              
              {advancedFilters.priceMin && (
                <Badge variant="outline" className="flex items-center gap-1">
                  最低 ¥{advancedFilters.priceMin}
                  <button 
                    onClick={() => setAdvancedFilters(prev => ({ ...prev, priceMin: '' }))}
                    className="hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              
              {advancedFilters.priceMax && (
                <Badge variant="outline" className="flex items-center gap-1">
                  最高 ¥{advancedFilters.priceMax}
                  <button 
                    onClick={() => setAdvancedFilters(prev => ({ ...prev, priceMax: '' }))}
                    className="hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              
              <Button 
                variant="ghost" 
                size="sm" 
                className="ml-2"
                onClick={() => {
                  setFilterType('all')
                  setAdvancedFilters({ types: [], priceMin: '', priceMax: '' })
                }}
              >
                清除全部
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Listings */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredListings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            {filterType !== 'all' ? (
              <>
                <p className="text-muted-foreground">您暂无此类订单</p>
                <Button variant="outline" className="mt-4" onClick={() => setFilterType('all')}>
                  查看全部
                </Button>
              </>
            ) : (
              <p className="text-muted-foreground">暂无订单信息，点击"发布订单"开始</p>
            )}
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredListings.map((listing: TradeListing) => (
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
                      {listing.items?.map((i: any) => i.itemName || (i.item && typeof i.item === 'object' ? (i.item.itemName || i.item.name) : (typeof i.item === 'string' ? `物品 #${i.item.slice(0, 8)}` : '未知'))).join(', ') || '未指定物品'}
                    </CardTitle>
                    <CardDescription>发布者: {typeof listing.seller === 'object' ? listing.seller.username : `用户 #${typeof listing.seller === 'string' ? listing.seller.slice(0, 8) : '未知'}`}</CardDescription>
                    <CardDescription className="text-xs font-mono text-muted-foreground mt-1">
                      {listing.orderNumber}
                    </CardDescription>
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
                      {sentInterests.has(listing._id) || sendInterestMutation.isPending ? (
                        <Button className="flex-1" disabled>
                          <Send className="w-4 h-4 mr-2" />
                          已发送意向
                        </Button>
                      ) : (
                        <Button className="flex-1" onClick={() => handleSendInterest(listing)}>
                          <Send className="w-4 h-4 mr-2" />
                          有意向
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleFavoriteMutation.mutate(listing._id)}
                      >
                        <Heart className={`w-4 h-4 ${favorites.has(listing._id) ? 'fill-current text-red-500' : ''}`} />
                      </Button>
                    </>
                  )}
                  {listing.status !== 'cancelled' && isOwnListing(listing) && (
                    <Button className="flex-1" disabled variant="outline">
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      自己的挂牌
                    </Button>
                  )}
                  {(isOwnListing(listing) || isAdmin) && listing.status !== 'cancelled' && (
                    <>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-yellow-600 hover:text-yellow-700"
                        onClick={() => cancelMutation.mutate(listing._id)}
                        disabled={cancelMutation.isPending}
                      >
                        <X className="w-4 h-4 mr-1" />
                        取消
                      </Button>
                      {isAdmin && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-red-500 hover:text-red-600"
                          onClick={() => {
                            if (confirm('确定要删除此交易吗？')) {
                              deleteMutation.mutate(listing._id)
                            }
                          }}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </>
                  )}
                  {isAdmin && listing.status === 'cancelled' && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-red-500 hover:text-red-600"
                      onClick={() => {
                        if (confirm('确定要永久删除此交易吗？')) {
                          deleteMutation.mutate(listing._id)
                        }
                      }}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
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
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-center p-4 font-medium">订单号</th>
                  <th className="text-center p-4 font-medium">订单类型</th>
                  <th className="text-center p-4 font-medium">物品</th>
                  <th className="text-center p-4 font-medium">发布者</th>
                  <th className="text-center p-4 font-medium">价格</th>
                  <th className="text-center p-4 font-medium">状态</th>
                  <th className="text-center p-4 font-medium">创建时间</th>
                  <th className="text-center p-4 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                  {filteredListings.map((listing: TradeListing) => (
                  <tr key={listing._id} className="border-t hover:bg-muted/30 transition-colors">
                    <td className="p-4 text-center">
                      <span className="text-sm font-mono">{listing.orderNumber}</span>
                    </td>
                    <td className="p-4 text-center">
                      <Badge variant={listing.type === 'sell' ? 'destructive' : listing.type === 'buy' ? 'success' : 'default'}>
                        {listing.type === 'sell' ? '出售' : listing.type === 'buy' ? '求购' : '交换'}
                      </Badge>
                    </td>
                    <td className="p-4 text-center">
                      <div className="font-medium">
                        {listing.items?.map((i: any) => i.itemName || (i.item && typeof i.item === 'object' ? (i.item.itemName || i.item.name) : (typeof i.item === 'string' ? `物品 #${i.item.slice(0, 8)}` : '未知'))).join(', ') || '未指定物品'}
                      </div>
                      {listing.type === 'trade' && listing.requestedItems && listing.requestedItems.length > 0 && (
                        <div className="text-sm text-muted-foreground mt-1">
                          期望: {listing.requestedItems!.map((i: any) => `${i.itemName} x${i.quantity}`).join(', ')}
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-muted-foreground text-center">
                      {typeof listing.seller === 'object' ? listing.seller.username : `用户 #${typeof listing.seller === 'string' ? listing.seller.slice(0, 8) : '未知'}`}
                    </td>
                    <td className="p-4 font-medium text-center">
                      {listing.price > 0 ? formatCurrency(listing.price) : '-'}
                    </td>
                    <td className="p-4 text-center">
                      {listing.status === 'cancelled' ? (
                        <Badge variant="outline" className="text-red-500">已取消</Badge>
                      ) : (
                        <Badge variant="success">进行中</Badge>
                      )}
                    </td>
                    <td className="p-4 text-muted-foreground text-sm text-center">
                      {new Date(listing.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {listing.status !== 'cancelled' && !isOwnListing(listing) && (
                          <>
                            {sentInterests.has(listing._id) || sendInterestMutation.isPending ? (
                              <Button variant="ghost" size="sm" disabled>
                                <Send className="w-4 h-4 mr-1" />
                                已发送意向
                              </Button>
                            ) : (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleSendInterest(listing)}
                              >
                                <Send className="w-4 h-4 mr-1" />
                                有意向
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleFavoriteMutation.mutate(listing._id)}
                            >
                              <Heart className={`w-4 h-4 ${favorites.has(listing._id) ? 'fill-current text-red-500' : ''}`} />
                            </Button>
                          </>
                        )}
                        {listing.status !== 'cancelled' && isOwnListing(listing) && (
                          <Button variant="ghost" size="sm" disabled>
                            <ShoppingCart className="w-4 h-4 mr-1" />
                            自己的挂牌
                          </Button>
                        )}
                        {(isOwnListing(listing) || isAdmin) && listing.status !== 'cancelled' && (
                          <>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-yellow-600"
                              onClick={() => cancelMutation.mutate(listing._id)}
                              disabled={cancelMutation.isPending}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                            {isAdmin && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-red-500"
                                onClick={() => {
                                  if (confirm('确定要删除此交易吗？')) {
                                    deleteMutation.mutate(listing._id)
                                  }
                                }}
                                disabled={deleteMutation.isPending}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </>
                        )}
                        {isAdmin && listing.status === 'cancelled' && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-red-500"
                            onClick={() => {
                              if (confirm('确定要永久删除此交易吗？')) {
                                deleteMutation.mutate(listing._id)
                              }
                            }}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <TradeFormDialog 
        open={formOpen} 
        onOpenChange={setFormOpen} 
        listing={editingListing} 
      />
    </div>
  )
}