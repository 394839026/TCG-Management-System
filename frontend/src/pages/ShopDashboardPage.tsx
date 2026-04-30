import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, TrendingUp, ShoppingCart, Package, Users, Calendar, BarChart, TrendingDown } from 'lucide-react';
import { shopService, Shop } from '@/services/api';
import { formatCurrency } from '@/lib/utils';
import { BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

export function ShopDashboardPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: shopData, isLoading } = useQuery({
    queryKey: ['shop', id],
    queryFn: () => shopService.getById(id!),
  });

  const { data: dashboardData } = useQuery({
    queryKey: ['shopDashboard', id],
    queryFn: () => shopService.getDashboard(id!),
  });

  const shop: Shop = shopData?.data || {} as Shop;

  const salesData = [
    { name: '周一', value: 1200 },
    { name: '周二', value: 1900 },
    { name: '周三', value: 1400 },
    { name: '周四', value: 2100 },
    { name: '周五', value: 2800 },
    { name: '周六', value: 3500 },
    { name: '周日', value: 2900 },
  ];

  const categoryData = [
    { name: '卡牌', value: 45, color: '#8b5cf6' },
    { name: '补充包', value: 30, color: '#06b6d4' },
    { name: '周边', value: 15, color: '#10b981' },
    { name: '其他', value: 10, color: '#6b7280' },
  ];

  const recentOrders = [
    { id: 'ORD001', customer: '玩家A', amount: 250, date: '今天 14:30', status: 'completed' },
    { id: 'ORD002', customer: '玩家B', amount: 180, date: '今天 11:20', status: 'completed' },
    { id: 'ORD003', customer: '玩家C', amount: 320, date: '昨天 16:45', status: 'pending' },
    { id: 'ORD004', customer: '玩家D', amount: 150, date: '昨天 09:10', status: 'completed' },
    { id: 'ORD005', customer: '玩家E', amount: 480, date: '2天前', status: 'completed' },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  if (!id || !shopData?.data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px]">
        <Package className="w-16 h-16 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">店铺不存在或已被删除</p>
        <Button onClick={() => navigate('/shops')} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回店铺列表
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/shops')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{shop.name}</h1>
            <p className="text-muted-foreground">{shop.location?.address || '暂无地址'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="px-3 py-1" style={{ background: 'hsl(35 90% 55% / 0.2)', color: 'hsl(35 90% 70%)' }}>
            营业中
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">今日销售额</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div className="text-2xl font-bold" style={{ color: 'hsl(35 90% 65%)' }}>
                {formatCurrency(dashboardData?.data?.todaySales || 12580)}
              </div>
              <div className="flex items-center gap-1 text-green-600 text-sm">
                <TrendingUp className="w-4 h-4" />
                +18%
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">本月销售额</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div className="text-2xl font-bold">
                {formatCurrency(dashboardData?.data?.monthSales || 89500)}
              </div>
              <div className="flex items-center gap-1 text-green-600 text-sm">
                <TrendingUp className="w-4 h-4" />
                +12%
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">订单数量</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div className="text-2xl font-bold">
                {dashboardData?.data?.orderCount || 42}
              </div>
              <div className="flex items-center gap-1 text-green-600 text-sm">
                <TrendingUp className="w-4 h-4" />
                +8%
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">库存预警</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div className="text-2xl font-bold text-amber-500">
                {dashboardData?.data?.lowStockCount || 5}
              </div>
              <div className="flex items-center gap-1 text-amber-600 text-sm">
                <TrendingDown className="w-4 h-4" />
                需补货
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>销售趋势</CardTitle>
            <CardDescription>本周每日销售额</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ReBarChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Bar 
                  dataKey="value" 
                  fill="hsl(35 90% 55%)" 
                  radius={[4, 4, 0, 0]}
                />
              </ReBarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>销售分类</CardTitle>
            <CardDescription>各类别销售占比</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `${value}%`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>最近订单</CardTitle>
                <CardDescription>近期完成的订单记录</CardDescription>
              </div>
              <Button variant="outline" size="sm">查看全部</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <ShoppingCart className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{order.id}</p>
                      <p className="text-sm text-muted-foreground">顾客: {order.customer}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(order.amount)}</p>
                      <p className="text-sm text-muted-foreground">{order.date}</p>
                    </div>
                    <Badge variant={order.status === 'completed' ? 'success' : 'secondary'}>
                      {order.status === 'completed' ? '已完成' : '处理中'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>快速操作</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full h-auto py-3" style={{ borderColor: 'hsl(30 25% 30%)' }}>
              <Package className="w-4 h-4 mr-2" />
              添加商品
            </Button>
            <Button variant="outline" className="w-full h-auto py-3" style={{ borderColor: 'hsl(30 25% 30%)' }}>
              <Users className="w-4 h-4 mr-2" />
              管理员工
            </Button>
            <Button variant="outline" className="w-full h-auto py-3" style={{ borderColor: 'hsl(30 25% 30%)' }}>
              <Calendar className="w-4 h-4 mr-2" />
              设置营业时间
            </Button>
            <Button variant="outline" className="w-full h-auto py-3" style={{ borderColor: 'hsl(30 25% 30%)' }}>
              <BarChart className="w-4 h-4 mr-2" />
              财务报表
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
