import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Store, Plus, DollarSign, ShoppingCart, Search, MapPin, Users2, Edit, Trash2 } from 'lucide-react'
import { shopService, Shop } from '@/services/api'
import { ShopFormDialog } from '@/components/shops/ShopFormDialog'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'


export function ShopsPage() {
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [editingShop, setEditingShop] = useState<Shop | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const navigate = useNavigate()
  
  const { data: shopsData, isLoading } = useQuery({
    queryKey: ['shops'],
    queryFn: () => shopService.getAll(),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => shopService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shops'] })
      toast.success('店铺删除成功')
    },
    onError: () => {
      toast.error('删除失败')
    },
  })

  const shops: Shop[] = shopsData?.data || []
  const filteredShops = shops.filter(shop => 
    shop.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalRevenue = shops.reduce((sum: number, s: Shop) => sum + (s.financialStats?.totalRevenue || 0), 0)
  const totalEmployees = shops.reduce((sum: number, s: Shop) => sum + (s.employees?.length || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">店铺管理</h1>
          <p className="text-muted-foreground mt-1">经营你的卡牌帝国，创造商业传奇</p>
        </div>
        <Button variant="premium" onClick={() => { setEditingShop(null); setFormOpen(true) }}>
          <Plus className="w-4 h-4 mr-2" />
          创建店铺
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Store className="w-4 h-4" />
              店铺数量
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? '...' : shops.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              总收入
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? '...' : formatCurrency(totalRevenue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              销售笔数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users2 className="w-4 h-4" />
              员工总数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? '...' : totalEmployees}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="搜索店铺..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Shops Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredShops.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">暂无店铺</p>
            <Button variant="outline" className="mt-4" onClick={() => { setEditingShop(null); setFormOpen(true) }}>
              <Plus className="w-4 h-4 mr-2" />
              创建店铺
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredShops.map((shop: Shop) => (
            <Card key={shop._id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Store className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {shop.name}
                        <Badge className="text-xs">营业中</Badge>
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        {shop.location?.address || '暂未设置地址'}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-2 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                    onClick={() => {
                      if (window.confirm('确定要删除这个店铺吗？')) {
                        deleteMutation.mutate(String(shop._id))
                      }
                    }}
                    title="删除店铺"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-4">
                  {shop.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{shop.description}</p>
                  )}
                  
                  {/* Financial stats */}
                  <div className="grid grid-cols-3 gap-4 pt-2">
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <p className="text-xs mb-1 text-muted-foreground">总收入</p>
                      <p className="text-lg font-bold">{formatCurrency(shop.financialStats?.totalRevenue || 0)}</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <p className="text-xs mb-1 text-muted-foreground">总支出</p>
                      <p className="text-lg font-bold">{formatCurrency(shop.financialStats?.totalExpenses || 0)}</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <p className="text-xs mb-1 text-muted-foreground">员工数</p>
                      <p className="text-lg font-bold">{shop.employees?.length || 0}</p>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => navigate(`/shops/${shop._id}/dashboard`)}
                    >
                      经营看板
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => { setEditingShop(shop); setFormOpen(true) }}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      管理店铺
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ShopFormDialog 
        open={formOpen} 
        onOpenChange={setFormOpen} 
        shop={editingShop} 
      />
    </div>
  )
}
