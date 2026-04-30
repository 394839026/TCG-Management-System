import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Users, Crown, X, Search, Send, Boxes, Edit2, Check, UserPlus, Coins, Clock, DollarSign, PlusCircle, Gift, Key } from 'lucide-react'
import { teamService, teamInventoryService, Team, DonationRecord, InvestmentRecord } from '@/services/api'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'

export function TeamDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, setUser } = useAuth()
  const [inviteEmail, setInviteEmail] = useState('')
  const [activeTab, setActiveTab] = useState<'members' | 'requests' | 'invites' | 'inventory' | 'donations' | 'funds' | 'borrowRecords'>('members')
  const [activeRequestTab, setActiveRequestTab] = useState<'join' | 'donation' | 'borrow'>('join')
  const [showDonateDialog, setShowDonateDialog] = useState(false)
  const [donateAmount, setDonateAmount] = useState('')
  const [donateMessage, setDonateMessage] = useState('')
  const [showAddInvestmentDialog, setShowAddInvestmentDialog] = useState(false)
  const [investmentAmount, setInvestmentAmount] = useState('')
  const [investmentDescription, setInvestmentDescription] = useState('')
  const [investmentType, setInvestmentType] = useState<'income' | 'expense'>('income')
  const [showBorrowDialog, setShowBorrowDialog] = useState(false)
  const [selectedBorrowItem, setSelectedBorrowItem] = useState<any>(null)
  const [borrowQuantity, setBorrowQuantity] = useState('1')
  const [borrowNote, setBorrowNote] = useState('')
  const [borrowReturnDate, setBorrowReturnDate] = useState('')
  const queryClient = useQueryClient();

  const { data: teamData, isLoading } = useQuery({
    queryKey: ['team', id],
    queryFn: () => teamService.getById(id!),
  });

  const { data: requestsData, refetch: refetchRequests } = useQuery({
    queryKey: ['teamJoinRequests', id],
    queryFn: () => teamService.getJoinRequests(id!),
    enabled: activeTab === 'requests',
  });

  const removeMemberMutation = useMutation({
    mutationFn: (memberId: string) => teamService.removeMember(id!, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', id] });
      toast.success('成员已移除');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || '移除失败');
    },
  });

  const leaveTeamMutation = useMutation({
    mutationFn: () => teamService.leaveTeam(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast.success('已退出战队');
      navigate('/teams');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || '退出失败');
    },
  });

  const promoteMemberMutation = useMutation({
    mutationFn: (_memberId: string) => teamService.update(id!, { members: [] }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', id] });
      toast.success('权限已更新');
    },
  });

  const { data: invitesData } = useQuery({
    queryKey: ['teamInvites', id],
    queryFn: () => teamService.getTeamInvites(id!),
    enabled: activeTab === 'invites',
  })

  const { data: donationsData } = useQuery({
    queryKey: ['teamDonations', id],
    queryFn: () => teamService.getDonations(id!),
    enabled: activeTab === 'donations',
  });

  const { data: donationRequestsData } = useQuery({
    queryKey: ['teamDonationRequests', id],
    queryFn: () => teamInventoryService.getDonationRequests(id!),
    enabled: activeTab === 'requests',
  });

  const { data: investmentsData } = useQuery({
    queryKey: ['teamInvestments', id],
    queryFn: () => teamService.getInvestments(id!),
    enabled: activeTab === 'funds',
  });

  const sendInviteMutation = useMutation({
    mutationFn: ({ identifier, message }: { identifier: string; message?: string }) => {
      return teamService.sendInvite(id!, identifier, message)
    },
    onSuccess: () => {
      setInviteEmail('');
      toast.success('邀请已发送');
      queryClient.invalidateQueries({ queryKey: ['teamInvites', id] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || '邀请发送失败');
    },
  });

  const handleJoinRequestMutation = useMutation({
    mutationFn: ({ requestId, action }: { requestId: string; action: 'approve' | 'reject' }) => {
      return teamService.handleJoinRequest(id!, requestId, action)
    },
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ['teamJoinRequests', id] })
      queryClient.invalidateQueries({ queryKey: ['team', id] })
      toast.success(action === 'approve' ? '已批准申请' : '已拒绝申请')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || '操作失败')
    },
  })

  const transferLeaderMutation = useMutation({
    mutationFn: (newLeaderId: string) => teamService.transferLeader(id!, newLeaderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', id] })
      toast.success('已转让队长身份')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || '转让失败')
    },
  })

  const donateMutation = useMutation({
    mutationFn: ({ amount, message }: { amount: number; message?: string }) =>
      teamService.donatePoints(id!, amount, message),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['team', id] })
      queryClient.invalidateQueries({ queryKey: ['teamDonations', id] })
      // 更新用户积分
      if (user && setUser) {
        setUser({ ...user, points: data.data.userPoints })
      }
      setShowDonateDialog(false)
      setDonateAmount('')
      setDonateMessage('')
      // 自动切换到捐赠记录标签页，让用户立即看到结果
      setActiveTab('donations')
      toast.success('捐赠成功')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || '捐赠失败')
    },
  })

  const handleDonate = () => {
    const amount = parseInt(donateAmount)
    if (!amount || amount < 1) {
      toast.error('请输入有效的捐赠金额')
      return
    }
    if (user && user.points !== undefined && amount > user.points) {
      toast.error('积分不足')
      return
    }
    donateMutation.mutate({ amount, message: donateMessage })
  }

  const handleDonationRequestMutation = useMutation({
    mutationFn: ({ requestId, action }: { requestId: string; action: 'approve' | 'reject' }) =>
      teamInventoryService.handleDonationRequest(id!, requestId, action),
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ['team', id] })
      queryClient.invalidateQueries({ queryKey: ['teamDonationRequests', id] })
      queryClient.invalidateQueries({ queryKey: ['teamInventory', id] })
      toast.success(action === 'approve' ? '捐赠已批准，物品已入库' : '捐赠已拒绝，物品已退回')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || '操作失败')
    },
  })

  const addInvestmentMutation = useMutation({
    mutationFn: ({ description, amount, type }: { description: string; amount: number; type: 'income' | 'expense' }) =>
      teamService.addInvestment(id!, { description, amount, type }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', id] })
      queryClient.invalidateQueries({ queryKey: ['teamInvestments', id] })
      setShowAddInvestmentDialog(false)
      setInvestmentAmount('')
      setInvestmentDescription('')
      setInvestmentType('income')
      toast.success('投资记录已添加')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || '添加失败')
    },
  })

  const handleAddInvestment = () => {
    const amount = parseInt(investmentAmount)
    if (!amount || amount < 1) {
      toast.error('请输入有效的金额')
      return
    }
    if (!investmentDescription.trim()) {
      toast.error('请输入描述')
      return
    }
    addInvestmentMutation.mutate({ description: investmentDescription, amount, type: investmentType })
  }

  const { data: borrowRequestsData } = useQuery({
    queryKey: ['teamBorrowRequests', id],
    queryFn: () => teamInventoryService.getBorrowRequests(id!),
    enabled: activeTab === 'requests',
  })

  const { data: borrowRecordsData } = useQuery({
    queryKey: ['teamBorrowRecords', id],
    queryFn: () => teamInventoryService.getBorrowRecords(id!, 'all'),
    enabled: activeTab === 'borrowRecords',
  })

  const createBorrowRequestMutation = useMutation({
    mutationFn: ({ inventoryItemId, quantity, note, returnDate }: any) =>
      teamInventoryService.createBorrowRequest(id!, { inventoryItemId, quantity, note, returnDate }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamBorrowRequests', id] })
      setShowBorrowDialog(false)
      setSelectedBorrowItem(null)
      setBorrowQuantity('1')
      setBorrowNote('')
      setBorrowReturnDate('')
      toast.success('借用申请已提交，等待队长批准')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || '申请失败')
    },
  })

  const handleBorrowRequest = () => {
    const quantity = parseInt(borrowQuantity)
    if (!quantity || quantity < 1) {
      toast.error('请输入有效的数量')
      return
    }
    if (!selectedBorrowItem) {
      toast.error('请选择物品')
      return
    }
    createBorrowRequestMutation.mutate({
      inventoryItemId: selectedBorrowItem._id,
      quantity,
      note: borrowNote,
      returnDate: borrowReturnDate || undefined,
    })
  }

  const handleBorrowActionMutation = useMutation({
    mutationFn: ({ requestId, action }: { requestId: string; action: 'approve' | 'reject' }) =>
      teamInventoryService.handleBorrowRequest(id!, requestId, action),
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ['teamBorrowRequests', id] })
      queryClient.invalidateQueries({ queryKey: ['teamBorrowRecords', id] })
      queryClient.invalidateQueries({ queryKey: ['teamInventory', id] })
      queryClient.invalidateQueries({ queryKey: ['team', id] })
      toast.success(action === 'approve' ? '借用已批准，物品已借出' : '借用已拒绝')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || '操作失败')
    },
  })

  const returnItemMutation = useMutation({
    mutationFn: (recordId: string) =>
      teamInventoryService.returnItem(id!, recordId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamBorrowRecords', id] })
      queryClient.invalidateQueries({ queryKey: ['teamInventory', id] })
      queryClient.invalidateQueries({ queryKey: ['team', id] })
      toast.success('物品已归还')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || '归还失败')
    },
  })

  const team: Team = teamData?.data || {} as Team;
  const isOwner = (typeof team.owner === 'object' && team.owner?._id) ? String(team.owner._id) === String(user?._id) : String(team.owner) === String(user?._id);

  const memberRoleConfig: Record<string, { label: string; color: string }> = {
    owner: { label: '队长', color: 'bg-yellow-500/20 text-yellow-500' },
    admin: { label: '管理员', color: 'bg-purple-500/20 text-purple-500' },
    member: { label: '成员', color: 'bg-blue-500/20 text-blue-500' },
    leader: { label: '队长', color: 'bg-yellow-500/20 text-yellow-500' },
  };

  const mockMembers = [
    { user: { _id: '1', username: '玩家A', avatar: null }, role: 'owner' },
    { user: { _id: '2', username: '玩家B', avatar: null }, role: 'admin' },
    { user: { _id: '3', username: '玩家C', avatar: null }, role: 'member' },
    { user: { _id: '4', username: '玩家D', avatar: null }, role: 'member' },
    { user: { _id: '5', username: '玩家E', avatar: null }, role: 'member' },
  ];

  const members = team.members?.length ? team.members : mockMembers;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  if (!team.id) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px]">
        <Users className="w-16 h-16 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">战队不存在或已被删除</p>
        <Button onClick={() => navigate('/teams')} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回战队列表
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/teams')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{team.name}</h1>
            <p className="text-muted-foreground">{team.description || '暂无描述'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="px-3 py-1" style={{ background: 'hsl(220 90% 56% / 0.2)', color: 'hsl(220 90% 70%)' }}>
            {team.settings?.isPublic ? '公开战队' : '私有战队'}
          </Badge>
          {!isOwner && (
            <Button 
              variant="outline" 
              size="sm" 
              className="text-red-500"
              onClick={() => {
                if (window.confirm('确定要退出战队吗？')) {
                  leaveTeamMutation.mutate();
                }
              }}
            >
              <X className="w-4 h-4 mr-2" />
              退出战队
            </Button>
          )}
          {isOwner && (
            <Button variant="outline" size="sm" onClick={() => { /* TODO: 打开编辑战队对话框 */ }}>
              <Edit2 className="w-4 h-4 mr-2" />
              编辑战队
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">成员数量</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{members.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">队伍总积分</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{team.totalPoints || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">队伍现积分</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{team.currentPoints || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">战队资金池</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{team.fundPool || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* 捐赠积分按钮 */}
      <div className="flex justify-end">
        <Button onClick={() => setShowDonateDialog(true)}>
          <Coins className="w-4 h-4 mr-2" />
          捐赠积分
        </Button>
      </div>

      <div className="flex gap-2 border-b">
        <Button
              variant={activeTab === 'members' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('members')}
              className="rounded-b-none"
            >
              <Users className="w-4 h-4 mr-2" />
              成员列表
            </Button>
            {isOwner && (
              <Button
                variant={activeTab === 'requests' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('requests')}
                className="rounded-b-none"
              >
            <UserPlus className="w-4 h-4 mr-2" />
            待处理申请
            {requestsData?.data?.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {requestsData.data.length}
              </Badge>
            )}
          </Button>
        )}
        <Button
          variant={activeTab === 'invites' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('invites')}
          className="rounded-b-none"
        >
          <Send className="w-4 h-4 mr-2" />
          邀请管理
        </Button>
        <Button
          variant={activeTab === 'inventory' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('inventory')}
          className="rounded-b-none"
        >
          <Boxes className="w-4 h-4 mr-2" />
          战队库存
        </Button>
        <Button
          variant={activeTab === 'donations' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('donations')}
          className="rounded-b-none"
        >
          <Coins className="w-4 h-4 mr-2" />
          捐赠记录
        </Button>
        <Button
          variant={activeTab === 'funds' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('funds')}
          className="rounded-b-none"
        >
          <DollarSign className="w-4 h-4 mr-2" />
          战队资金
        </Button>
        <Button
          variant={activeTab === 'borrowRecords' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('borrowRecords')}
          className="rounded-b-none"
        >
          <Key className="w-4 h-4 mr-2" />
          借用记录
        </Button>
      </div>

      {activeTab === 'members' && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {members.map((member: any) => {
            const roleConfig = memberRoleConfig[member.role] || memberRoleConfig.member;
            const memberUserId = member.user._id !== undefined ? member.user._id : member.user;
            const memberUsername = member.user.username !== undefined ? member.user.username : member.username;
            const isCurrentUser = String(memberUserId) === String(user?._id);
            
            return (
              <Card key={memberUserId}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium flex items-center gap-2">
                          {memberUsername}
                          {(member.role === 'owner' || member.role === 'leader') && <Crown className="w-4 h-4 text-yellow-500" />}
                        </h3>
                        <Badge className={roleConfig.color}>{roleConfig.label}</Badge>
                      </div>
                    </div>
                    {isOwner && !isCurrentUser && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-yellow-500"
                          onClick={() => transferLeaderMutation.mutate(String(memberUserId))}
                          title="转让队长"
                        >
                          <Crown className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-500"
                          onClick={() => removeMemberMutation.mutate(String(memberUserId))}
                          title="踢出战队"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {activeTab === 'requests' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">待处理申请</h3>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{(requestsData?.data?.length || 0) + (donationRequestsData?.data?.length || 0) + (borrowRequestsData?.data?.length || 0)} 个申请</Badge>
            </div>
          </div>

          <div className="flex gap-2 border-b">
            <button
              onClick={() => setActiveRequestTab('join')}
              className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                activeRequestTab === 'join'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              加入申请 {requestsData?.data?.length > 0 && `(${requestsData.data.length})`}
            </button>
            <button
              onClick={() => setActiveRequestTab('donation')}
              className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                activeRequestTab === 'donation'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              捐赠申请 {donationRequestsData?.data?.length > 0 && `(${donationRequestsData.data.length})`}
            </button>
            <button
              onClick={() => setActiveRequestTab('borrow')}
              className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                activeRequestTab === 'borrow'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              借用申请 {borrowRequestsData?.data?.length > 0 && `(${borrowRequestsData.data.length})`}
            </button>
          </div>

          {activeRequestTab === 'join' && (
            <div className="space-y-4">
              {requestsData?.data?.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <UserPlus className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">暂无待处理的加入申请</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {requestsData?.data?.map((request: any) => (
                    <Card key={request._id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                              <Users className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                              <h3 className="font-medium">{request.user?.username || '未知用户'}</h3>
                              <p className="text-sm text-muted-foreground">{request.user?.email || ''}</p>
                              {request.message && (
                                <p className="text-sm text-muted-foreground mt-1 italic">"{request.message}"</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleJoinRequestMutation.mutate({ requestId: request._id, action: 'approve' })}
                            >
                              <Check className="w-4 h-4 mr-1" />
                              批准
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleJoinRequestMutation.mutate({ requestId: request._id, action: 'reject' })}
                            >
                              <X className="w-4 h-4 mr-1" />
                              拒绝
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeRequestTab === 'donation' && (
            <div className="space-y-4">
              {donationRequestsData?.data?.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Gift className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">暂无待处理的捐赠申请</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {donationRequestsData?.data?.map((request: any) => {
                    const addedBy = typeof request.addedBy === 'object' ? request.addedBy : { username: '未知用户' }
                    const item = typeof request.item === 'object' ? request.item : { itemName: '未知物品' }
                    return (
                      <Card key={request._id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                                <Gift className="w-6 h-6 text-green-500" />
                              </div>
                              <div>
                                <h3 className="font-medium">{item.itemName || '未知物品'}</h3>
                                <p className="text-sm text-muted-foreground">
                                  数量: {request.quantity}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  捐赠者: {addedBy.username || '未知用户'}
                                </p>
                                {request.note && (
                                  <p className="text-sm text-muted-foreground mt-1 italic">"{request.note}"</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleDonationRequestMutation.mutate({ requestId: request._id, action: 'approve' })}
                              >
                                <Check className="w-4 h-4 mr-1" />
                                批准
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDonationRequestMutation.mutate({ requestId: request._id, action: 'reject' })}
                              >
                                <X className="w-4 h-4 mr-1" />
                                拒绝
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {activeRequestTab === 'borrow' && (
            <div className="space-y-4">
              {borrowRequestsData?.data?.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Key className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">暂无待处理的借用申请</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {borrowRequestsData?.data?.map((request: any) => {
                    const requestedBy = typeof request.requestedBy === 'object' ? request.requestedBy : { username: '未知用户' }
                    return (
                      <Card key={request._id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                                <Key className="w-6 h-6 text-blue-500" />
                              </div>
                              <div>
                                <h3 className="font-medium">{request.itemName || '未知物品'}</h3>
                                <p className="text-sm text-muted-foreground">
                                  数量: {request.quantity}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  申请人: {requestedBy.username || '未知用户'}
                                </p>
                                {request.returnDate && (
                                  <p className="text-sm text-muted-foreground">
                                    预期归还: {new Date(request.returnDate).toLocaleDateString()}
                                  </p>
                                )}
                                {request.note && (
                                  <p className="text-sm text-muted-foreground mt-1 italic">"{request.note}"</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleBorrowActionMutation.mutate({ requestId: request._id, action: 'approve' })}
                              >
                                <Check className="w-4 h-4 mr-1" />
                                批准
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleBorrowActionMutation.mutate({ requestId: request._id, action: 'reject' })}
                              >
                                <X className="w-4 h-4 mr-1" />
                                拒绝
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'invites' && (
        <Card>
          <CardHeader>
            <CardTitle>邀请成员</CardTitle>
            <CardDescription>通过邮箱或用户ID邀请用户加入战队</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="输入邮箱或用户ID"
                  className="pl-10"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && inviteEmail.trim()) {
                      sendInviteMutation.mutate({ identifier: inviteEmail.trim() })
                    }
                  }}
                />
              </div>
              <Button onClick={() => inviteEmail.trim() && sendInviteMutation.mutate({ identifier: inviteEmail.trim() })}>
                <Send className="w-4 h-4 mr-2" />
                发送邀请
              </Button>
            </div>

            <div className="pt-4 border-t">
              <h4 className="font-medium mb-4">邀请记录</h4>
              {invitesData?.data?.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">暂无邀请记录</p>
              ) : (
                <div className="space-y-2">
                  {invitesData?.data?.map((invite: any) => (
                    <div key={invite._id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div>
                        <p className="font-medium">{invite.invitedUser?.username || '未知用户'}</p>
                        <p className="text-sm text-muted-foreground">{invite.invitedUser?.email || ''}</p>
                        {invite.message && <p className="text-sm text-muted-foreground italic mt-1">"{invite.message}"</p>}
                      </div>
                      <Badge variant={invite.status === 'pending' ? 'secondary' : invite.status === 'accepted' ? 'success' : 'destructive'}>
                        {invite.status === 'pending' ? '待接受' : invite.status === 'accepted' ? '已接受' : '已拒绝'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'inventory' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>战队共享库存</CardTitle>
                <CardDescription>查看和管理战队共享的卡牌物品</CardDescription>
              </div>
              <Button
                onClick={() => navigate(`/teams/${id}/inventory`)}
                style={{ background: 'linear-gradient(135deg, hsl(220 90% 56%), hsl(220 85% 65%))' }}
              >
                <Boxes className="w-4 h-4 mr-2" />
                进入库存管理
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-12 text-center">
              <div>
                <Boxes className="w-16 h-16 mx-auto mb-4 opacity-30" style={{ color: 'hsl(220 40% 40%)' }} />
                <p className="text-lg font-medium mb-2" style={{ color: 'hsl(220 30% 50%)' }}>查看战队共享库存</p>
                <p className="text-sm mb-4" style={{ color: 'hsl(220 30% 40%)' }}>点击按钮进入详细的战队库存管理页面</p>
                <Button
                  onClick={() => navigate(`/teams/${id}/inventory`)}
                  style={{ background: 'linear-gradient(135deg, hsl(220 90% 56%), hsl(220 85% 65%))' }}
                >
                  <Boxes className="w-4 h-4 mr-2" />
                  查看库存
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'donations' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">捐赠记录</h3>
            <Badge variant="outline">
              {donationsData?.data?.length || 0} 条记录
            </Badge>
          </div>

          {donationsData?.data?.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Gift className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">暂无捐赠记录</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {(donationsData?.data || []).map((donation: DonationRecord) => {
                const donor = typeof donation.donor === 'object' ? donation.donor : { username: '未知用户' }
                const isPointsDonation = donation.type === 'points'
                return (
                  <Card key={donation._id || String(Math.random())}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                            isPointsDonation ? 'bg-primary/10' : 'bg-emerald-100'
                          }`}>
                            {isPointsDonation ? (
                              <Coins className="w-6 h-6 text-primary" />
                            ) : (
                              <Gift className="w-6 h-6 text-emerald-600" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-medium flex items-center gap-2">
                              {donor.username}
                              <Badge variant="outline" className={isPointsDonation ? '' : 'bg-emerald-50'}>
                                {isPointsDonation ? '积分' : '物品'}
                              </Badge>
                            </h4>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="w-4 h-4" />
                              {new Date(donation.donatedAt).toLocaleString('zh-CN')}
                            </div>
                            {donation.message && (
                              <p className="text-sm text-muted-foreground mt-1 italic">
                                "{donation.message}"
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          {isPointsDonation ? (
                            <>
                              <div className="text-2xl font-bold text-primary">
                                {donation.amount}
                              </div>
                              <p className="text-sm text-muted-foreground">积分</p>
                            </>
                          ) : (
                            <>
                              <div className="text-lg font-medium text-emerald-700">
                                {donation.itemName || 
                                 (typeof donation.item === 'object' ? donation.item.name : '物品')}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                x{donation.quantity || 1}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'funds' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">战队资金</h3>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
              {investmentsData?.data?.length || 0} 条记录
            </Badge>
            {isOwner && (
              <Button onClick={() => setShowAddInvestmentDialog(true)}>
                <PlusCircle className="w-4 h-4 mr-2" />
                添加记录
              </Button>
            )}
            </div>
          </div>

          {/* 资金统计卡片 */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">当前余额</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" style={{ color: 'hsl(220, 90%, 56%)' }}>
              {team.fundPool || 0}
            </div>
          </CardContent>
        </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">总收入</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">
                  {(investmentsData?.data || []).filter((i: InvestmentRecord) => i.type === 'income').reduce((sum: number, i: InvestmentRecord) => sum + i.amount, 0)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">总支出</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-500">
                  {(investmentsData?.data || []).filter((i: InvestmentRecord) => i.type === 'expense').reduce((sum: number, i: InvestmentRecord) => sum + i.amount, 0)}
                </div>
              </CardContent>
            </Card>
          </div>

          {investmentsData?.data?.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <DollarSign className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">暂无资金记录</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {([...(investmentsData?.data || [])] as InvestmentRecord[]).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((investment: InvestmentRecord) => {
                let recordedByUsername = '未知用户';
                try {
                  if (typeof investment.recordedBy === 'object' && investment.recordedBy !== null) {
                    recordedByUsername = investment.recordedBy.username || '未知用户';
                  } else if (typeof investment.recordedBy === 'string') {
                    // 如果只是ID，显示ID的一部分
                    recordedByUsername = `用户 ${investment.recordedBy.slice(-6)}`;
                  }
                } catch (e) {
                  console.error('获取记录人信息错误:', e);
                }
                return (
                  <Card key={investment._id || String(Math.random())}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                            investment.type === 'income' ? 'bg-green-500/10' : 'bg-red-500/10'
                          }`}>
                            <DollarSign className={`w-6 h-6 ${
                              investment.type === 'income' ? 'text-green-500' : 'text-red-500'
                            }`} />
                          </div>
                          <div>
                            <h4 className="font-medium">{investment.description}</h4>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="w-4 h-4" />
                              {new Date(investment.date).toLocaleString('zh-CN')}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              记录人: {recordedByUsername}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-2xl font-bold ${
                            investment.type === 'income' ? 'text-green-500' : 'text-red-500'
                          }`}>
                            {investment.type === 'income' ? '+' : '-'}{investment.amount}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {investment.type === 'income' ? '收入' : '支出'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'borrowRecords' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">借用记录</h3>
            <Badge variant="outline">
              {borrowRecordsData?.data?.length || 0} 条记录
            </Badge>
          </div>

          {borrowRecordsData?.data?.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Key className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">暂无借用记录</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {borrowRecordsData?.data?.map((record: any) => {
              const borrowedBy = typeof record.borrowedBy === 'object' ? record.borrowedBy : { username: '未知用户' }
              return (
                <Card key={record._id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        record.status === 'borrowed' ? 'bg-yellow-500/10' : 'bg-green-500/10'
                      }`}>
                          <Key className={`w-6 h-6 ${
                        record.status === 'borrowed' ? 'text-yellow-500' : 'text-green-500'
                      }`} />
                        </div>
                        <div>
                          <h4 className="font-medium">{record.itemName || '未知物品'}</h4>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="w-4 h-4" />
                            借用: {new Date(record.borrowedAt).toLocaleString('zh-CN')}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            借用人: {borrowedBy?.username || '未知用户'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            数量: {record.quantity}
                          </p>
                          {record.returnDate && (
                            <p className="text-sm text-muted-foreground">
                              预期归还: {new Date(record.returnDate).toLocaleDateString()}
                            </p>
                          )}
                          {record.returnedAt && (
                            <p className="text-sm text-green-600">
                              实际归还: {new Date(record.returnedAt).toLocaleString('zh-CN')}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={`${
                          record.status === 'borrowed' ? 'bg-yellow-500 text-white' : 'bg-green-500 text-white'
                        }`}>
                          {record.status === 'borrowed' ? '借用中' : '已归还'}
                        </Badge>
                        {record.status === 'borrowed' && (
                          <div className="mt-2">
                            <Button
                              size="sm"
                              onClick={() => returnItemMutation.mutate(record._id)}
                            >
                              <Check className="w-4 h-4 mr-1" />
                              归还
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
            </div>
          )}
        </div>
      )}

      {/* 捐赠积分对话框 */}
      <Dialog open={showDonateDialog} onOpenChange={setShowDonateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>捐赠积分</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <span className="text-muted-foreground">我的积分</span>
              <span className="text-xl font-bold">{user?.points || 0}</span>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">捐赠金额</label>
              <Input
                type="number"
                min="1"
                value={donateAmount}
                onChange={(e) => setDonateAmount(e.target.value)}
                placeholder="请输入捐赠金额"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">留言（可选）</label>
              <Textarea
                value={donateMessage}
                onChange={(e) => setDonateMessage(e.target.value)}
                placeholder="说点什么吧..."
                maxLength={200}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDonateDialog(false)}>
              取消
            </Button>
            <Button
              onClick={handleDonate}
              disabled={donateMutation.isPending}
            >
              {donateMutation.isPending ? '捐赠中...' : '确认捐赠'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 添加投资记录对话框 */}
      <Dialog open={showAddInvestmentDialog} onOpenChange={setShowAddInvestmentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加资金记录</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">记录类型</label>
                <div className="flex gap-2">
                  <Button
                    variant={investmentType === 'income' ? 'default' : 'outline'}
                    onClick={() => setInvestmentType('income')}
                    className={investmentType === 'income' ? 'bg-green-500 hover:bg-green-600' : ''}
                  >
                    收入
                  </Button>
                  <Button
                    variant={investmentType === 'expense' ? 'default' : 'outline'}
                    onClick={() => setInvestmentType('expense')}
                    className={investmentType === 'expense' ? 'bg-red-500 hover:bg-red-600' : ''}
                  >
                    支出
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">金额</label>
                <Input
                  type="number"
                  min="1"
                  value={investmentAmount}
                  onChange={(e) => setInvestmentAmount(e.target.value)}
                  placeholder="请输入金额"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">描述</label>
              <Textarea
                value={investmentDescription}
                onChange={(e) => setInvestmentDescription(e.target.value)}
                placeholder="请输入资金记录描述"
                maxLength={200}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddInvestmentDialog(false)}>
              取消
            </Button>
            <Button
              onClick={handleAddInvestment}
              disabled={addInvestmentMutation.isPending}
            >
              {addInvestmentMutation.isPending ? '添加中...' : '确认添加'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 借用申请对话框 */}
      <Dialog open={showBorrowDialog} onOpenChange={setShowBorrowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>申请借用</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="font-medium">{selectedBorrowItem?.itemName || '未选择物品'}</p>
              {selectedBorrowItem?.description && (
                <p className="text-sm text-muted-foreground mt-1">{selectedBorrowItem.description}</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">数量</label>
              <Input
                type="number"
                min="1"
                value={borrowQuantity}
                onChange={(e) => setBorrowQuantity(e.target.value)}
                placeholder="请输入借用数量"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">预期归还日期（可选）</label>
              <Input
                type="date"
                value={borrowReturnDate}
                onChange={(e) => setBorrowReturnDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">备注（可选）</label>
              <Textarea
                value={borrowNote}
                onChange={(e) => setBorrowNote(e.target.value)}
                placeholder="请输入备注信息..."
                maxLength={200}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowBorrowDialog(false);
              setSelectedBorrowItem(null);
              setBorrowQuantity('1');
              setBorrowNote('');
              setBorrowReturnDate('');
            }}>
              取消
            </Button>
            <Button
              onClick={handleBorrowRequest}
              disabled={createBorrowRequestMutation.isPending}
            >
              {createBorrowRequestMutation.isPending ? '申请中...' : '提交申请'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
