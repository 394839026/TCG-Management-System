import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import {
  Package,
  Ticket,
  Gift,
  CreditCard,
  CheckCircle2,
  Clock,
  XCircle,
  Copy,
  Check,
  Trash2,
  RefreshCw,
  Filter,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Key,
  Calendar,
  Tag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface BackpackItem {
  _id: string;
  userId: string;
  storeItemId: {
    _id: string;
    itemName: string;
    description: string;
    image: string;
    price: number;
    currencyType: string;
  } | null;
  itemName: string;
  itemDescription: string;
  redemptionCode: string;
  itemType: 'physical' | 'digital' | 'coupon' | 'membership' | 'other';
  quantity: number;
  status: 'unused' | 'used' | 'expired';
  expirationDate: string | null;
  usedAt: string | null;
  acquiredFrom: string;
  additionalInfo: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

const ITEM_TYPE_CONFIG = {
  physical: { label: '实物物品', icon: Package, color: 'bg-orange-500' },
  digital: { label: '数字物品', icon: Gift, color: 'bg-purple-500' },
  coupon: { label: '优惠券', icon: Ticket, color: 'bg-green-500' },
  membership: { label: '会员资格', icon: CreditCard, color: 'bg-blue-500' },
  other: { label: '其他', icon: Sparkles, color: 'bg-gray-500' }
};

const STATUS_CONFIG = {
  unused: { label: '未使用', icon: Clock, color: 'bg-green-500', textColor: 'text-green-600', bgColor: 'bg-green-50' },
  used: { label: '已使用', icon: CheckCircle2, color: 'bg-blue-500', textColor: 'text-blue-600', bgColor: 'bg-blue-50' },
  expired: { label: '已过期', icon: XCircle, color: 'bg-red-500', textColor: 'text-red-600', bgColor: 'bg-red-50' }
};

export function BackpackPage() {
  const [activeFilter, setActiveFilter] = useState<'all' | 'unused' | 'used' | 'expired'>('all');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: backpackItems, isLoading, refetch } = useQuery({
    queryKey: ['backpack', activeFilter],
    queryFn: async () => {
      const params = activeFilter !== 'all' ? `?status=${activeFilter}` : '';
      const response = await api.get(`/backpack/my${params}`);
      return response.data.data as BackpackItem[];
    }
  });

  const { data: countData } = useQuery({
    queryKey: ['backpack-count'],
    queryFn: async () => {
      const response = await api.get('/backpack/my/count');
      return response.data.data as { unused: number; used: number; expired: number };
    }
  });

  const useItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const response = await api.post(`/backpack/use/${itemId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backpack'] });
      queryClient.invalidateQueries({ queryKey: ['backpack-count'] });
      toast.success('兑换码已使用');
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message || '使用失败');
    }
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const response = await api.delete(`/backpack/${itemId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backpack'] });
      queryClient.invalidateQueries({ queryKey: ['backpack-count'] });
      toast.success('物品已删除');
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message || '删除失败');
    }
  });

  const copyToClipboard = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success('兑换码已复制');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const toggleExpand = (itemId: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const handleUseItem = (itemId: string) => {
    if (window.confirm('确定要使用这个兑换码吗？')) {
      useItemMutation.mutate(itemId);
    }
  };

  const handleDeleteItem = (itemId: string) => {
    if (window.confirm('确定要删除这个物品吗？此操作不可撤销。')) {
      deleteItemMutation.mutate(itemId);
    }
  };

  const filteredItems = backpackItems || [];
  const totalCount = filteredItems.length;

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">我的背包</h1>
            <p className="text-muted-foreground mt-1">查看和管理您兑换获得的物品兑换码</p>
          </div>
          <Button onClick={() => refetch()} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            刷新
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="text-center">
            <CardContent className="pt-4">
              <div className="text-3xl font-bold text-foreground">{countData?.unused || 0}</div>
              <div className="text-sm text-muted-foreground">未使用</div>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-4">
              <div className="text-3xl font-bold text-blue-600">{countData?.used || 0}</div>
              <div className="text-sm text-muted-foreground">已使用</div>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-4">
              <div className="text-3xl font-bold text-red-600">{countData?.expired || 0}</div>
              <div className="text-sm text-muted-foreground">已过期</div>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center gap-2 mb-6">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <div className="flex gap-2">
            {(['all', 'unused', 'used', 'expired'] as const).map(filter => (
              <Button
                key={filter}
                variant={activeFilter === filter ? 'default' : 'outline'}
                onClick={() => setActiveFilter(filter)}
              >
                {filter === 'all' ? '全部' : STATUS_CONFIG[filter].label}
                {filter !== 'all' && countData && ` (${countData[filter] || 0})`}
              </Button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : totalCount === 0 ? (
          <Card className="text-center py-12">
            <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground">背包空空如也</h3>
            <p className="text-muted-foreground mt-2">去智库兑换中心兑换一些物品吧！</p>
            <Button className="mt-4" onClick={() => window.location.href = '/platform-store'}>
              去兑换
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredItems.map(item => {
              const typeConfig = ITEM_TYPE_CONFIG[item.itemType];
              const statusConfig = STATUS_CONFIG[item.status];
              const TypeIcon = typeConfig.icon;
              const StatusIcon = statusConfig.icon;
              const isExpanded = expandedItems.has(item._id);

              return (
                <Card key={item._id} className={cn(
                  'transition-all duration-200',
                  item.status === 'expired' && 'opacity-60'
                )}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        'w-14 h-14 rounded-lg flex items-center justify-center shrink-0',
                        typeConfig.color + '/10'
                      )}>
                        <TypeIcon className={cn('w-7 h-7', typeConfig.color.replace('bg-', 'text-'))} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-foreground truncate">
                            {item.itemName}
                          </h3>
                          <Badge className={typeConfig.color}>
                            {typeConfig.label}
                          </Badge>
                          <Badge className={cn(statusConfig.bgColor, statusConfig.textColor, 'border-0')}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusConfig.label}
                          </Badge>
                        </div>
                        
                        {item.itemDescription && (
                          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                            {item.itemDescription}
                          </p>
                        )}
                        
                        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            获得于 {new Date(item.createdAt).toLocaleDateString()}
                          </span>
                          {item.expirationDate && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              到期 {new Date(item.expirationDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleExpand(item._id)}
                        className="shrink-0"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
                        )}
                      </Button>
                    </div>
                    
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-border space-y-4">
                        <div className="bg-muted/50 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-foreground">兑换码</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(item.redemptionCode)}
                              className="gap-1"
                            >
                              {copiedCode === item.redemptionCode ? (
                                <>
                                  <Check className="w-4 h-4" />
                                  已复制
                                </>
                              ) : (
                                <>
                                  <Copy className="w-4 h-4" />
                                  复制
                                </>
                              )}
                            </Button>
                          </div>
                          <div className="font-mono text-lg tracking-wider text-foreground break-all">
                            {item.redemptionCode}
                          </div>
                        </div>
                        
                        {item.storeItemId && (
                          <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                            {item.storeItemId.image ? (
                              <img
                                src={item.storeItemId.image}
                                alt={item.storeItemId.itemName}
                                className="w-12 h-12 rounded object-cover"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                                <Tag className="w-6 h-6 text-muted-foreground" />
                              </div>
                            )}
                            <div>
                              <div className="text-sm font-medium text-foreground">
                                来源: {item.storeItemId.itemName}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                兑换价格: {item.storeItemId.currencyType === 'points' ? '积分' : '星币'} {item.storeItemId.price}
                              </div>
                            </div>
                          </div>
                        )}
                        
                        <div className="flex gap-2">
                          {item.status === 'unused' && (
                            <>
                              <Button
                                onClick={() => handleUseItem(item._id)}
                                disabled={useItemMutation.isLoading}
                                className="gap-2"
                              >
                                <Key className="w-4 h-4" />
                                使用兑换码
                              </Button>
                            </>
                          )}
                          <Button
                            variant="outline"
                            onClick={() => handleDeleteItem(item._id)}
                            disabled={deleteItemMutation.isLoading}
                            className="gap-2"
                          >
                            <Trash2 className="w-4 h-4" />
                            删除
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}