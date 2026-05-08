import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { UserPlus, Users, Building2, Plus, Edit, Trash2, DollarSign, Calendar, User, Briefcase, ShieldCheck } from 'lucide-react'
import apiClient from '@/lib/api'
import { SignTeamDialog } from '@/components/shops/SignTeamDialog'

interface SigningManagementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  teamId?: string
  shopId?: string
  type: 'team' | 'shop'
  onSuccess?: () => void
}

interface SigningStats {
  totalSigningFees: number
  totalSponsorshipRevenue: number
  activePlayerCount: number
  activeSponsorCount: number
}

interface SignedPlayer {
  _id: string
  player: string
  signingFee: number
  signingDate: string
  contractStart?: string
  contractEnd?: string
  status: 'active' | 'expired' | 'terminated'
  role: 'starter' | 'reserve' | 'coach' | 'staff'
  monthlySalary: number
  notes: string
  playerInfo?: {
    _id: string
    username: string
    avatar?: string
  }
}

interface Sponsor {
  _id: string
  name: string
  logo?: string
  contactPerson?: string
  contactPhone?: string
  contactEmail?: string
  sponsorshipAmount: number
  sponsorshipType: 'cash' | 'product' | 'service' | 'mixed'
  contractStart?: string
  contractEnd?: string
  status: 'active' | 'expired' | 'terminated'
  benefits?: string
  notes?: string
  signedDate: string
}

interface SigningRecord {
  _id: string
  type: 'player' | 'sponsor'
  targetId: string
  targetName: string
  action: 'sign' | 'renew' | 'terminate' | 'expire'
  amount: number
  date: string
  operator?: string
  operatorInfo?: { _id: string; username: string }
  notes?: string
}

const ROLE_OPTIONS = [
  { value: 'starter', label: '主力' },
  { value: 'reserve', label: '替补' },
  { value: 'coach', label: '教练' },
  { value: 'staff', label: '工作人员' }
]

const STATUS_OPTIONS = [
  { value: 'active', label: '生效中', color: 'bg-green-500' },
  { value: 'expired', label: '已到期', color: 'bg-yellow-500' },
  { value: 'terminated', label: '已解除', color: 'bg-red-500' }
]

const SPONSORSHIP_TYPE_OPTIONS = [
  { value: 'cash', label: '现金' },
  { value: 'product', label: '产品' },
  { value: 'service', label: '服务' },
  { value: 'mixed', label: '混合' }
]

interface SignedTeam {
  _id: string
  team: string
  teamInfo?: {
    _id: string
    name: string
    description?: string
    logo?: string
  }
  sponsorshipAmount: number
  sponsorshipType: string
  contractStart?: string
  contractEnd?: string
  status: 'active' | 'expired' | 'terminated'
  benefits?: string
  notes?: string
  signedDate: string
}

