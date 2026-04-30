import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { teamInventoryService, TeamInventoryItem, DonationRequest } from '@/services/api'
import { teamService, Team } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import { Package, Search, Plus, Trash2, ArrowLeft, Boxes, CheckCircle2, XCircle, Clock, User, Shield, Crown, Heart, Check, X, Key } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { AddTeamInventoryDialog } from '@/components/inventory/AddTeamInventoryDialog'

export function TeamInventoryPage() {
  const { id: teamId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'inventory' | 'donations' | 'borrowRequests' | 'borrowRecords'>('inventory')
  const [showBorrowDialog, setShowBorrowDialog] = useState(false)
  const [selectedBorrowItem, setSelectedBorrowItem] = useState<TeamInventoryItem | null>(null)
  const [borrowQuantity, setBorrowQuantity] = useState('1')
  const [borrowNote, setBorrowNote] = useState('')
  const [borrowReturnDate, setBorrowReturnDate] = useState('')
  const queryClient = useQueryClient()

  const { data: teamData } = useQuery({
    queryKey: ['team', teamId],
    queryFn: () => teamService.getById(teamId!),
    enabled: !!teamId
  })

  const { data: inventoryData, isLoading, error } = useQuery({
    queryKey: ['teamInventory', teamId, searchTerm],
    queryFn: async () => {
      console.log('[TeamInventory] 正在获取库存，teamId:', teamId);
      const result = await teamInventoryService.getTeamInventory(teamId!, { search: searchTerm });
      console.log('[TeamInventory] 获取结果:', result);
      return result;
    },
    enabled: !!teamId,
    onError: (err) => {
      console.error('[TeamInventory] 获取库存错误:', err);
    }
  })

  const { data: donationData, refetch: refetchDonations } = useQuery({
    queryKey: ['donationRequests', teamId],
    queryFn: () => teamInventoryService.getDonationRequests(teamId!),
    enabled: !!teamId
  })

  const { data: borrowRequestsData } = useQuery({
    queryKey: ['borrowRequests', teamId],
    queryFn: () => teamInventoryService.getBorrowRequests(teamId!),
    enabled: !!teamId
  })

  const { data: borrowRecordsData } = useQuery({
    queryKey: ['borrowRecords', teamId],
    queryFn: () => teamInventoryService.getBorrowRecords(teamId!),
    enabled: !!teamId
  })

  const addMutation = useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string, quantity: number }) => 
      teamInventoryService.addToTeamInventory(teamId!, itemId, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamInventory', teamId] })
      queryClient.invalidateQueries({ queryKey: ['donationRequests', teamId] })
      setAddDialogOpen(false)
      toast.success('捐赠申请已提交，等待队长审批')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || '添加失败')
    },
  })

  const removeMutation = useMutation({
    mutationFn: (itemId: string) => teamInventoryService.removeFromTeamInventory(teamId!, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamInventory', teamId] })
      toast.success('物品已从战队库存移除')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || '移除失败')
    },
  })

  const createBorrowRequestMutation = useMutation({
    mutationFn: ({ inventoryItemId, quantity, note, returnDate }: {
      inventoryItemId: string,
      quantity: number,
      note?: string,
      returnDate?: string
    }) => {
      console.log('[TeamInventory] 调用API创建借用申请', { teamId, inventoryItemId, quantity, note, returnDate });
      return teamInventoryService.createBorrowRequest(teamId!, { inventoryItemId, quantity, note, returnDate });
    },
    onSuccess: (data) => {
      console.log('[TeamInventory] 借用申请创建成功', data);
      queryClient.invalidateQueries({ queryKey: ['teamInventory', teamId] })
      setShowBorrowDialog(false)
      setSelectedBorrowItem(null)
      setBorrowQuantity('1')
      setBorrowNote('')
      setBorrowReturnDate('')
      toast.success('借用申请已提交，等待队长审批')
    },
    onError: (error: any) => {
      console.error('[TeamInventory] 借用申请创建失败', error);
      console.error('[TeamInventory] 错误详情:', error?.response?.data);
      const errorMessage = error?.response?.data?.message || error?.message || '申请失败'
      toast.error(errorMessage)
    },
  })

  const handleBorrowRequestSubmit = () => {
    if (!selectedBorrowItem) return
    const quantity = parseInt(borrowQuantity)
    if (!quantity || quantity < 1) {
      toast.error('请输入有效的数量')
      return
    }
    if (quantity > selectedBorrowItem.quantity) {
      toast.error(`数量不能超过当前库存：${selectedBorrowItem.quantity}`)
      return
    }
    console.log('[TeamInventory] 提交借用申请，物品:', selectedBorrowItem)
    createBorrowRequestMutation.mutate({
      inventoryItemId: selectedBorrowItem._id,
      quantity,
      note: borrowNote,
      returnDate: borrowReturnDate || undefined
    })
  }

  const returnItemMutation = useMutation({
    mutationFn: (recordId: string) => teamInventoryService.returnItem(teamId!, recordId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamInventory', teamId] })
      queryClient.invalidateQueries({ queryKey: ['team', teamId] })
      toast.success('物品已归还')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || '归还失败')
    },
  })

  const handleDonationMutation = useMutation({
    mutationFn: ({ requestId, action }: { requestId: string, action: 'approve' | 'reject' }) =>
      teamInventoryService.handleDonationRequest(teamId!, requestId, action),
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ['teamInventory', teamId] })
      queryClient.invalidateQueries({ queryKey: ['donationRequests', teamId] })
      toast.success(action === 'approve' ? '捐赠已批准，物品已入库' : '捐赠已拒绝，物品已退回')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || '操作失败')
    },
  })

  const withdrawMutation = useMutation({
    mutationFn: (requestId: string) =>
      teamInventoryService.withdrawDonationRequest(teamId!, requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['donationRequests', teamId] })
      queryClient.invalidateQueries({ queryKey: ['userInventory'] }) // 更新用户库存
      toast.success('捐赠申请已撤回，物品已退回')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || '撤回失败')
    },
  })

  const handleBorrowRequestMutation = useMutation({
    mutationFn: ({ requestId, action }: { requestId: string, action: 'approve' | 'reject' }) =>
      teamInventoryService.handleBorrowRequest(teamId!, requestId, action),
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ['teamInventory', teamId] })
      queryClient.invalidateQueries({ queryKey: ['borrowRequests', teamId] })
      queryClient.invalidateQueries({ queryKey: ['borrowRecords', teamId] })
      toast.success(action === 'approve' ? '借用已批准，物品已借出' : '借用已拒绝')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || '操作失败')
    },
  })

  const returnItemFromRecordMutation = useMutation({
    mutationFn: (recordId: string) => teamInventoryService.returnItem(teamId!, recordId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamInventory', teamId] })
      queryClient.invalidateQueries({ queryKey: ['borrowRecords', teamId] })
      toast.success('物品已归还')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || '归还失败')
    },
  })

  const team: Team | undefined = teamData?.data
  const items: TeamInventoryItem[] = inventoryData?.data || []
  const donationRequests: DonationRequest[] = donationData?.data || []
  const borrowRequests: any[] = borrowRequestsData?.data || []
  const borrowRecords: any[] = borrowRecordsData?.data || []
  const stats = inventoryData?.stats

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin'
  
  // 统一获取用户的ID
  const userId = user?._id?.toString() || user?.id?.toString()
  
  // 判断是否是队长
  const isLeader = (() => {
    if (!team || !userId) return false
    const teamOwnerId = team.owner?._id?.toString() || team.owner?.toString()
    return teamOwnerId === userId
  })()
  
  // 判断是否是管理员
  const isManager = team?.members?.some(m => {
    const memberUserId = m.user?._id?.toString() || m.user?.toString()
    return memberUserId === userId && m.role === 'manager'
  })
  
  // 判断是否是成员（包括队长）
  const isMember = (() => {
    if (!team || !userId) return false
    if (isLeader) return true
    return team.members?.some(m => {
      const memberUserId = m.user?._id?.toString() || m.user?.toString()
      return memberUserId === userId
    })
  })()
  
  const canManage = isLeader || isManager || isAdmin

  const filteredItems = items.filter(item =>
    item.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.itemCode?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'bg-gray-500'
      case 'uncommon': return 'bg-green-500'
      case 'rare': return 'bg-blue-500'
      case 'super_rare': return 'bg-purple-500'
      case 'ultra_rare': return 'bg-red-500'
      case 'secret_rare': return 'bg-yellow-500'
      default: return 'bg-gray-500'
    }
  }

  const getConditionLabel = (condition: string) => {
    switch (condition) {
      case 'mint': return '完美'
      case 'near_mint': return '近完美'
      case 'excellent': return '优秀'
      case 'good': return '良好'
      case 'light_played': return '轻微プレイ'
      case 'played': return 'プレイ済'
      case 'poor': return '不良'
      default: return condition
    }
  }

  const handleAddItem = (itemId: string, quantity: number) => {
    addMutation.mutate({ itemId, quantity })
  }

  const renderInventory = () => {
    if (error) {
      return (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-lg font-medium mb-2 text-destructive">
              {error instanceof Error ? error.message : '未知错误'}
            </p>
            <p className="text-sm text-muted-foreground">
              请检查您是否已登录并属于该战队
            </p>
          </CardContent>
        </Card>
      )
    }
    
    if (isLoading) {
      return (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent"></div>
        </div>
      )
    }
    
    if (filteredItems.length === 0) {
      return (
        <Card>
          <CardContent className="py-16 text-center">
            <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">暂无库存物品</p>
            <p className="text-sm mb-4 text-muted-foreground">
              点击"捐赠物品"将您的库存添加到战队共享
            </p>
            {isMember && (
              <Button onClick={() => setAddDialogOpen(true)} disabled={addMutation.isPending}>
                <Heart className="w-4 h-4 mr-2" />
                {addMutation.isPending ? '添加中...' : '捐赠物品'}
              </Button>
            )}
          </CardContent>
        </Card>
      )
    }
    
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredItems.map((item) => (
          <Card key={item._id} className="overflow-hidden">
            <CardHeader className="pb-2 relative">
              <div className="absolute top-2 right-2">
                {item.isAvailable ? (
                  <Badge className="bg-green-500/20 text-green-600 text-xs">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    可借用
                  </Badge>
                ) : (
                  <Badge className="bg-yellow-500/20 text-yellow-600 text-xs">
                    <Clock className="w-3 h-3 mr-1" />
                    已借出
                  </Badge>
                )}
              </div>
              <div className="flex items-start gap-3 pr-16">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold ${getRarityColor(item.rarity)}`}>
                  {item.itemType === 'card' ? 'C' : item.itemType === 'booster' ? 'B' : 'P'}
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg truncate">{item.itemName}</CardTitle>
                  {item.itemCode && (
                    <p className="text-xs text-muted-foreground">{item.itemCode}</p>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs">
                  {item.itemType === 'card' ? '卡牌' : item.itemType === 'booster' ? '补充包' : '周边'}
                </Badge>
                <Badge className={`text-xs text-white ${getRarityColor(item.rarity)}`}>
                  {item.rarity === 'common' ? '普通' :
                   item.rarity === 'uncommon' ? '非普通' :
                   item.rarity === 'rare' ? '稀有' :
                   item.rarity === 'super_rare' ? '超稀有' :
                   item.rarity === 'ultra_rare' ? '极稀有' :
                   item.rarity === 'secret_rare' ? '秘密稀有' : item.rarity}
                </Badge>
                {item.condition && (
                  <Badge variant="outline" className="text-xs">
                    {getConditionLabel(item.condition)}
                  </Badge>
                )}
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">数量</span>
                <span className="font-semibold">{item.quantity}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">价值</span>
                <span className="font-semibold">{formatCurrency(item.value)}</span>
              </div>

              {item.sharedAt && (
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>添加时间</span>
                  <span>{new Date(item.sharedAt).toLocaleDateString()}</span>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                {item.isAvailable ? (
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setSelectedBorrowItem(item)
                      setBorrowQuantity('1')
                      setBorrowNote('')
                      setBorrowReturnDate('')
                      setShowBorrowDialog(true)
                    }}
                    disabled={createBorrowRequestMutation.isPending}
                  >
                    <Key className="w-4 h-4 mr-1" />
                    申请借用
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      const recordId = item.borrowRecordId || item._id
                      if (confirm('确定要归还这个物品吗？')) {
                        returnItemMutation.mutate(recordId)
                      }
                    }}
                    disabled={returnItemMutation.isPending}
                  >
                    <Check className="w-4 h-4 mr-1" />
                    归还
                  </Button>
                )}
                {canManage && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      if (window.confirm('确定要从战队库存移除此物品吗？此操作不可撤销。')) {
                        removeMutation.mutate(item._id)
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const renderDonationRequests = () => {
    if (!donationRequests || donationRequests.length === 0) {
      return (
        <Card>
          <CardContent className="py-16 text-center">
            <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">暂无捐赠申请</p>
          </CardContent>
        </Card>
      )
    }

    return (
      <div className="space-y-4">
        {donationRequests.map((request) => (
          <Card key={request._id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  {request.item && (
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold ${getRarityColor(request.item.rarity)}`}>
                      {request.item.itemType === 'card' ? 'C' : request.item.itemType === 'booster' ? 'B' : 'P'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium">{request.item?.itemName}</h4>
                    {request.item?.itemCode && (
                      <p className="text-xs text-muted-foreground">{request.item.itemCode}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        数量：{request.quantity}
                      </Badge>
                      <Badge className={`text-xs ${
                        request.status === 'pending' ? 'bg-yellow-500/20 text-yellow-600' :
                        request.status === 'approved' ? 'bg-green-500/20 text-green-600' :
                        'bg-red-500/20 text-red-600'
                      }`}>
                        {request.status === 'pending' ? '待审批' :
                         request.status === 'approved' ? '已批准' : '已拒绝'}
                      </Badge>
                    </div>
                    {request.requestDate && (
                      <p className="text-xs mt-2 text-muted-foreground">
                        申请时间：{new Date(request.requestDate).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>

                {request.status === 'pending' && (
                  <div className="flex gap-2">
                    {/* 撤回按钮（仅捐赠者本人） */}
                    {(() => {
                      const requestAddedBy = request.addedBy?._id?.toString() || request.addedBy?.toString()
                      const isOwner = requestAddedBy === userId
                      return isOwner ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (window.confirm('确定要撤回这个捐赠申请吗？物品将退回给您。')) {
                              withdrawMutation.mutate(request._id)
                            }
                          }}
                          className="text-yellow-600 border-yellow-200 hover:border-yellow-300"
                          disabled={withdrawMutation.isPending}
                        >
                          <ArrowLeft className="w-4 h-4 mr-1" />
                          撤回
                        </Button>
                      ) : null
                    })()}
                    
                    {/* 管理按钮（仅队长/管理员） */}
                    {canManage && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => {
                            if (window.confirm('确定要批准这个捐赠申请吗？')) {
                              handleDonationMutation.mutate({ requestId: request._id, action: 'approve' })
                            }
                          }}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Check className="w-4 h-4 mr-1" />
                          批准
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (window.confirm('确定要拒绝这个捐赠申请吗？物品将退回给申请者。')) {
                              handleDonationMutation.mutate({ requestId: request._id, action: 'reject' })
                            }
                          }}
                          className="text-red-600 border-red-200 hover:border-red-300"
                        >
                          <X className="w-4 h-4 mr-1" />
                          拒绝
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const renderBorrowRequests = () => {
    if (!borrowRequests || borrowRequests.length === 0) {
      return (
        <Card className="border-0 py-16" style={{ background: 'hsl(220 35% 12%)' }}>
          <CardContent className="text-center">
            <Key className="w-16 h-16 mx-auto mb-4 opacity-30" style={{ color: 'hsl(220 40% 40%)' }} />
            <p className="text-lg font-medium mb-2" style={{ color: 'hsl(220 30% 50%)' }}>暂无借用申请</p>
          </CardContent>
        </Card>
      )
    }

    return (
      <div className="space-y-4">
        {borrowRequests.map((request) => (
          <Card key={request._id} className="border-0 shadow-xl" style={{ background: 'linear-gradient(135deg, hsl(220 35% 12%), hsl(220 30% 15%))' }}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  {request.item && (
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold ${getRarityColor(request.item.rarity)}`}>
                      {request.item.itemType === 'card' ? 'C' : request.item.itemType === 'booster' ? 'B' : 'P'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-white">{request.itemName}</h4>
                    {request.note && (
                      <p className="text-sm text-muted-foreground mt-1" style={{ color: 'hsl(220 30% 50%)' }}>{request.note}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Badge variant="outline" className="text-xs" style={{ borderColor: 'hsl(220 40% 30%)', color: 'hsl(220 30% 60%)' }}>
                        数量：{request.quantity}
                      </Badge>
                      <Badge className={`text-xs ${
                        request.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                        request.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {request.status === 'pending' ? '待审批' :
                         request.status === 'approved' ? '已批准' : '已拒绝'}
                      </Badge>
                      {request.requestDate && (
                        <p className="text-xs mt-2" style={{ color: 'hsl(220 30% 50%)' }}>
                          申请时间：{new Date(request.requestDate).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <div className="mt-2 text-xs" style={{ color: 'hsl(220 30% 50%)' }}>
                      申请人：{request.requestedBy?.username || '未知用户'}
                    </div>
                    {request.returnDate && (
                      <div className="text-xs mt-1" style={{ color: 'hsl(220 30% 50%)' }}>
                        预计归还：{new Date(request.returnDate).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>

                {request.status === 'pending' && canManage && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        if (window.confirm('确定要批准这个借用申请吗？')) {
                          handleBorrowRequestMutation.mutate({ requestId: request._id, action: 'approve' })
                        }
                      }}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Check className="w-4 h-4 mr-1" />
                      批准
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (window.confirm('确定要拒绝这个借用申请吗？')) {
                          handleBorrowRequestMutation.mutate({ requestId: request._id, action: 'reject' })
                        }
                      }}
                      className="text-red-500 border-red-500 hover:border-red-600"
                    >
                      <X className="w-4 h-4 mr-1" />
                      拒绝
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const renderBorrowRecords = () => {
    if (!borrowRecords || borrowRecords.length === 0) {
      return (
        <Card className="border-0 py-16" style={{ background: 'hsl(220 35% 12%)' }}>
          <CardContent className="text-center">
            <Clock className="w-16 h-16 mx-auto mb-4 opacity-30" style={{ color: 'hsl(220 40% 40%)' }} />
            <p className="text-lg font-medium mb-2" style={{ color: 'hsl(220 30% 50%)' }}>暂无借用记录</p>
          </CardContent>
        </Card>
      )
    }

    return (
      <div className="space-y-4">
        {borrowRecords.map((record) => (
          <Card key={record._id} className="border-0 shadow-xl" style={{ background: 'linear-gradient(135deg, hsl(220 35% 12%), hsl(220 30% 15%))' }}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  {record.item && (
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold ${getRarityColor(record.item.rarity)}`}>
                      {record.item.itemType === 'card' ? 'C' : record.item.itemType === 'booster' ? 'B' : 'P'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-white">{record.itemName}</h4>
                    {record.note && (
                      <p className="text-sm text-muted-foreground mt-1" style={{ color: 'hsl(220 30% 50%)' }}>{record.note}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Badge variant="outline" className="text-xs" style={{ borderColor: 'hsl(220 40% 30%)', color: 'hsl(220 30% 60%)' }}>
                        数量：{record.quantity}
                      </Badge>
                      <Badge className={`text-xs ${
                        record.status === 'borrowed' ? 'bg-yellow-500/20 text-yellow-400' :
                        record.status === 'returned' ? 'bg-green-500/20 text-green-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {record.status === 'borrowed' ? '借用中' :
                         record.status === 'returned' ? '已归还' : record.status}
                      </Badge>
                    </div>
                    <div className="mt-2 text-xs" style={{ color: 'hsl(220 30% 50%)' }}>
                      借用人：{record.borrowedBy?.username || '未知用户'}
                    </div>
                    <div className="text-xs mt-1" style={{ color: 'hsl(220 30% 50%)' }}>
                      借用时间：{new Date(record.borrowedAt).toLocaleString()}
                    </div>
                    {record.returnDate && (
                      <div className="text-xs mt-1" style={{ color: 'hsl(220 30% 50%)' }}>
                        预计归还：{new Date(record.returnDate).toLocaleDateString()}
                      </div>
                    )}
                    {record.returnedAt && (
                      <div className="text-xs mt-1" style={{ color: 'hsl(140 40% 60%)' }}>
                        实际归还：{new Date(record.returnedAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>

                {record.status === 'borrowed' && (
                  (record.borrowedBy?._id?.toString() === userId?.toString() || canManage) && (
                  <Button
                    size="sm"
                    onClick={() => {
                      if (window.confirm('确定要归还这个物品吗？')) {
                        returnItemFromRecordMutation.mutate(record._id)
                      }
                    }}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Check className="w-4 h-4 mr-1" />
                    归还
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <AddTeamInventoryDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onAddItem={handleAddItem}
        teamId={teamId!}
      />

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/teams/${teamId}`)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回战队
          </Button>
          <div>
            <h1 className="text-3xl font-bold">战队库存</h1>
            <p className="text-muted-foreground mt-1">{team?.name || '加载中...'}</p>
          </div>
        </div>
        {isMember && (
          <Button onClick={() => setAddDialogOpen(true)} disabled={addMutation.isPending}>
            <Heart className="w-4 h-4 mr-2" />
            {addMutation.isPending ? '添加中...' : '捐赠物品'}
          </Button>
        )}
      </div>

      {/* 标签页切换 */}
      <div className="flex gap-2 border-b pb-2">
        <Button
          variant={activeTab === 'inventory' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('inventory')}
          className="rounded-b-none"
        >
          <Boxes className="w-4 h-4 mr-2" />
          库存物品
          {stats?.totalItems && <Badge className="ml-2">{stats.totalItems}</Badge>}
        </Button>
        
        <Button
          variant={activeTab === 'donations' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('donations')}
          className="rounded-b-none"
        >
          <Heart className="w-4 h-4 mr-2" />
          捐赠申请
          {donationRequests.filter(r => r.status === 'pending').length > 0 && (
            <Badge className="ml-2 bg-yellow-500">{donationRequests.filter(r => r.status === 'pending').length}</Badge>
          )}
        </Button>

        <Button
          variant={activeTab === 'borrowRequests' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('borrowRequests')}
          className="rounded-b-none"
        >
          <Key className="w-4 h-4 mr-2" />
          借用申请
          {borrowRequests.filter(r => r.status === 'pending').length > 0 && (
            <Badge className="ml-2 bg-yellow-500">{borrowRequests.filter(r => r.status === 'pending').length}</Badge>
          )}
        </Button>

        <Button
          variant={activeTab === 'borrowRecords' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('borrowRecords')}
          className="rounded-b-none"
        >
          <Clock className="w-4 h-4 mr-2" />
          借用记录
        </Button>
      </div>

      {/* 统计卡片 */}
      {activeTab === 'inventory' && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">总物品数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalItems || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-600">可借用</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.availableItems || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-yellow-600">已借出</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.borrowedItems || 0}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 搜索框 */}
      {activeTab === 'inventory' && (
        <Card>
          <CardContent className="p-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索物品..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* 主要内容区域 */}
      {activeTab === 'inventory' ? renderInventory() :
       activeTab === 'donations' ? renderDonationRequests() :
       activeTab === 'borrowRequests' ? renderBorrowRequests() :
       renderBorrowRecords()}

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
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedBorrowItem.description}
                </p>
              )}
              <p className="text-sm text-muted-foreground mt-1">
                当前库存：{selectedBorrowItem?.quantity || 0}
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">数量</label>
              <Input
                type="number"
                min="1"
                max={selectedBorrowItem?.quantity || 1}
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
            <Button
              variant="outline"
              onClick={() => {
                setShowBorrowDialog(false)
                setSelectedBorrowItem(null)
                setBorrowQuantity('1')
                setBorrowNote('')
                setBorrowReturnDate('')
              }}
            >
              取消
            </Button>
            <Button
              onClick={handleBorrowRequestSubmit}
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
