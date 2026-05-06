import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, TrendingUp, ShoppingCart, Package, Users, Calendar, BarChart, TrendingDown, Store, Globe, Zap, LayoutDashboard, Plus, Minus } from 'lucide-react';
import { shopService, Shop, ShopType } from '@/services/api';
import { formatCurrency } from '@/lib/utils';
import { BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { OrderDialog } from '@/components/shops/OrderDialog';

const getShopTypeLabel = (type: ShopType) => {
  const labels = {
    physical: '真实店铺',
    online: '线上店铺',
    virtual: '虚拟店铺'
  }
  return labels[type]
}

const getShopTypeIcon = (type: ShopType) => {
  switch (type) {
    case 'physical':
      return <Store className="w-8 h-8 text-primary" />
    case 'online':
      return <Globe className="w-8 h-8 text-blue-500" />
    case 'virtual':
      return <Zap className="w-8 h-8 text-purple-500" />
    default:
      return <Store className="w-8 h-8 text-primary" />
  }
}

const getShopTypeBadgeColor = (type: ShopType) => {
  const colors = {
    physical: 'bg-blue-100 text-blue-800',
    online: 'bg-green-100 text-green-800',
    virtual: 'bg-purple-100 text-purple-800'
  }
  return colors[type]
}

interface OrderItem {
  shelfItem: any;
  quantity: number;
}

export function ShopDashboardPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [activeShelfId, setActiveShelfId] = useState<string | null>(null);
  
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  const addToOrderFromCard = (item: any) => {
    const existingIndex = orderItems.findIndex(
      orderItem => orderItem.shelfItem.inventoryItem._id === item.inventoryItem._id
    );
    
    if (existingIndex >= 0) {
      const newItems = [...orderItems];
      if (newItems[existingIndex].quantity < item.quantity) {
        newItems[existingIndex].quantity += 1;
        setOrderItems(newItems);
      }
    } else {
      setOrderItems([...orderItems, { shelfItem: item, quantity: 1 }]);
    }
  };

  const { data: shopData, isLoading } = useQuery({
    queryKey: ['shop', id],
    queryFn: () => shopService.getById(id!),
  });

  const { data: shelvesData } = useQuery({
    queryKey: ['shopShelves', id],
    queryFn: () => shopService.getShelves(id!),
    enabled: !!id && !isAdmin, // 只在非管理员时获取货架
  });

  const { data: dashboardData } = useQuery({
    queryKey: ['shopDashboard', id],
    queryFn: () => shopService.getDashboard(id!),
    enabled: isAdmin, // 只在管理员时获取看板
  });

  const shop: Shop = shopData?.data || {} as Shop;
  
  // 自动设置第一个货架为激活状态
  useEffect(() => {
    if (shelvesData?.data?.length > 0 && !activeShelfId) {
      setActiveShelfId(shelvesData.data[0]._id);
    }
  }, [shelvesData, activeShelfId]);

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
      {/* 店铺封面和头部 */}
      {shop.coverImage && (
        <div className="h-48 rounded-lg bg-cover bg-center" style={{ backgroundImage: `url(${shop.coverImage})` }} />
      )}
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/shops')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden">
              {shop.logo ? (
                <img src={shop.logo} alt={shop.name} className="w-full h-full object-cover" />
              ) : (
                getShopTypeIcon(shop.type || 'physical')
              )}
            </div>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                {shop.name}
                <Badge className={`px-3 py-1 ${getShopTypeBadgeColor(shop.type || 'physical')}`}>
                  {getShopTypeLabel(shop.type || 'physical')}
                </Badge>
              </h1>
              {/* 地址信息只在真实店铺和虚拟店铺显示 */}
              {(shop.type !== 'online') && (
                (shop.location?.province || shop.location?.city || shop.location?.address) && (
                  <p className="text-muted-foreground">
                    {[
                      shop.location?.province,
                      shop.location?.city,
                      shop.location?.address
                    ].filter(Boolean).join(' ')}
                    {shop.location?.postalCode && <span className="ml-1">({shop.location.postalCode})</span>}
                  </p>
                )
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="px-3 py-1" style={{ background: 'hsl(35 90% 55% / 0.2)', color: 'hsl(35 90% 70%)' }}>
            营业中
          </Badge>
        </div>
      </div>

      {/* 店铺描述和信息 - 所有用户都可以看 */}
      <div className="grid gap-4 md:grid-cols-2">
        {shop.description && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">关于我们</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{shop.description}</p>
            </CardContent>
          </Card>
        )}
        
        {/* 联系信息 - 线上店铺和虚拟店铺显示 */}
        {shop.type !== 'online' && (shop.contactInfo?.phone || shop.contactInfo?.email || shop.contactInfo?.website || 
          shop.contactInfo?.socialMedia?.wechat || shop.contactInfo?.socialMedia?.qq) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">联系方式</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {shop.contactInfo?.phone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="font-medium">电话:</span> {shop.contactInfo.phone}
                </div>
              )}
              {shop.contactInfo?.email && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="font-medium">邮箱:</span> {shop.contactInfo.email}
                </div>
              )}
              {shop.contactInfo?.website && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="font-medium">网站:</span> <a href={shop.contactInfo.website} className="text-primary hover:underline" target="_blank">{shop.contactInfo.website}</a>
                </div>
              )}
              {shop.contactInfo?.socialMedia?.wechat && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="font-medium">微信:</span> {shop.contactInfo.socialMedia.wechat}
                </div>
              )}
              {shop.contactInfo?.socialMedia?.qq && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="font-medium">QQ:</span> {shop.contactInfo.socialMedia.qq}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* 营业时间只在真实店铺显示 */}
      {shop.type === 'physical' && (shop.businessHours?.openTime || shop.businessHours?.closeTime) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">营业时间</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              <span>{shop.businessHours.openTime} - {shop.businessHours.closeTime}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 管理员专属内容 */}
      {isAdmin ? (
        <>
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
        </>
      ) : (
        // 普通用户看到的货架展示
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">店铺货架</h2>
            <Button onClick={() => setOrderDialogOpen(true)}>
              <ShoppingCart className="w-4 h-4 mr-2" />
              订购商品
              {orderItems.length > 0 && (
                <Badge className="ml-2 bg-white text-primary">{orderItems.reduce((sum, item) => sum + item.quantity, 0)}</Badge>
              )}
            </Button>
          </div>
          
          {shelvesData?.data?.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <LayoutDashboard className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">暂无货架</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* 货架页签 */}
              <div className="flex gap-2 border-b overflow-x-auto pb-1">
                {shelvesData?.data?.map((shelf: any) => (
                  <Button
                    key={shelf._id}
                    variant={activeShelfId === shelf._id ? 'default' : 'ghost'}
                    onClick={() => setActiveShelfId(shelf._id)}
                    className="whitespace-nowrap"
                  >
                    <LayoutDashboard className="w-4 h-4 mr-2" />
                    {shelf.name}
                  </Button>
                ))}
              </div>

              {/* 当前货架内容 */}
              {shelvesData?.data?.map((shelf: any) => {
                if (shelf._id !== activeShelfId) return null;
                
                return (
                  <div key={shelf._id}>
                    {shelf.description && (
                      <p className="text-muted-foreground mb-4">{shelf.description}</p>
                    )}
                    
                    {shelf.items?.length === 0 ? (
                      <Card>
                        <CardContent className="py-12 text-center">
                          <LayoutDashboard className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground">货架暂无商品</p>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {shelf.items.map((item: any) => {
                          const inOrder = orderItems.some(
                            orderItem => orderItem.shelfItem.inventoryItem._id === item.inventoryItem._id
                          );
                          const orderItem = orderItems.find(
                            orderItem => orderItem.shelfItem.inventoryItem._id === item.inventoryItem._id
                          );
                          
                          return (
                            <Card key={item._id} className="border-2 hover:border-primary transition-colors">
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                  <div className="space-y-1">
                                    <p className="font-medium">{item.inventoryItem?.template?.itemName}</p>
                                    {item.inventoryItem?.template?.runeCardInfo?.cardNumber && (
                                      <p className="text-xs text-muted-foreground">编号: {item.inventoryItem.template.runeCardInfo.cardNumber}</p>
                                    )}
                                    <p className="text-sm text-muted-foreground">数量: {item.quantity}</p>
                                  </div>
                                  <div className="text-right flex flex-col items-end gap-2">
                                    <p className="text-lg font-bold text-primary">
                                      {formatCurrency(item.inventoryItem?.price)}
                                    </p>
                                    <div className="flex items-center gap-1">
                                      {inOrder ? (
                                        <>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                              const newItems = [...orderItems];
                                              const index = newItems.findIndex(
                                                i => i.shelfItem.inventoryItem._id === item.inventoryItem._id
                                              );
                                              if (index >= 0) {
                                                if (newItems[index].quantity > 1) {
                                                  newItems[index].quantity -= 1;
                                                } else {
                                                  newItems.splice(index, 1);
                                                }
                                                setOrderItems(newItems);
                                              }
                                            }}
                                            className="h-8 w-8 p-0"
                                          >
                                            <Minus className="w-3 h-3" />
                                          </Button>
                                          <Button
                                            size="sm"
                                            onClick={() => addToOrderFromCard(item)}
                                            disabled={item.quantity <= 0 || (orderItem?.quantity || 0) >= item.quantity}
                                            className="px-3"
                                          >
                                            <span className="flex items-center gap-1">
                                              <Plus className="w-3 h-3" />
                                              {orderItem?.quantity || 0}
                                            </span>
                                          </Button>
                                        </>
                                      ) : (
                                        <Button
                                          size="sm"
                                          onClick={() => addToOrderFromCard(item)}
                                          disabled={item.quantity <= 0}
                                        >
                                          <Plus className="w-4 h-4" />
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                {item.inventoryItem?.addedBy?.username && (
                                  <p className="text-xs text-muted-foreground mt-2">
                                    来源: {item.inventoryItem.addedBy.username}
                                  </p>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}
      
      <OrderDialog
        open={orderDialogOpen}
        onOpenChange={setOrderDialogOpen}
        shopId={id || ''}
        shopName={shop.name}
        shelves={shelvesData?.data || []}
        initialOrderItems={orderItems}
        onOrderItemsChange={setOrderItems}
      />
    </div>
  );
}
