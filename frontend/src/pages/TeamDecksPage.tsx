import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { teamDeckService, Deck, TeamSharedDeck, TeamDeckBorrowRequest } from '@/services/api'
import { deckService } from '@/services/api'
import { teamService, Team } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import { Search, Plus, Trash2, ArrowLeft, Layers, CheckCircle2, XCircle, Clock, User, Check, X, Key, BookOpen } from 'lucide-react'

export function TeamDecksPage() {
  const { id: teamId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'decks' | 'borrowRequests' | 'borrowRecords'>('decks')
  const [showBorrowDialog, setShowBorrowDialog] = useState(false)
  const [selectedBorrowDeck, setSelectedBorrowDeck] = useState<TeamSharedDeck | null>(null)
  const [borrowNote, setBorrowNote] = useState('')
  const [borrowReturnDate, setBorrowReturnDate] = useState('')
  const [selectedDeckId, setSelectedDeckId] = useState('')
  const queryClient = useQueryClient()

  const { data: teamData } = useQuery({
    queryKey: ['team', teamId],
    queryFn: () => teamService.getById(teamId!),
    enabled: !!teamId
  })

  const { data: myDecksData } = useQuery({
    queryKey: ['myDecks'],
    queryFn: () => deckService.getAll(),
    enabled: !!user
  })

  const { data: decksData, isLoading, error } = useQuery({
    queryKey: ['teamDecks', teamId, searchTerm],
    queryFn: () => teamDeckService.getTeamDecks(teamId!),
    enabled: !!teamId
  })

  const { data: borrowRequestsData } = useQuery({
    queryKey: ['deckBorrowRequests', teamId],
    queryFn: () => teamDeckService.getDeckBorrowRequests(teamId!),
    enabled: !!teamId
  })

  const { data: borrowRecordsData } = useQuery({
    queryKey: ['deckBorrowRecords', teamId],
    queryFn: () => teamDeckService.getDeckBorrowRecords(teamId!),
    enabled: !!teamId
  })

  const addDeckMutation = useMutation({
    mutationFn: (deckId: string) => teamDeckService.addDeckToTeam(teamId!, deckId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamDecks', teamId] })
      setAddDialogOpen(false)
      setSelectedDeckId('')
      toast.success('构筑已添加到战队共享')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || '添加失败')
    },
  })

  const removeDeckMutation = useMutation({
    mutationFn: (deckId: string) => teamDeckService.removeDeckFromTeam(teamId!, deckId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamDecks', teamId] })
      toast.success('构筑已从战队共享移除')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || '移除失败')
    },
  })

  const createBorrowRequestMutation = useMutation({
    mutationFn: ({ deckId, note, returnDate }: {
      deckId: string,
      note?: string,
      returnDate?: string
    }) => teamDeckService.createDeckBorrowRequest(teamId!, { deckId, note, returnDate }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamDecks', teamId] })
      setShowBorrowDialog(false)
      setSelectedBorrowDeck(null)
      setBorrowNote('')
      setBorrowReturnDate('')
      toast.success('借用申请已提交，等待队长审批')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || '申请失败')
    },
  })

  const handleBorrowRequestSubmit = () => {
    if (!selectedBorrowDeck) return
    createBorrowRequestMutation.mutate({
      deckId: selectedBorrowDeck._id,
      note: borrowNote,
      returnDate: borrowReturnDate || undefined
    })
  }

  const handleBorrowRequestMutation = useMutation({
    mutationFn: ({ requestId, action }: { requestId: string, action: 'approve' | 'reject' }) =>
      teamDeckService.handleDeckBorrowRequest(teamId!, requestId, action),
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ['teamDecks', teamId] })
      queryClient.invalidateQueries({ queryKey: ['deckBorrowRequests', teamId] })
      queryClient.invalidateQueries({ queryKey: ['deckBorrowRecords', teamId] })
      toast.success(action === 'approve' ? '借用已批准，构筑已借出' : '借用已拒绝')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || '操作失败')
    },
  })

  const returnDeckMutation = useMutation({
    mutationFn: (recordId: string) => teamDeckService.returnDeck(teamId!, recordId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamDecks', teamId] })
      queryClient.invalidateQueries({ queryKey: ['deckBorrowRecords', teamId] })
      toast.success('构筑已归还')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || '归还失败')
    },
  })

  const team: Team | undefined = teamData?.data
  const decks: TeamSharedDeck[] = decksData?.data || []
  const borrowRequests: TeamDeckBorrowRequest[] = borrowRequestsData?.data || []
  const borrowRecords: any[] = borrowRecordsData?.data || []
  const stats = decksData?.stats
  const myDecks: Deck[] = myDecksData?.data || []

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin'
  
  const userId = user?._id?.toString() || user?.id?.toString()
  
  const isLeader = (() => {
    if (!team || !userId) return false
    const teamOwnerId = team.owner?._id?.toString() || team.owner?.toString()
    return teamOwnerId === userId
  })()
  
  const isManager = team?.members?.some(m => {
    const memberUserId = m.user?._id?.toString() || m.user?.toString()
    return memberUserId === userId && m.role === 'manager'
  })
  
  const isMember = (() => {
    if (!team || !userId) return false
    if (isLeader) return true
    return team.members?.some(m => {
      const memberUserId = m.user?._id?.toString() || m.user?.toString()
      return memberUserId === userId
    })
  })()
  
  const canManage = isLeader || isManager || isAdmin

  const filteredDecks = decks.filter(deck =>
    deck.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const availableMyDecks = myDecks.filter(deck => 
    !decks.some(d => d._id === deck._id) && 
    (deck.owner._id?.toString() === userId || deck.owner.toString() === userId)
  )

  const handleAddDeck = () => {
    if (selectedDeckId) {
      addDeckMutation.mutate(selectedDeckId)
    }
  }

  const renderDecks = () => {
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
    
    if (filteredDecks.length === 0) {
      return (
        <Card>
          <CardContent className="py-16 text-center">
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">暂无共享构筑</p>
            <p className="text-sm mb-4 text-muted-foreground">
              点击"添加构筑"将您的构筑添加到战队共享
            </p>
            {isMember && availableMyDecks.length > 0 && (
              <Button onClick={() => setAddDialogOpen(true)} disabled={addDeckMutation.isPending}>
                <Plus className="w-4 h-4 mr-2" />
                {addDeckMutation.isPending ? '添加中...' : '添加构筑'}
              </Button>
            )}
            {isMember && availableMyDecks.length === 0 && (
              <p className="text-sm text-muted-foreground">您还没有可共享的构筑</p>
            )}
          </CardContent>
        </Card>
      )
    }
    
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredDecks.map((deck) => (
          <Card key={deck._id} className="overflow-hidden">
            <CardHeader className="pb-2 relative">
              <div className="absolute top-2 right-2">
                {deck.isAvailable ? (
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
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold bg-gradient-to-br from-purple-500 to-blue-500">
                  D
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg truncate">{deck.name}</CardTitle>
                  <p className="text-xs text-muted-foreground">{deck.game}</p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs">
                  {deck.type === 'building' ? '预组' : '构筑'}
                </Badge>
                {deck.format && (
                  <Badge variant="outline" className="text-xs">
                    {deck.format}
                  </Badge>
                )}
              </div>

              {deck.description && (
                <p className="text-sm text-muted-foreground truncate">
                  {deck.description}
                </p>
              )}

              {deck.sharedAt && (
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>添加时间</span>
                  <span>{new Date(deck.sharedAt).toLocaleDateString()}</span>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                {deck.isAvailable ? (
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setSelectedBorrowDeck(deck)
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
                      const record = borrowRecords.find(
                        r => r.deck?._id === deck._id && r.status === 'borrowed'
                      )
                      if (record && confirm('确定要归还这个构筑吗？')) {
                        returnDeckMutation.mutate(record._id)
                      }
                    }}
                    disabled={returnDeckMutation.isPending}
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
                      if (window.confirm('确定要从战队共享移除此构筑吗？此操作不可撤销。')) {
                        removeDeckMutation.mutate(deck._id)
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
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold bg-gradient-to-br from-purple-500 to-blue-500">
                    D
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-white">{request.deckName}</h4>
                    {request.note && (
                      <p className="text-sm text-muted-foreground mt-1" style={{ color: 'hsl(220 30% 50%)' }}>{request.note}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
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
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold bg-gradient-to-br from-purple-500 to-blue-500">
                    D
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-white">{record.deckName}</h4>
                    {record.note && (
                      <p className="text-sm text-muted-foreground mt-1" style={{ color: 'hsl(220 30% 50%)' }}>{record.note}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
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
                      if (window.confirm('确定要归还这个构筑吗？')) {
                        returnDeckMutation.mutate(record._id)
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
      {/* 添加构筑对话框 */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加构筑到战队共享</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {availableMyDecks.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                您没有可共享的构筑
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {availableMyDecks.map((deck) => (
                  <div
                    key={deck._id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedDeckId === deck._id ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted'
                    }`}
                    onClick={() => setSelectedDeckId(deck._id)}
                  >
                    <div className="font-medium">{deck.name}</div>
                    <div className="text-sm text-muted-foreground">{deck.game}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAddDialogOpen(false)
                setSelectedDeckId('')
              }}
            >
              取消
            </Button>
            {availableMyDecks.length > 0 && (
              <Button
                onClick={handleAddDeck}
                disabled={!selectedDeckId || addDeckMutation.isPending}
              >
                {addDeckMutation.isPending ? '添加中...' : '添加'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            <h1 className="text-3xl font-bold">战队构筑</h1>
            <p className="text-muted-foreground mt-1">{team?.name || '加载中...'}</p>
          </div>
        </div>
        {isMember && availableMyDecks.length > 0 && (
          <Button onClick={() => setAddDialogOpen(true)} disabled={addDeckMutation.isPending}>
            <Plus className="w-4 h-4 mr-2" />
            {addDeckMutation.isPending ? '添加中...' : '添加构筑'}
          </Button>
        )}
      </div>

      {/* 标签页切换 */}
      <div className="flex gap-2 border-b pb-2">
        <Button
          variant={activeTab === 'decks' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('decks')}
          className="rounded-b-none"
        >
          <Layers className="w-4 h-4 mr-2" />
          构筑列表
          {stats?.totalDecks && <Badge className="ml-2">{stats.totalDecks}</Badge>}
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
      {activeTab === 'decks' && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">总构筑数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalDecks || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-600">可借用</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.availableDecks || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-yellow-600">已借出</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.borrowedDecks || 0}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 搜索框 */}
      {activeTab === 'decks' && (
        <Card>
          <CardContent className="p-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索构筑..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* 主要内容区域 */}
      {activeTab === 'decks' ? renderDecks() :
       activeTab === 'borrowRequests' ? renderBorrowRequests() :
       renderBorrowRecords()}

      {/* 借用申请对话框 */}
      <Dialog open={showBorrowDialog} onOpenChange={setShowBorrowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>申请借用构筑</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="font-medium">{selectedBorrowDeck?.name || '未选择构筑'}</p>
              {selectedBorrowDeck?.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedBorrowDeck.description}
                </p>
              )}
              <p className="text-sm text-muted-foreground mt-1">
                游戏：{selectedBorrowDeck?.game || '-'}
              </p>
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
                setSelectedBorrowDeck(null)
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