export function SigningManagementDialog({ open, onOpenChange, teamId, shopId, type, onSuccess }: SigningManagementDialogProps) {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('players')
  const [signTeamDialogOpen, setSignTeamDialogOpen] = useState(false)
  const [editTeam, setEditTeam] = useState<any>(null)

  const entityId = teamId || shopId

  const { data: playersData, refetch: refetchPlayers } = useQuery({
    queryKey: ['signing-players', entityId],
    queryFn: async () => {
      if (!entityId) return { data: [] }
      const url = type === 'team'
        ? `/teams/${entityId}/signing/players`
        : `/shops/${entityId}/signing/sponsors`
      const response = await apiClient.get(url)
      return response.data
    },
    enabled: !!entityId && open
  })

  const { data: sponsorsData, refetch: refetchSponsors } = useQuery({
    queryKey: ['signing-sponsors', entityId],
    queryFn: async () => {
      if (!entityId) return { data: [] }
      const url = type === 'team'
        ? `/teams/${entityId}/signing/sponsors`
        : `/shops/${entityId}/signing/sponsors`
      const response = await apiClient.get(url)
      return response.data
    },
    enabled: !!entityId && open
  })

  const { data: statsData, refetch: refetchStats } = useQuery({
    queryKey: ['signing-stats', entityId],
    queryFn: async () => {
      if (!entityId) return null
      const url = type === 'team'
        ? `/teams/${entityId}/signing/stats`
        : `/shops/${entityId}/signing/stats`
      const response = await apiClient.get(url)
      return response.data
    },
    enabled: !!entityId && open
  })

  const { data: recordsData, refetch: refetchRecords } = useQuery({
    queryKey: ['signing-records', entityId],
    queryFn: async () => {
      if (!entityId) return { data: [] }
      const url = type === 'team'
        ? `/teams/${entityId}/signing/records`
        : `/shops/${entityId}/signing/records`
      const response = await apiClient.get(url)
      return response.data
    },
    enabled: !!entityId && open
  })

  const { data: signedTeamsData, refetch: refetchSignedTeams } = useQuery({
    queryKey: ['shop-signed-teams', entityId],
    queryFn: async () => {
      if (!entityId || type !== 'shop') return { data: [] }
      const response = await apiClient.get(`/shops/${entityId}/signing/teams`)
      return response.data
    },
    enabled: !!entityId && open && type === 'shop'
  })

  const deleteTeamMutation = useMutation({
    mutationFn: async (teamId: string) => {
      const response = await apiClient.delete(`/shops/${entityId}/signing/teams/${teamId}`)
      return response.data
    },
    onSuccess: () => {
      toast.success('已解除战队签约')
      refetchSignedTeams()
      refetchStats()
      refetchRecords()
      onSuccess?.()
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || '操作失败')
    }
  })

  const handleEditTeam = (team: any) => {
    setEditTeam(team)
    setSignTeamDialogOpen(true)
  }

  const handleDeleteTeam = (teamId: string) => {
    if (confirm('确定要解除与该战队的签约吗？')) {
      deleteTeamMutation.mutate(teamId)
    }
  }

  const deletePlayerMutation = useMutation({
    mutationFn: async (playerId: string) => {
      const response = await apiClient.delete(`${type === 'team' ? '/teams' : '/shops'}/${entityId}/signing/${type === 'team' ? 'players' : 'sponsors'}/${playerId}`)
      return response.data
    },
    onSuccess: () => {
      toast.success('签约已解除')
      refetchPlayers()
      refetchStats()
      refetchRecords()
      queryClient.invalidateQueries({ queryKey: ['team-detail'] })
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || '操作失败')
    }
  })

  const deleteSponsorMutation = useMutation({
    mutationFn: async (sponsorId: string) => {
      const response = await apiClient.delete(`${type === 'team' ? '/teams' : '/shops'}/${entityId}/signing/sponsors/${sponsorId}`)
      return response.data
    },
    onSuccess: () => {
      toast.success('赞助已解除')
      refetchSponsors()
      refetchStats()
      refetchRecords()
      queryClient.invalidateQueries({ queryKey: ['team-detail'] })
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || '操作失败')
    }
  })

  const handleDeletePlayer = (playerId: string) => {
    if (confirm('确定要解除该签约吗？')) {
      deletePlayerMutation.mutate(playerId)
    }
  }

  const handleDeleteSponsor = (sponsorId: string) => {
    if (confirm('确定要解除该赞助吗？')) {
      deleteSponsorMutation.mutate(sponsorId)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusOption = STATUS_OPTIONS.find(s => s.value === status)
    return (
      <Badge className={`${statusOption?.color} text-white`}>
        {statusOption?.label}
      </Badge>
    )
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('zh-CN')
  }

  const formatCurrency = (amount: number) => {
    return `¥${amount.toLocaleString()}`
  }

  const stats = statsData?.data || {
    totalSigningFees: 0,
    totalSponsorshipRevenue: 0,
    activePlayerCount: 0,
    activeSponsorCount: 0,
    activeTeamCount: 0
  }

  const players: SignedPlayer[] = type === 'team' ? (playersData?.data || []) : []
  const sponsors: Sponsor[] = sponsorsData?.data || []
  const signedTeams: SignedTeam[] = type === 'shop' ? (signedTeamsData?.data || []) : []
  const records: SigningRecord[] = recordsData?.data || []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            签约管理
          </DialogTitle>
          <DialogDescription>
            管理{type === 'team' ? '战队' : '店铺'}的签约选手和赞助商
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {type === 'team' && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">签约选手</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.activePlayerCount}</div>
              </CardContent>
            </Card>
          )}
          {type === 'shop' && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">签约战队</CardTitle>
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.activeTeamCount || 0}</div>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">赞助商</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeSponsorCount}</div>
            </CardContent>
          </Card>
          {type === 'team' && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">签约费总额</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats.totalSigningFees)}</div>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">赞助收入</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalSponsorshipRevenue)}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            {type === 'team' && (
              <TabsTrigger value="players">
                <UserPlus className="w-4 h-4 mr-2" />
                签约选手
              </TabsTrigger>
            )}
            {type === 'shop' && (
              <TabsTrigger value="teams">
                <ShieldCheck className="w-4 h-4 mr-2" />
                签约战队
              </TabsTrigger>
            )}
            <TabsTrigger value="sponsors">
              <Building2 className="w-4 h-4 mr-2" />
              赞助商
            </TabsTrigger>
            <TabsTrigger value="records">
              <Calendar className="w-4 h-4 mr-2" />
              签约记录
            </TabsTrigger>
          </TabsList>

          {type === 'team' && (
            <TabsContent value="players" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">签约选手列表</h3>
                <Button asChild>
                  <a href={`/teams/${teamId}/signing/player/new`}>
                    <Plus className="w-4 h-4 mr-2" />
                    签约新选手
                  </a>
                </Button>
              </div>

              {players.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>暂无签约选手</p>
                </div>
              ) : (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>选手</TableHead>
                        <TableHead>角色</TableHead>
                        <TableHead>签约费</TableHead>
                        <TableHead>月薪</TableHead>
                        <TableHead>合约期限</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead className="text-right">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {players.map((player) => (
                        <TableRow key={player._id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                {player.playerInfo?.avatar ? (
                                  <img src={player.playerInfo.avatar} className="w-8 h-8 rounded-full" />
                                ) : (
                                  <User className="w-4 h-4" />
                                )}
                              </div>
                              <span>{player.playerInfo?.username || '未知'}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {ROLE_OPTIONS.find(r => r.value === player.role)?.label}
                          </TableCell>
                          <TableCell>{formatCurrency(player.signingFee)}</TableCell>
                          <TableCell>{formatCurrency(player.monthlySalary)}</TableCell>
                          <TableCell>
                            {player.contractStart && player.contractEnd ? (
                              `${formatDate(player.contractStart)} ~ ${formatDate(player.contractEnd)}`
                            ) : (
                              '无期限'
                            )}
                          </TableCell>
                          <TableCell>{getStatusBadge(player.status)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-500"
                              onClick={() => handleDeletePlayer(player.player)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          )}

          {type === 'shop' && (
            <TabsContent value="teams" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">签约战队列表</h3>
                <Button onClick={() => {
                  setEditTeam(null)
                  setSignTeamDialogOpen(true)
                }}>
                  <Plus className="w-4 h-4 mr-2" />
                  签约战队
                </Button>
              </div>

              {signedTeams.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ShieldCheck className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>暂无签约战队</p>
                </div>
              ) : (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>战队</TableHead>
                        <TableHead>赞助类型</TableHead>
                        <TableHead>赞助金额</TableHead>
                        <TableHead>合约期限</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead className="text-right">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {signedTeams.map((signedTeam) => (
                        <TableRow key={signedTeam._id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                {signedTeam.teamInfo?.logo ? (
                                  <img src={signedTeam.teamInfo.logo} className="w-8 h-8 rounded-full" />
                                ) : (
                                  <ShieldCheck className="w-4 h-4" />
                                )}
                              </div>
                              <div>
                                <p className="font-medium">{signedTeam.teamInfo?.name || '未知战队'}</p>
                                {signedTeam.teamInfo?.description && (
                                  <p className="text-sm text-muted-foreground">{signedTeam.teamInfo.description}</p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {SPONSORSHIP_TYPE_OPTIONS.find(t => t.value === signedTeam.sponsorshipType)?.label}
                          </TableCell>
                          <TableCell>{formatCurrency(signedTeam.sponsorshipAmount)}</TableCell>
                          <TableCell>
                            {signedTeam.contractStart && signedTeam.contractEnd ? (
                              `${formatDate(signedTeam.contractStart)} ~ ${formatDate(signedTeam.contractEnd)}`
                            ) : (
                              '无期限'
                            )}
                          </TableCell>
                          <TableCell>{getStatusBadge(signedTeam.status)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditTeam(signedTeam)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-500"
                                onClick={() => handleDeleteTeam(signedTeam.team)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          )}

          <TabsContent value="sponsors" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">赞助商列表</h3>
              <Button asChild>
                <a href={`/${type === 'team' ? 'teams' : 'shops'}/${entityId}/signing/sponsor/new`}>
                  <Plus className="w-4 h-4 mr-2" />
                  添加赞助商
                </a>
              </Button>
            </div>

            {sponsors.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>暂无赞助商</p>
              </div>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>赞助商</TableHead>
                      <TableHead>类型</TableHead>
                      <TableHead>赞助金额</TableHead>
                      <TableHead>合约期限</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sponsors.map((sponsor) => (
                      <TableRow key={sponsor._id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {sponsor.logo ? (
                              <img src={sponsor.logo} className="w-8 h-8 rounded-full object-cover" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                <Building2 className="w-4 h-4" />
                              </div>
                            )}
                            <span>{sponsor.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {SPONSORSHIP_TYPE_OPTIONS.find(t => t.value === sponsor.sponsorshipType)?.label}
                        </TableCell>
                        <TableCell>{formatCurrency(sponsor.sponshipAmount)}</TableCell>
                        <TableCell>
                          {sponsor.contractStart && sponsor.contractEnd ? (
                            `${formatDate(sponsor.contractStart)} ~ ${formatDate(sponsor.contractEnd)}`
                          ) : (
                            '无期限'
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(sponsor.status)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-500"
                            onClick={() => handleDeleteSponsor(sponsor._id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="records" className="space-y-4">
            <h3 className="text-lg font-medium">签约记录</h3>

            {records.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>暂无签约记录</p>
              </div>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>类型</TableHead>
                      <TableHead>对象</TableHead>
                      <TableHead>操作</TableHead>
                      <TableHead>金额</TableHead>
                      <TableHead>操作人</TableHead>
                      <TableHead>时间</TableHead>
                      <TableHead>备注</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((record) => (
                      <TableRow key={record._id}>
                        <TableCell>
                          <Badge variant={record.type === 'player' ? 'default' : 'secondary'}>
                            {record.type === 'player' ? '选手' : '赞助商'}
                          </Badge>
                        </TableCell>
                        <TableCell>{record.targetName}</TableCell>
                        <TableCell>
                          {record.action === 'sign' && '签约'}
                          {record.action === 'renew' && '续约'}
                          {record.action === 'terminate' && '解除'}
                          {record.action === 'expire' && '到期'}
                        </TableCell>
                        <TableCell>{record.amount > 0 ? formatCurrency(record.amount) : '-'}</TableCell>
                        <TableCell>{record.operatorInfo?.username || '-'}</TableCell>
                        <TableCell>{formatDate(record.date)}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{record.notes || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
      
      {type === 'shop' && (
        <SignTeamDialog
          open={signTeamDialogOpen}
          onOpenChange={(open) => {
            setSignTeamDialogOpen(open)
            if (!open) setEditTeam(null)
          }}
          shopId={entityId}
          mode={editTeam ? 'edit' : 'create'}
          existingTeam={editTeam}
          onSuccess={() => {
            refetchSignedTeams()
            refetchStats()
            refetchRecords()
            onSuccess?.()
          }}
        />
      )}
    </Dialog>
  )
}
