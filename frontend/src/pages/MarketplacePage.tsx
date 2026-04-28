import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Search, Filter, ShoppingCart, MessageCircle } from 'lucide-react'
import { tradeService, TradeListing } from '@/services/api'
import { formatCurrency } from '@/lib/utils'
import { TradeFormDialog } from '@/components/marketplace/TradeFormDialog'

export function MarketplacePage() {
  const [formOpen, setFormOpen] = useState(false)
  const [editingListing, setEditingListing] = useState<TradeListing | null>(null)
  const { data: listingsData, isLoading } = useQuery({
    queryKey: ['tradeListings'],
    queryFn: () => tradeService.getListings(),
  })

  const listings: TradeListing[] = listingsData?.data || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">交易市场</h1>
          <p className="text-muted-foreground mt-1">买卖和交换卡牌</p>
        </div>
        <Button variant="premium" onClick={() => { setEditingListing(null); setFormOpen(true) }}>
          <ShoppingCart className="w-4 h-4 mr-2" />
          发布交易
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="搜索交易..." className="pl-10" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">全部</Button>
              <Button variant="outline" size="sm">出售</Button>
              <Button variant="outline" size="sm">求购</Button>
              <Button variant="outline" size="sm">交换</Button>
            </div>
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              筛选
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Listings */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : listings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">暂无交易信息，点击"发布交易"开始</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {listings.map((listing: TradeListing) => (
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
                    </div>
                    <CardTitle className="text-lg">
                      {listing.items?.map((i: any) => `物品 #${typeof i.item === 'string' ? i.item.slice(0, 8) : '未知'}`).join(', ') || '未指定物品'}
                    </CardTitle>
                    <CardDescription>卖家: 用户 #{typeof listing.seller === 'string' ? listing.seller.slice(0, 8) : '未知'}</CardDescription>
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
                  <Button className="flex-1">
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    {listing.type === 'sell' ? '购买' : listing.type === 'buy' ? '出售' : '联系'}
                  </Button>
                  <Button variant="outline">
                    <MessageCircle className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <TradeFormDialog 
        open={formOpen} 
        onOpenChange={setFormOpen} 
        listing={editingListing} 
      />
    </div>
  )
}
