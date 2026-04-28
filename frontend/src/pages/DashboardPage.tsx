import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CreditCard, Users, Store, BookOpen, TrendingUp, ArrowRight } from 'lucide-react'
import { inventoryService } from '@/services/inventory'
import { formatCurrency } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'

export function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  // Fetch inventory stats
  const { data: inventoryStats, isLoading, error } = useQuery({
    queryKey: ['inventoryStats'],
    queryFn: () => inventoryService.getStats(),
    retry: 1,
  })

  const stats = [
    { title: '库存卡牌', value: inventoryStats?.data?.totalQuantity?.toString() || '0', icon: CreditCard, change: '+12%', color: 'from-blue-500 to-cyan-500' },
    { title: '总价值', value: formatCurrency(inventoryStats?.data?.totalValue || 0), icon: Store, change: '+18%', color: 'from-green-500 to-emerald-500' },
    { title: '物品种类', value: inventoryStats?.data?.itemTypes?.toString() || '0', icon: BookOpen, change: '+3', color: 'from-orange-500 to-red-500' },
    { title: '物品总数', value: inventoryStats?.data?.totalItems?.toString() || '0', icon: CreditCard, change: '+5', color: 'from-purple-500 to-pink-500' },
  ]

  const recentActivities = [
    { action: '添加了新卡牌', item: '青眼白龙', time: '2分钟前', type: 'inventory' },
    { action: '战队成员加入', item: '张三加入了你的战队', time: '1小时前', type: 'team' },
    { action: '完成交易', item: '出售黑魔术师 x3', time: '3小时前', type: 'trade' },
    { action: '创建新卡组', item: '标准卡组 #5', time: '昨天', type: 'deck' },
    { action: '店铺销售', item: '补充包 x10', time: '昨天', type: 'shop' },
  ]

  return (
    <div className="space-y-6">
      {/* Welcome section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">欢迎回来，{user?.username || '玩家'}！</h1>
          <p className="text-muted-foreground mt-1">这是你的卡牌管理概览</p>
        </div>
        <Button variant="premium" onClick={() => navigate('/inventory')}>
          快速添加卡牌
        </Button>
      </div>

      {/* Stats grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="relative overflow-hidden">
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-5`} />
            <CardHeader className="relative pb-2">
              <div className="flex items-center justify-between">
                <CardDescription>{stat.title}</CardDescription>
                <stat.icon className="w-5 h-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-2xl font-bold">{isLoading ? '...' : stat.value}</div>
              <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                {stat.change}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent activities */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>最近活动</CardTitle>
            <CardDescription>你最近的卡牌管理动态</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map((activity, index) => (
                <div key={index} className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    {activity.type === 'inventory' && <CreditCard className="w-5 h-5 text-primary" />}
                    {activity.type === 'team' && <Users className="w-5 h-5 text-primary" />}
                    {activity.type === 'trade' && <TrendingUp className="w-5 h-5 text-primary" />}
                    {activity.type === 'deck' && <BookOpen className="w-5 h-5 text-primary" />}
                    {activity.type === 'shop' && <Store className="w-5 h-5 text-primary" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{activity.action}</p>
                    <p className="text-sm text-muted-foreground truncate">{activity.item}</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{activity.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick actions */}
        <Card>
          <CardHeader>
            <CardTitle>快捷操作</CardTitle>
            <CardDescription>常用功能快速入口</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-between h-auto py-3" onClick={() => navigate('/inventory')}>
              <span className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                添加新卡牌
              </span>
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button variant="outline" className="w-full justify-between h-auto py-3" onClick={() => navigate('/teams')}>
              <span className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                管理战队
              </span>
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button variant="outline" className="w-full justify-between h-auto py-3" onClick={() => navigate('/shops')}>
              <span className="flex items-center gap-2">
                <Store className="w-4 h-4" />
                查看店铺
              </span>
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button variant="outline" className="w-full justify-between h-auto py-3" onClick={() => navigate('/decks')}>
              <span className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                创建卡组
              </span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Featured cards section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>珍贵收藏</CardTitle>
              <CardDescription>你最值钱的卡牌收藏</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/inventory')}>查看全部</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
            {[
              { name: '青眼白龙', rarity: 'UR', value: 2500, image: 'https://images.unsplash.com/photo-1635329388647-5c5e4a5d8c5e?w=300&h=420&fit=crop' },
              { name: '黑魔术师', rarity: 'SR', value: 1800, image: 'https://images.unsplash.com/photo-1601987177645-1e5b0e3b0e3b?w=300&h=420&fit=crop' },
              { name: '真红眼黑龙', rarity: 'UR', value: 2200, image: 'https://images.unsplash.com/photo-1635329388647-5c5e4a5d8c5e?w=300&h=420&fit=crop' },
              { name: '混沌帝龙', rarity: 'SSR', value: 3500, image: 'https://images.unsplash.com/photo-1601987177645-1e5b0e3b0e3b?w=300&h=420&fit=crop' },
            ].map((card, index) => (
              <div key={index} className="group relative aspect-[3/4] rounded-lg overflow-hidden bg-card border border-border card-hover">
                <img src={card.image} alt={card.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <Badge variant="default" className="mb-2">{card.rarity}</Badge>
                  <p className="font-semibold text-white">{card.name}</p>
                  <p className="text-sm text-white/80">¥{card.value}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
