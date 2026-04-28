import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Heart, Bell, BellOff, Search, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface FavoriteItem {
  _id: string;
  name: string;
  itemType: string;
  rarity: string;
  currentPrice: number;
  previousPrice: number;
  priceChange: number;
  hasAlert: boolean;
  alertPrice?: number;
  createdAt: string;
}

const mockFavorites: FavoriteItem[] = [
  {
    _id: '1',
    name: '青眼白龙',
    itemType: '怪兽卡',
    rarity: 'UR',
    currentPrice: 2500,
    previousPrice: 2300,
    priceChange: 8.7,
    hasAlert: true,
    alertPrice: 2600,
    createdAt: '2026-04-20',
  },
  {
    _id: '2',
    name: '黑魔术师',
    itemType: '怪兽卡',
    rarity: 'SR',
    currentPrice: 1800,
    previousPrice: 1850,
    priceChange: -2.7,
    hasAlert: false,
    createdAt: '2026-04-18',
  },
  {
    _id: '3',
    name: '真红眼黑龙',
    itemType: '怪兽卡',
    rarity: 'UR',
    currentPrice: 2200,
    previousPrice: 2100,
    priceChange: 4.8,
    hasAlert: true,
    alertPrice: 2400,
    createdAt: '2026-04-15',
  },
  {
    _id: '4',
    name: '混沌帝龙',
    itemType: '怪兽卡',
    rarity: 'SSR',
    currentPrice: 3500,
    previousPrice: 3600,
    priceChange: -2.8,
    hasAlert: false,
    createdAt: '2026-04-10',
  },
];

export function FavoritesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'favorites' | 'alerts'>('favorites');
  const [alertPrice, setAlertPrice] = useState<Record<string, number>>({});
  const queryClient = useQueryClient();

  const favorites: FavoriteItem[] = mockFavorites.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const alerts = favorites.filter(item => item.hasAlert);

  const toggleAlertMutation = useMutation({
    mutationFn: (itemId: string) => {
      toast.success('提醒设置已更新');
      return Promise.resolve({ success: true });
    },
  });

  const setAlertMutation = useMutation({
    mutationFn: ({ itemId, price }: { itemId: string; price: number }) => {
      setAlertPrice(prev => ({ ...prev, [itemId]: 0 }));
      toast.success(`价格提醒已设置: ¥${price}`);
      return Promise.resolve({ success: true });
    },
  });

  const removeFavoriteMutation = useMutation({
    mutationFn: (itemId: string) => {
      toast.success('已从收藏中移除');
      return Promise.resolve({ success: true });
    },
  });

  const formatCurrency = (value: number) => {
    return `¥${value.toLocaleString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">我的收藏</h1>
          <p className="text-muted-foreground mt-1">追踪你关注的卡牌价格</p>
        </div>
      </div>

      <div className="flex gap-2 border-b">
        <Button
          variant={activeTab === 'favorites' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('favorites')}
          className="rounded-b-none"
        >
          <Heart className="w-4 h-4 mr-2" />
          收藏列表
          <Badge variant="secondary" className="ml-2">{favorites.length}</Badge>
        </Button>
        <Button
          variant={activeTab === 'alerts' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('alerts')}
          className="rounded-b-none"
        >
          <Bell className="w-4 h-4 mr-2" />
          价格提醒
          {alerts.length > 0 && (
            <Badge variant="destructive" className="ml-2">{alerts.length}</Badge>
          )}
        </Button>
      </div>

      {activeTab === 'favorites' && (
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索收藏的卡牌..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {activeTab === 'favorites' && (
          favorites.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="py-12 text-center">
                <Heart className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">暂无收藏</p>
                <p className="text-sm text-muted-foreground mt-1">在库存页面点击收藏按钮添加卡牌</p>
              </CardContent>
            </Card>
          ) : (
            favorites.map((item) => (
              <Card key={item._id} className="card-hover">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{item.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={item.rarity === 'UR' ? 'default' : item.rarity === 'SR' ? 'secondary' : 'outline'}>
                          {item.rarity}
                        </Badge>
                        <span className="text-sm text-muted-foreground">{item.itemType}</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500"
                      onClick={() => removeFavoriteMutation.mutate(item._id)}
                    >
                      <Heart className="w-4 h-4 fill-current" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">当前价格</p>
                      <p className="text-2xl font-bold">{formatCurrency(item.currentPrice)}</p>
                    </div>
                    <div className={`flex items-center gap-1 px-3 py-2 rounded-lg ${item.priceChange >= 0 ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
                      {item.priceChange >= 0 ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                      <span className="font-medium">{item.priceChange >= 0 ? '+' : ''}{item.priceChange.toFixed(1)}%</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Button
                      variant={item.hasAlert ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleAlertMutation.mutate(item._id)}
                      className="flex-1"
                    >
                      {item.hasAlert ? (
                        <Bell className="w-4 h-4 mr-2" />
                      ) : (
                        <BellOff className="w-4 h-4 mr-2" />
                      )}
                      {item.hasAlert ? '已开启提醒' : '开启提醒'}
                    </Button>
                    {item.hasAlert && (
                      <Badge variant="secondary" className="ml-2">
                        目标: ¥{item.alertPrice}
                      </Badge>
                    )}
                  </div>

                  {!item.hasAlert && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground mb-2">设置价格提醒</p>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          placeholder="目标价格"
                          className="flex-1 text-sm"
                          value={alertPrice[item._id] || ''}
                          onChange={(e) => setAlertPrice(prev => ({ ...prev, [item._id]: Number(e.target.value) }))}
                        />
                        <Button
                          size="sm"
                          onClick={() => setAlertMutation.mutate({ itemId: item._id, price: alertPrice[item._id] })}
                          disabled={!alertPrice[item._id]}
                        >
                          <Bell className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )
        )}

        {activeTab === 'alerts' && (
          alerts.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="py-12 text-center">
                <Bell className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">暂无价格提醒</p>
                <p className="text-sm text-muted-foreground mt-1">在收藏列表中开启价格提醒</p>
              </CardContent>
            </Card>
          ) : (
            alerts.map((item) => (
              <Card key={item._id} className="card-hover border-l-4 border-amber-500">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                        <AlertCircle className="w-5 h-5 text-amber-500" />
                      </div>
                      <div>
                        <h3 className="font-medium">{item.name}</h3>
                        <p className="text-sm text-muted-foreground">提醒价格: ¥{item.alertPrice}</p>
                      </div>
                    </div>
                    <Badge variant="secondary">
                      {item.currentPrice >= (item.alertPrice || 0) ? '已达到' : '追踪中'}
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">当前价格: {formatCurrency(item.currentPrice)}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleAlertMutation.mutate(item._id)}
                    >
                      <BellOff className="w-4 h-4 mr-1" />
                      关闭提醒
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )
        )}
      </div>
    </div>
  );
}
