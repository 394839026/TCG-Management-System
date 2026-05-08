import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { platformStoreService, teamService, PlatformStoreItem, PlatformStoreRedemption, Team } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { ShoppingCart, Gift, Star, Sparkles, Coins, Timer, Package, Users } from 'lucide-react'

// 工具函数：日期格式化
const formatDate = (dateString?: string) => {
  if (!dateString) return null
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 获取商品类型对应的图标
const getItemIcon = (itemType: string) => {
  switch (itemType) {
    case 'inventory_item': return Package
    case 'points': return Sparkles
    case 'exp': return Star
    case 'badge': return Star
    case 'title': return Gift
    default: return Package
  }
}

// 获取支付方式对应的图标
const getCurrencyIcon = (currencyType: string) => {
  switch (currencyType) {
    case 'points': return Star
    case 'coins': return Coins
    default: return Star
  }
}

// 获取商品类型对应的文本
const getItemTypeText = (itemType: string) => {
  switch (itemType) {
    case 'inventory_item': return '物品'
    case 'points': return '积分'
    case 'exp': return '经验'
    case 'badge': return '徽章'
    case 'title': return '称号'
    default: return '其他'
  }
}

// 获取支付方式对应的文本
const getCurrencyText = (currencyType: string) => {
  switch (currencyType) {
    case 'points': return '积分'
    case 'coins': return '星币'
    default: return '积分'
  }
}

// 获取允许兑换的文本
const getAllowedForText = (allowedFor: string) => {
  switch (allowedFor) {
    case 'personal': return '仅限个人'
    case 'team': return '仅限战队'
    case 'both': return '两者均可'
    default: return '两者均可'
  }
}

export function PlatformStorePage() {
  const { user, setUser } = useAuth()
  const queryClient = useQueryClient()
  const [selectedItem, setSelectedItem] = useState<PlatformStoreItem | null>(null)
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState<string>('')
  const [teamDetailTab, setTeamDetailTab] = useState<'shop' | 'history'>('shop')
  const [activeSourceTab, setActiveSourceTab] = useState<'shop' | 'team'>('shop')

  // 获取商店商品列表
  const { data: storeItemsData, isLoading: isItemsLoading } = useQuery({
    queryKey: ['platformStoreItems'],
    queryFn: platformStoreService.getStoreItems,
  })

  // 获取我的兑换记录
  const { data: redemptionsData, isLoading: isRedemptionsLoading } = useQuery({
    queryKey: ['platformStoreRedemptions'],
    queryFn: platformStoreService.getMyRedemptions,
  })

  // 获取我的战队
  const { data: myTeamsData, isLoading: isTeamsLoading, error: teamsError } = useQuery({
    queryKey: ['myTeams'],
    queryFn: async () => {
      try {
        const result = await teamService.getMyTeams();
        console.log('API返回的原始数据:', result);
        return result;
      } catch (err) {
        console.error('API请求错误:', err);
        throw err;
      }
    },
  })

  // 获取战队兑换记录
  const { data: teamRedemptionsData, isLoading: isTeamRedemptionsLoading, refetch: refetchTeamRedemptions } = useQuery({
    queryKey: ['teamStoreRedemptions', selectedTeam],
    queryFn: () => platformStoreService.getTeamRedemptions(selectedTeam!),
    enabled: !!selectedTeam,
  })

  // 获取选中战队的详情
  const { data: selectedTeamData } = useQuery({
    queryKey: ['selectedTeam', selectedTeam],
    queryFn: () => teamService.getById(selectedTeam!),
    enabled: !!selectedTeam,
  })

  // 兑换商品
  const redeemMutation = useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity: number }) =>
      platformStoreService.redeemStoreItem(id, quantity),
    onSuccess: (response) => {
      toast.success('兑换成功！')
      setShowDetailDialog(false)
      queryClient.invalidateQueries({ queryKey: ['platformStoreItems'] })
      queryClient.invalidateQueries({ queryKey: ['platformStoreRedemptions'] })
      
      // 更新用户星币/积分
      if (response.success && response.data.user && user && setUser) {
        const updatedUser = {
          ...user,
          points: response.data.user.points,
          coins: response.data.user.coins
        }
        setUser(updatedUser)
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || '兑换失败')
    },
  })

  // 战队兑换商品
  const teamRedeemMutation = useMutation({
    mutationFn: ({ teamId, id, quantity }: { teamId: string; id: string; quantity: number }) =>
      platformStoreService.teamRedeemStoreItem(teamId, id, quantity),
    onSuccess: (response) => {
      toast.success('战队兑换成功！')
      setShowDetailDialog(false)
      queryClient.invalidateQueries({ queryKey: ['platformStoreItems'] })
      queryClient.invalidateQueries({ queryKey: ['teamStoreRedemptions', selectedTeam] })
      queryClient.invalidateQueries({ queryKey: ['selectedTeam', selectedTeam] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || '战队兑换失败')
    },
  })

  // 显示商品详情
  const handleViewDetail = (item: PlatformStoreItem, source: 'shop' | 'team' = 'shop') => {
    setSelectedItem(item)
    setActiveSourceTab(source)
    setShowDetailDialog(true)
  }

  // 处理兑换
  const handleRedeem = (item: PlatformStoreItem, quantity: number = 1) => {
    if (window.confirm(`确定要兑换 ${item.itemName} ${quantity > 1 ? `× ${quantity}` : ''} 吗？`)) {
      redeemMutation.mutate({ id: item._id, quantity })
    }
  }

  // 处理战队兑换
  const handleTeamRedeem = (item: PlatformStoreItem, quantity: number = 1) => {
    if (!selectedTeam) {
      toast.error('请先选择战队')
      return
    }
    if (window.confirm(`确定要使用战队积分兑换 ${item.itemName} ${quantity > 1 ? `× ${quantity}` : ''} 吗？`)) {
      teamRedeemMutation.mutate({ teamId: selectedTeam, id: item._id, quantity })
    }
  }

  const storeItems: PlatformStoreItem[] = storeItemsData?.data || []
  const redemptions: PlatformStoreRedemption[] = redemptionsData?.data || []
  const myTeams: Team[] = myTeamsData?.data || []
  const teamRedemptions: PlatformStoreRedemption[] = teamRedemptionsData?.data || []
  const selectedTeamInfo: Team | null = selectedTeamData?.data || null

  console.log('战队数据调试:', { 
    isTeamsLoading, 
    myTeamsLength: myTeams.length, 
    myTeams,
    user: user?._id
  })

  // 检查用户是否是队长
  const isTeamOwner = (team: Team) => {
    // team.owner 可能是对象（因为后端populate了），也可能是字符串
    let ownerId: string;
    if (typeof team.owner === 'object' && team.owner !== null) {
      ownerId = String(team.owner._id);
    } else {
      ownerId = String(team.owner);
    }
    const userIdStr = String(user?._id);
    console.log(`检查 ${team.name} 的队长：`, {
      teamOwner: ownerId,
      userId: userIdStr,
      equal: ownerId === userIdStr
    });
    return ownerId === userIdStr;
  }

  // 过滤出用户是队长的战队
  const myOwnedTeams = myTeams.filter(team => isTeamOwner(team))
  
  console.log('队长战队过滤结果：', myOwnedTeams)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ShoppingCart className="w-8 h-8 text-primary" />
            智库兑换窗口
          </h1>
          <p className="text-muted-foreground mt-1">
            使用积分或星币兑换你喜欢的物品
          </p>
        </div>
      </div>

      {/* 用户余额显示 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              我的积分
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-yellow-600">
              {user?.points?.toLocaleString() || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Coins className="w-5 h-5 text-amber-500" />
              我的星币
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-amber-600">
              {user?.coins?.toLocaleString() || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="shop" className="space-y-6">
        <TabsList>
          <TabsTrigger value="shop">
            <ShoppingCart className="w-4 h-4 mr-2" />
            商店
          </TabsTrigger>
          <TabsTrigger value="history">
            <Timer className="w-4 h-4 mr-2" />
            兑换记录
          </TabsTrigger>
          {/* 临时始终显示战队页签便于测试 */}
          <TabsTrigger value="team">
            <Users className="w-4 h-4 mr-2" />
            战队兑换
          </TabsTrigger>
        </TabsList>

        {/* 商店标签页 */}
        <TabsContent value="shop">
          {isItemsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : storeItems.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">暂无商品</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {storeItems
                // 只显示允许个人兑换的商品
                .filter(item => {
                  const allowedFor = item.allowedFor || 'both';
                  return allowedFor === 'both' || allowedFor === 'personal';
                })
                .map((item) => {
                const Icon = getItemIcon(item.itemType)
                const CurrencyIcon = getCurrencyIcon(item.currencyType)
                const isOutOfStock = item.stock > 0 && item.redeemedCount >= item.stock
                const canAffordPoints = item.currencyType === 'points' && user?.points >= item.price
                const canAffordCoins = item.currencyType === 'coins' && user?.coins >= item.price
                const canAfford = canAffordPoints || canAffordCoins

                return (
                  <Card
                    key={item._id}
                    className={`overflow-hidden transition-all hover:shadow-lg ${isOutOfStock ? 'opacity-60' : ''}`}
                  >
                    {item.image && (
                      <div className="h-40 bg-cover bg-center" style={{ backgroundImage: `url(${item.image})` }} />
                    )}
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Icon className="w-5 h-5 text-primary" />
                            {item.itemName}
                          </CardTitle>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline">{getItemTypeText(item.itemType)}</Badge>
                            <Badge variant="outline">
                              <CurrencyIcon className="w-3 h-3 mr-1" />
                              {item.price} {getCurrencyText(item.currencyType)}
                            </Badge>
                            <Badge variant="outline">
                              {getAllowedForText(item.allowedFor || 'both')}
                            </Badge>
                            {item.itemQuantity > 1 && (
                              <Badge variant="outline">×{item.itemQuantity}</Badge>
                            )}
                          </div>
                        </div>
                        {item.tags?.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {item.tags.slice(0, 2).map((tag, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    {item.description && (
                      <CardContent className="pb-2">
                        <p className="text-muted-foreground text-sm line-clamp-2">{item.description}</p>
                      </CardContent>
                    )}
                    <CardContent>
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-sm text-muted-foreground">
                          {item.stock > 0 ? (
                            <span>库存: {item.redeemedCount}/{item.stock}</span>
                          ) : item.stock === 0 ? (
                            <span className="text-red-500">已售罄</span>
                          ) : (
                            <span>无限库存</span>
                          )}
                        </div>
                        {item.limitPerUser > 0 && (
                          <span className="text-xs text-muted-foreground">每人限兑: {item.limitPerUser}</span>
                        )}
                      </div>
                      <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    onClick={() => handleViewDetail(item, 'shop')}
                                    className="flex-1"
                                  >
                                    查看详情
                                  </Button>
                                  <Button
                                    onClick={() => handleRedeem(item)}
                                    disabled={isOutOfStock || !canAfford || redeemMutation.isPending}
                                    className="flex-1"
                                  >
                                    <Gift className="w-4 h-4 mr-2" />
                                    立即兑换
                                  </Button>
                                </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* 兑换记录标签页 */}
        <TabsContent value="history">
          {isRedemptionsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : redemptions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Timer className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">暂无兑换记录</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {redemptions.map((redemption) => {
                const CurrencyIcon = getCurrencyIcon(redemption.currencyType)
                return (
                  <Card key={redemption._id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg">{redemption.itemName}</CardTitle>
                        <Badge
                          variant={redemption.status === 'completed' ? 'default' : 'outline'}
                        >
                          {redemption.status === 'completed' ? '已完成' :
                            redemption.status === 'pending' ? '待处理' :
                            redemption.status === 'failed' ? '失败' : '已退款'}
                        </Badge>
                      </div>
                      <CardDescription>{formatDate(redemption.createdAt)}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <CurrencyIcon className="w-4 h-4" />
                          <span>消耗: {redemption.price} {getCurrencyText(redemption.currencyType)}</span>
                          {redemption.quantity > 1 && (
                            <span className="text-sm">× {redemption.quantity}</span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          总计: {redemption.price * redemption.quantity} {getCurrencyText(redemption.currencyType)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* 战队兑换标签页 */}
        {/* 临时始终显示战队页签内容便于测试 */}
        <TabsContent value="team">
            {/* 调试信息 */}
            <div className={`mb-4 p-4 border rounded-md ${teamsError ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
              <h4 className={`font-medium mb-2 ${teamsError ? 'text-red-800' : 'text-yellow-800'}`}>调试信息</h4>
              <p className={`text-sm ${teamsError ? 'text-red-700' : 'text-yellow-700'}`}>
                正在加载: {isTeamsLoading ? '是' : '否'} | 
                找到战队数: {myTeams.length} | 
                作为队长的战队数: {myOwnedTeams.length}
              </p>
              {teamsError && (
                <div className="mt-2 p-2 bg-red-100 rounded text-xs text-red-800">
                  <strong>错误信息:</strong> {String(teamsError)}
                </div>
              )}
              {myTeams.length > 0 && (
                <div className="mt-2 text-xs text-yellow-600">
                  <strong>战队列表:</strong>
                  <ul className="list-disc list-inside mt-1">
                    {myTeams.map((team, i) => (
                      <li key={i}>{team.name} (ID: {team._id}, 队长: {isTeamOwner(team) ? '是' : '否'})</li>
                    ))}
                  </ul>
                </div>
              )}
              {myTeams.length === 0 && !isTeamsLoading && !teamsError && (
                <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-800">
                  <strong>提示:</strong> 你还没有加入任何战队，请先创建或加入一个战队！
                </div>
              )}
            </div>

            {/* 选择战队 */}
            <div className="mb-6">
              <Label>选择战队</Label>
              <Select 
                value={selectedTeam} 
                onValueChange={(value) => {
                  setSelectedTeam(value)
                  setTeamDetailTab('shop')
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="请选择战队" />
                </SelectTrigger>
                <SelectContent>
                  {/* 先显示所有战队，方便调试 */}
                  {myTeams.map((team) => (
                    <SelectItem key={team._id} value={team._id as string}>
                      {team.name} {isTeamOwner(team) ? '(队长)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedTeam && selectedTeamInfo ? (
              <>
                {/* 战队积分显示 */}
                <Card className="mb-6">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Star className="w-5 h-5 text-blue-500" />
                      战队积分
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-blue-600">
                      {selectedTeamInfo.currentPoints?.toLocaleString() || 0}
                    </p>
                  </CardContent>
                </Card>

                {/* 战队详情标签页 */}
                <Tabs defaultValue="shop" value={teamDetailTab} onValueChange={(v) => setTeamDetailTab(v as 'shop' | 'history')}>
                  <TabsList>
                    <TabsTrigger value="shop">
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      商店
                    </TabsTrigger>
                    <TabsTrigger value="history">
                      <Timer className="w-4 h-4 mr-2" />
                      战队兑换记录
                    </TabsTrigger>
                  </TabsList>

                  {/* 战队商店标签页 */}
                  <TabsContent value="shop" className="mt-4">
                    {isItemsLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                      </div>
                    ) : storeItems.length === 0 ? (
                      <Card>
                        <CardContent className="py-12 text-center">
                          <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground">暂无商品</p>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {storeItems
                          // 只显示允许战队兑换的商品
                          .filter(item => {
                            const allowedFor = item.allowedFor || 'both';
                            return allowedFor === 'both' || allowedFor === 'team';
                          })
                          .map((item) => {
                          const Icon = getItemIcon(item.itemType)
                          const CurrencyIcon = getCurrencyIcon(item.currencyType)
                          const isOutOfStock = item.stock > 0 && item.redeemedCount >= item.stock
                          const canAfford = item.currencyType === 'points' && (selectedTeamInfo.currentPoints || 0) >= item.price

                          return (
                            <Card
                              key={item._id}
                              className={`overflow-hidden transition-all hover:shadow-lg ${isOutOfStock ? 'opacity-60' : ''}`}
                            >
                              {item.image && (
                                <div className="h-40 bg-cover bg-center" style={{ backgroundImage: `url(${item.image})` }} />
                              )}
                              <CardHeader className="pb-2">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                      <Icon className="w-5 h-5 text-primary" />
                                      {item.itemName}
                                    </CardTitle>
                                    <div className="flex gap-2 mt-1">
                                      <Badge variant="outline">{getItemTypeText(item.itemType)}</Badge>
                                      <Badge variant="outline">
                                        <CurrencyIcon className="w-3 h-3 mr-1" />
                                        {item.price} {getCurrencyText(item.currencyType)}
                                      </Badge>
                                      <Badge variant="outline">
                                        {getAllowedForText(item.allowedFor || 'both')}
                                      </Badge>
                                      {item.itemQuantity > 1 && (
                                        <Badge variant="outline">×{item.itemQuantity}</Badge>
                                      )}
                                    </div>
                                  </div>
                                  {item.tags?.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                      {item.tags.slice(0, 2).map((tag, i) => (
                                        <Badge key={i} variant="outline" className="text-xs">
                                          {tag}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </CardHeader>
                              {item.description && (
                                <CardContent className="pb-2">
                                  <p className="text-muted-foreground text-sm line-clamp-2">{item.description}</p>
                                </CardContent>
                              )}
                              <CardContent>
                                <div className="flex items-center justify-between mb-3">
                                  <div className="text-sm text-muted-foreground">
                                    {item.stock > 0 ? (
                                      <span>库存: {item.redeemedCount}/{item.stock}</span>
                                    ) : item.stock === 0 ? (
                                      <span className="text-red-500">已售罄</span>
                                    ) : (
                                      <span>无限库存</span>
                                    )}
                                  </div>
                                  {item.limitPerUser > 0 && (
                                    <span className="text-xs text-muted-foreground">每队限兑: {item.limitPerUser}</span>
                                  )}
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    onClick={() => handleViewDetail(item, 'team')}
                                    className="flex-1"
                                  >
                                    查看详情
                                  </Button>
                                  <Button
                                    onClick={() => handleTeamRedeem(item)}
                                    disabled={isOutOfStock || !canAfford || teamRedeemMutation.isPending || item.currencyType !== 'points'}
                                    className="flex-1"
                                  >
                                    <Gift className="w-4 h-4 mr-2" />
                                    战队兑换
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          )
                        })}
                      </div>
                    )}
                  </TabsContent>

                  {/* 战队兑换记录标签页 */}
                  <TabsContent value="history" className="mt-4">
                    {isTeamRedemptionsLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                      </div>
                    ) : teamRedemptions.length === 0 ? (
                      <Card>
                        <CardContent className="py-12 text-center">
                          <Timer className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground">暂无战队兑换记录</p>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="space-y-4">
                        {teamRedemptions.map((redemption) => {
                          const CurrencyIcon = getCurrencyIcon(redemption.currencyType)
                          return (
                            <Card key={redemption._id}>
                              <CardHeader className="pb-2">
                                <div className="flex items-start justify-between">
                                  <CardTitle className="text-lg">{redemption.itemName}</CardTitle>
                                  <Badge
                                    variant={redemption.status === 'completed' ? 'default' : 'outline'}
                                  >
                                    {redemption.status === 'completed' ? '已完成' :
                                      redemption.status === 'pending' ? '待处理' :
                                      redemption.status === 'failed' ? '失败' : '已退款'}
                                  </Badge>
                                </div>
                                <CardDescription>{formatDate(redemption.createdAt)}</CardDescription>
                              </CardHeader>
                              <CardContent>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <CurrencyIcon className="w-4 h-4" />
                                    <span>消耗: {redemption.price} {getCurrencyText(redemption.currencyType)}</span>
                                    {redemption.quantity > 1 && (
                                      <span className="text-sm">× {redemption.quantity}</span>
                                    )}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    总计: {redemption.price * redemption.quantity} {getCurrencyText(redemption.currencyType)}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          )
                        })}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">请选择一个战队</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
      </Tabs>

      {/* 商品详情对话框 */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="sm:max-w-lg">
          {selectedItem && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedItem.itemName}</DialogTitle>
              </DialogHeader>
              {selectedItem.image && (
                <div className="h-64 bg-cover bg-center rounded-md" style={{ backgroundImage: `url(${selectedItem.image})` }} />
              )}
              <div className="space-y-4">
                {selectedItem.description && (
                  <p className="text-muted-foreground">{selectedItem.description}</p>
                )}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label>类型</Label>
                    <p className="font-medium">{getItemTypeText(selectedItem.itemType)}</p>
                  </div>
                  <div>
                    <Label>价格</Label>
                    <p className="font-medium flex items-center gap-1">
                      {(() => {
                        const CurrencyIcon = getCurrencyIcon(selectedItem.currencyType)
                        return <CurrencyIcon className="w-4 h-4" />
                      })()}
                      {selectedItem.price} {getCurrencyText(selectedItem.currencyType)}
                    </p>
                  </div>
                  <div>
                    <Label>兑换获得</Label>
                    <p className="font-medium">×{selectedItem.itemQuantity}</p>
                  </div>
                  <div>
                    <Label>库存</Label>
                    <p className="font-medium">
                      {selectedItem.stock === -1 ? '无限' : `${selectedItem.redeemedCount}/${selectedItem.stock}`}
                    </p>
                  </div>
                  {selectedItem.limitPerUser > 0 && (
                    <div>
                      <Label>每人限兑</Label>
                      <p className="font-medium">{selectedItem.limitPerUser}</p>
                    </div>
                  )}
                </div>
                {selectedItem.tags?.length > 0 && (
                  <div>
                    <Label>标签</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedItem.tags.map((tag, i) => (
                        <Badge key={i} variant="outline">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
                  取消
                </Button>
                {activeSourceTab === 'shop' ? (
                  <Button
                    onClick={() => handleRedeem(selectedItem)}
                    disabled={redeemMutation.isPending}
                  >
                    <Gift className="w-4 h-4 mr-2" />
                    立即兑换
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleTeamRedeem(selectedItem)}
                    disabled={teamRedeemMutation.isPending || !selectedTeam || selectedItem.currencyType !== 'points'}
                  >
                    <Gift className="w-4 h-4 mr-2" />
                    战队兑换
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
