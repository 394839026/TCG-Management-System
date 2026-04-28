import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Check, X, Star, Clock, ShoppingCart, MessageCircle, ThumbsUp } from 'lucide-react';
import { tradeService, TradeListing } from '@/services/api';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';

export function TradeHistoryPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'completed' | 'pending' | 'cancelled'>('all');
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [editingTrade, setEditingTrade] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: listingsData, isLoading } = useQuery({
    queryKey: ['tradeListings'],
    queryFn: () => tradeService.getListings(),
  });

  const submitReviewMutation = useMutation({
    mutationFn: () => {
      setEditingTrade(null);
      setRating(0);
      setReview('');
      return Promise.resolve({ success: true });
    },
    onSuccess: () => {
      toast.success('评价提交成功');
    },
  });

  const listings: TradeListing[] = listingsData?.data || [];

  const mockTrades = [
    {
      id: 'TRADE001',
      type: 'sell' as const,
      item: '青眼白龙',
      quantity: 1,
      price: 2500,
      status: 'completed' as const,
      buyer: '玩家A',
      date: '2026-04-27',
      reviewed: false,
    },
    {
      id: 'TRADE002',
      type: 'buy' as const,
      item: '黑魔术师',
      quantity: 3,
      price: 540,
      status: 'completed' as const,
      seller: '玩家B',
      date: '2026-04-26',
      reviewed: true,
    },
    {
      id: 'TRADE003',
      type: 'trade' as const,
      item: '真红眼黑龙',
      quantity: 1,
      price: 0,
      status: 'pending' as const,
      partner: '玩家C',
      date: '2026-04-28',
      reviewed: false,
    },
    {
      id: 'TRADE004',
      type: 'sell' as const,
      item: '补充包',
      quantity: 10,
      price: 300,
      status: 'cancelled' as const,
      buyer: '玩家D',
      date: '2026-04-25',
      reviewed: false,
    },
  ];

  const filteredTrades = mockTrades.filter(trade => {
    if (activeTab === 'all') return true;
    return trade.status === activeTab;
  });

  const statusConfig: Record<string, { label: string; color: string; icon: typeof Check }> = {
    completed: { label: '已完成', color: 'bg-green-500/20 text-green-500', icon: Check },
    pending: { label: '进行中', color: 'bg-amber-500/20 text-amber-500', icon: Clock },
    cancelled: { label: '已取消', color: 'bg-red-500/20 text-red-500', icon: X },
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">交易历史</h1>
        <p className="text-muted-foreground mt-1">查看和管理你的交易记录</p>
      </div>

      <div className="flex gap-2 border-b">
        {(['all', 'completed', 'pending', 'cancelled'] as const).map((tab) => (
          <Button
            key={tab}
            variant={activeTab === tab ? 'default' : 'ghost'}
            onClick={() => setActiveTab(tab)}
            className="rounded-b-none capitalize"
          >
            {tab === 'all' ? '全部' : tab === 'completed' ? '已完成' : tab === 'pending' ? '进行中' : '已取消'}
            <Badge variant="secondary" className="ml-2">
              {tab === 'all' ? mockTrades.length : mockTrades.filter(t => t.status === tab).length}
            </Badge>
          </Button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {filteredTrades.map((trade) => {
          const status = statusConfig[trade.status];
          const StatusIcon = status.icon;
          
          return (
            <Card key={trade.id} className="card-hover">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{trade.id}</CardTitle>
                    <CardDescription>
                      {trade.type === 'sell' ? '出售' : trade.type === 'buy' ? '求购' : '交换'} · {trade.item} x{trade.quantity}
                    </CardDescription>
                  </div>
                  <Badge className={status.color}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {status.label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {trade.type === 'sell' ? '买家' : trade.type === 'buy' ? '卖家' : '交易伙伴'}: {trade.buyer || trade.seller || trade.partner}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">{trade.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-primary">
                      {trade.price > 0 ? formatCurrency(trade.price) : '交换'}
                    </p>
                  </div>
                </div>

                {trade.status === 'completed' && !trade.reviewed && editingTrade === trade.id && (
                  <div className="p-4 rounded-lg bg-muted/50 space-y-4">
                    <h4 className="font-medium">评价交易</h4>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setRating(star)}
                          className="focus:outline-none"
                        >
                          <Star
                            className={`w-8 h-8 cursor-pointer transition-colors ${
                              rating >= star ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                    <Input
                      placeholder="写下你的评价..."
                      value={review}
                      onChange={(e) => setReview(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setEditingTrade(null)}
                      >
                        取消
                      </Button>
                      <Button
                        onClick={() => submitReviewMutation.mutate()}
                        disabled={rating === 0}
                      >
                        <ThumbsUp className="w-4 h-4 mr-2" />
                        提交评价
                      </Button>
                    </div>
                  </div>
                )}

                {trade.status === 'completed' && trade.reviewed && (
                  <div className="p-3 rounded-lg bg-green-500/10">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-green-600">已评价</span>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  {trade.status === 'completed' && !trade.reviewed && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setEditingTrade(trade.id)}
                    >
                      <Star className="w-4 h-4 mr-2" />
                      评价
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    联系对方
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    再次交易
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
