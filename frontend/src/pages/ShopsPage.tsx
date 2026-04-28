import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Store, Plus, DollarSign, ShoppingCart, TrendingUp, Search, MapPin, Users2, BarChart3, Briefcase, ArrowUpRight } from 'lucide-react'
import { shopService, Shop } from '@/services/api'
import { ShopFormDialog } from '@/components/shops/ShopFormDialog'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'

export function ShopsPage() {
  const [formOpen, setFormOpen] = useState(false)
  const [editingShop, setEditingShop] = useState<Shop | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  
  const { data: shopsData, isLoading } = useQuery({
    queryKey: ['shops'],
    queryFn: () => shopService.getAll(),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => shopService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shops'] })
      toast.success('店铺已删除')
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
    <div className="min-h-screen" style={{ background: 'hsl(var(--shop-bg))' }}>
      {/* Hero Section */}
      <div className="relative overflow-hidden border-b border-amber-500/20" style={{ 
        background: 'linear-gradient(135deg, hsl(30 25% 10%) 0%, hsl(35 30% 18%) 50%, hsl(25 35% 15%) 100%)'
      }}>
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-10 right-20 w-80 h-80 rounded-full blur-3xl" style={{ background: 'hsl(35 90% 55% / 0.3)' }}></div>
          <div className="absolute bottom-10 left-10 w-72 h-72 rounded-full blur-3xl" style={{ background: 'hsl(45 95% 65% / 0.2)' }}></div>
        </div>
        
        <div className="relative container mx-auto px-6 py-12">
          <div className="flex items-center justify-between flex-wrap gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-3 rounded-xl" style={{ background: 'hsl(35 90% 55% / 0.2)' }}>
                  <Store className="w-8 h-8" style={{ color: 'hsl(35 90% 65%)' }} />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-white">店铺管理</h1>
                  <p className="text-amber-200/80 mt-1">经营你的卡牌帝国，创造商业传奇</p>
                </div>
              </div>
            </div>
            <Button 
              onClick={() => { setEditingShop(null); setFormOpen(true) }}
              className="px-6 py-3 text-base font-semibold shadow-lg transition-all hover:scale-105"
              style={{ 
                background: 'linear-gradient(135deg, hsl(35 90% 55%), hsl(35 85% 65%))',
                boxShadow: '0 8px 32px hsl(35 90% 55% / 0.4)'
              }}
            >
              <Plus className="w-5 h-5 mr-2" />
              创建店铺
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-4">
          <Card className="border-0 shadow-xl card-hover" style={{ 
            background: 'linear-gradient(135deg, hsl(30 20% 16%), hsl(30 18% 19%))',
            borderColor: 'hsl(30 25% 25%)'
          }}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg" style={{ background: 'hsl(35 90% 55% / 0.15)' }}>
                  <Store className="w-5 h-5" style={{ color: 'hsl(35 90% 65%)' }} />
                </div>
                <ArrowUpRight className="w-5 h-5 text-green-400" />
              </div>
              <CardTitle className="text-sm font-medium mt-3" style={{ color: 'hsl(30 20% 55%)' }}>店铺数量</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{isLoading ? '...' : shops.length}</div>
              <p className="text-xs mt-2" style={{ color: 'hsl(30 20% 45%)' }}>运营中的店铺</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl card-hover" style={{ 
            background: 'linear-gradient(135deg, hsl(30 20% 16%), hsl(30 18% 19%))',
            borderColor: 'hsl(30 25% 25%)'
          }}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg" style={{ background: 'hsl(45 95% 65% / 0.15)' }}>
                  <DollarSign className="w-5 h-5" style={{ color: 'hsl(45 95% 70%)' }} />
                </div>
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
              <CardTitle className="text-sm font-medium mt-3" style={{ color: 'hsl(30 20% 55%)' }}>总收入</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" style={{ color: 'hsl(45 95% 65%)' }}>{isLoading ? '...' : formatCurrency(totalRevenue)}</div>
              <p className="text-xs mt-2" style={{ color: 'hsl(30 20% 45%)' }}>累计营收总额</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl card-hover" style={{ 
            background: 'linear-gradient(135deg, hsl(30 20% 16%), hsl(30 18% 19%))',
            borderColor: 'hsl(30 25% 25%)'
          }}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg" style={{ background: 'hsl(15 85% 60% / 0.15)' }}>
                  <ShoppingCart className="w-5 h-5" style={{ color: 'hsl(15 85% 65%)' }} />
                </div>
                <BarChart3 className="w-5 h-5 text-blue-400" />
              </div>
              <CardTitle className="text-sm font-medium mt-3" style={{ color: 'hsl(30 20% 55%)' }}>销售笔数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">0</div>
              <p className="text-xs mt-2" style={{ color: 'hsl(30 20% 45%)' }}>已完成交易</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl card-hover" style={{ 
            background: 'linear-gradient(135deg, hsl(30 20% 16%), hsl(30 18% 19%))',
            borderColor: 'hsl(30 25% 25%)'
          }}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg" style={{ background: 'hsl(190 70% 50% / 0.15)' }}>
                  <Users2 className="w-5 h-5" style={{ color: 'hsl(190 70% 60%)' }} />
                </div>
                <Briefcase className="w-5 h-5 text-purple-400" />
              </div>
              <CardTitle className="text-sm font-medium mt-3" style={{ color: 'hsl(30 20% 55%)' }}>员工总数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{isLoading ? '...' : totalEmployees}</div>
              <p className="text-xs mt-2" style={{ color: 'hsl(30 20% 45%)' }}>在职员工数量</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'hsl(30 20% 40%)' }} />
            <Input 
              placeholder="搜索店铺..." 
              className="pl-10 border-0"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ 
                background: 'hsl(30 25% 18%)',
                color: 'hsl(30 20% 90%)'
              }}
            />
          </div>
        </div>

        {/* Shops Grid */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-amber-500 border-t-transparent"></div>
          </div>
        ) : filteredShops.length === 0 ? (
          <Card className="border-0 py-16" style={{ background: 'hsl(30 25% 16%)' }}>
            <CardContent className="text-center">
              <Store className="w-16 h-16 mx-auto mb-4 opacity-30" style={{ color: 'hsl(30 25% 40%)' }} />
              <p className="text-lg font-medium mb-2" style={{ color: 'hsl(30 20% 50%)' }}>暂无店铺</p>
              <p className="text-sm" style={{ color: 'hsl(30 20% 40%)' }}>点击"创建店铺"开始你的商业征程</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {filteredShops.map((shop: Shop) => (
              <Card key={shop._id} className="border-0 shadow-xl card-hover group relative overflow-hidden" style={{ 
                background: 'linear-gradient(135deg, hsl(30 20% 16%), hsl(30 18% 19%))',
                borderColor: 'hsl(30 25% 25%)'
              }}>
                {/* Gold glow effect on hover */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{
                  background: 'radial-gradient(circle at 50% 0%, hsl(35 90% 55% / 0.15), transparent 70%)'
                }}></div>
                
                <CardHeader className="pb-4 relative">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{
                        background: 'linear-gradient(135deg, hsl(35 90% 55%), hsl(45 95% 65%))',
                        boxShadow: '0 4px 16px hsl(35 90% 55% / 0.3)'
                      }}>
                        <Store className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-xl text-white flex items-center gap-2">
                          {shop.name}
                          <Badge className="text-xs" style={{ 
                            background: 'hsl(35 90% 55% / 0.2)',
                            color: 'hsl(35 90% 70%)'
                          }}>
                            营业中
                          </Badge>
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-2 text-sm" style={{ color: 'hsl(30 20% 50%)' }}>
                          <MapPin className="w-4 h-4" />
                          {shop.location || '暂未设置地址'}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="relative">
                  <div className="space-y-4">
                    {shop.description && (
                      <p className="text-sm line-clamp-2" style={{ color: 'hsl(30 20% 55%)' }}>{shop.description}</p>
                    )}
                    
                    {/* Financial stats */}
                    <div className="grid grid-cols-3 gap-4 pt-2">
                      <div className="text-center p-3 rounded-lg" style={{ background: 'hsl(30 25% 20%)' }}>
                        <p className="text-xs mb-1" style={{ color: 'hsl(30 20% 50%)' }}>总收入</p>
                        <p className="text-lg font-bold" style={{ color: 'hsl(45 95% 65%)' }}>
                          {formatCurrency(shop.financialStats?.totalRevenue || 0)}
                        </p>
                      </div>
                      <div className="text-center p-3 rounded-lg" style={{ background: 'hsl(30 25% 20%)' }}>
                        <p className="text-xs mb-1" style={{ color: 'hsl(30 20% 50%)' }}>总支出</p>
                        <p className="text-lg font-bold text-white">
                          {formatCurrency(shop.financialStats?.totalExpenses || 0)}
                        </p>
                      </div>
                      <div className="text-center p-3 rounded-lg" style={{ background: 'hsl(30 25% 20%)' }}>
                        <p className="text-xs mb-1" style={{ color: 'hsl(30 20% 50%)' }}>员工数</p>
                        <p className="text-lg font-bold text-white">{shop.employees?.length || 0}</p>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 transition-all hover:scale-105"
                        onClick={() => navigate(`/shops/${shop._id}/dashboard`)}
                        style={{ 
                          borderColor: 'hsl(30 25% 30%)',
                          color: 'hsl(30 20% 80%)'
                        }}
                      >
                        经营看板
                      </Button>
                      <Button 
                        size="sm" 
                        className="flex-1 transition-all hover:scale-105"
                        onClick={() => { setEditingShop(shop); setFormOpen(true) }}
                        style={{ 
                          background: 'linear-gradient(135deg, hsl(35 90% 55%), hsl(35 85% 65%))'
                        }}
                      >
                        管理店铺
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <ShopFormDialog 
        open={formOpen} 
        onOpenChange={setFormOpen} 
        shop={editingShop} 
      />
    </div>
  )
}
