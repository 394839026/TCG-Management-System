import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CreditCard, Users, Store, BookOpen, TrendingUp, ArrowRight, Trophy, Coins, Sparkles, CalendarCheck } from 'lucide-react';
import { inventoryService } from '@/services/inventory';
import { activityService, Activity } from '@/services/activity';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { levelSystemService } from '@/services/levelSystem';
import { authService } from '@/services/auth';
import { toast } from 'sonner';

export function DashboardPage() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // 计算等级信息
  const level = user?.level || 1;
  const exp = user?.exp || 0;
  const expNeeded = level >= 100 ? Infinity : 100;
  const expProgress = level >= 100 ? 100 : Math.min(100, Math.floor((exp / expNeeded) * 100));
  const canCheckIn = user?.canCheckIn !== undefined ? user.canCheckIn : true;
  const totalCheckIns = user?.totalCheckIns || 0;

  // Fetch inventory stats
  const { data: inventoryStats, isLoading } = useQuery({
    queryKey: ['inventoryStats'],
    queryFn: () => inventoryService.getStats(),
    retry: 1,
  });

  // Fetch recent activities
  const { data: activitiesData } = useQuery({
    queryKey: ['recentActivities'],
    queryFn: () => activityService.getRecent(),
    retry: 1,
  });

  const stats = [
    { title: '总价值', value: formatCurrency(inventoryStats?.data?.totalValue || 0), icon: Store, change: '+18%', color: 'from-green-500 to-emerald-500' },
    { title: '物品种类', value: inventoryStats?.data?.itemTypes?.toString() || '0', icon: BookOpen, change: '+3', color: 'from-orange-500 to-red-500' },
    { title: '物品总数', value: inventoryStats?.data?.totalItems?.toString() || '0', icon: CreditCard, change: '+5', color: 'from-purple-500 to-pink-500' },
  ];

  const username = user?.username || '玩家';
    const recentActivities: Activity[] = activitiesData?.data || [
      { action: '欢迎' + username + '来到这里！', item: '', time: '刚刚', type: 'inventory', _id: '1', createdAt: new Date().toISOString() },
    ];

  // 签到 mutation
  const checkInMutation = useMutation({
    mutationFn: levelSystemService.checkIn,
    onSuccess: (result) => {
      console.log('✅ 签到成功:', result);
      toast.success(result.message);
      
      // 更新用户信息
      if (user) {
        const updatedUser = {
          ...user,
          exp: result.data.newExp,
          level: result.data.newLevel,
          canCheckIn: false,
          totalCheckIns: result.data.totalCheckIns,
        };
        setUser(updatedUser);
        authService.setAuth(localStorage.getItem('token'), updatedUser);
      }
      
      queryClient.invalidateQueries({ queryKey: ['inventoryStats'] });
    },
    onError: (error: any) => {
      console.error('❌ 签到失败:', error);
      toast.error(error.response?.data?.message || '签到失败');
    },
  });

  return (
    <div className="space-y-6">
      {/* Profile section */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-primary/20 via-accent/10 to-primary/20 p-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-3xl font-bold text-white">
              {user?.username?.charAt(0) || '玩'}
            </div>
            <div className="flex-1 space-y-3">
              <h1 className="text-2xl font-bold">{user?.username || '玩家'}</h1>
              <p className="text-muted-foreground">
                {user?.role === 'superadmin' ? '超级管理员' : user?.role === 'admin' ? '管理员' : '普通玩家'}
              </p>
              
              {/* Level and XP section */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-full">
                  <Trophy className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-primary">Lv.{level}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      经验值
                    </span>
                    <span className="font-medium">{exp} / {level >= 100 ? '已满级' : expNeeded}</span>
                  </div>
                  <Progress value={expProgress} className="h-3" />
                </div>
              </div>
              
              {/* Points section */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 bg-amber-500/10 px-3 py-1.5 rounded-full">
                  <Coins className="w-4 h-4 text-amber-500" />
                  <span className="font-semibold text-amber-600">{user?.points || 0} 积分</span>
                </div>
                <div className="flex items-center gap-2 bg-blue-500/10 px-3 py-1.5 rounded-full">
                  <CalendarCheck className="w-4 h-4 text-blue-500" />
                  <span className="font-semibold text-blue-600">累计签到 {totalCheckIns} 天</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Button 
                variant="outline" 
                onClick={() => navigate('/settings')}
              >
                编辑资料
              </Button>
              <Button 
                onClick={() => checkInMutation.mutate()}
                disabled={!canCheckIn || checkInMutation.isPending}
                className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600"
              >
                {checkInMutation.isPending ? '签到中...' : !canCheckIn ? '今日已签到' : '每日签到'}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Stats grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-emerald-500 opacity-5" />
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
                我的库存
              </span>
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button variant="outline" className="w-full justify-between h-auto py-3" onClick={() => navigate('/teams')}>
              <span className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                我的战队
              </span>
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button variant="outline" className="w-full justify-between h-auto py-3" onClick={() => navigate('/shops')}>
              <span className="flex items-center gap-2">
                <Store className="w-4 h-4" />
                店铺清单
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
    </div>
  );
}
