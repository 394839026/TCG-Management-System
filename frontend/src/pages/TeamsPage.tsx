import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Users, Plus, Trophy, Target, Search, Trash2, Edit, UserPlus } from 'lucide-react'
import { teamService, Team } from '@/services/api'
import { TeamFormDialog } from '@/components/teams/TeamFormDialog'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'

export function TeamsPage() {
  const [formOpen, setFormOpen] = useState(false)
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const { data: teamsData, isLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: () => teamService.getAll(),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => teamService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      toast.success('战队已删除')
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || '删除失败'
      toast.error(message)
    },
  })

  const joinMutation = useMutation({
    mutationFn: (teamId: string) => teamService.joinTeam(teamId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      toast.success('申请已提交，等待队长审核')
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || '申请失败'
      toast.error(message)
    },
  })

  const teams: Team[] = teamsData?.data || []

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin'

  // 找出积分最高的战队
  const strongestTeam = teams.length > 0 ? 
    teams.reduce((max, team) => (team.currentPoints || 0) > (max.currentPoints || 0) ? team : max, teams[0]) : 
    null

  const getUserRoleInTeam = (team: Team): string | null => {
    if (!user) return null
    const member = team.members?.find(m => {
      let memberId: string | number | undefined
      if (typeof m.user === 'object' && m.user) {
        // 如果 user 是对象，安全地获取 id 或 _id
        memberId = (m.user as any)?.id || (m.user as any)?._id
      } else {
        memberId = m.user
      }
      return String(memberId) === String(user._id)
    })
    return member?.role || null
  }

  const isUserInAnyTeam = teams.some(team => getUserRoleInTeam(team) !== null)

  const isTeamLeader = (team: Team): boolean => {
    if (!user) return false
    if (isAdmin) return true
    const role = getUserRoleInTeam(team)
    return role === 'owner' || role === 'leader'
  }

  const isTeamMember = (team: Team): boolean => {
    if (!user) return false
    return getUserRoleInTeam(team) !== null
  }
  const filteredTeams = teams.filter(team => 
    team.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalMembers = teams.reduce((sum: number, t: Team) => sum + (t.members?.length || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">战队管理</h1>
          <p className="text-muted-foreground mt-1">组建最强战队，征战卡牌世界</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate('/team-invites')}>
            <UserPlus className="w-4 h-4 mr-2" />
            我的邀请
          </Button>
          {(isAdmin || !isUserInAnyTeam) && (
            <Button variant="premium" onClick={() => { setEditingTeam(null); setFormOpen(true) }}>
              <Plus className="w-4 h-4 mr-2" />
              创建战队
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="w-4 h-4" />
              战队总数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? '...' : teams.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Target className="w-4 h-4" />
              总成员数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? '...' : totalMembers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              最强战队
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{strongestTeam ? strongestTeam.name : '--'}</div>
            {strongestTeam && (
              <p className="text-xs text-muted-foreground mt-1">{strongestTeam.currentPoints || 0} 积分</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="搜索战队..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Teams Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredTeams.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">暂无战队</p>
            {(isAdmin || !isUserInAnyTeam) && (
              <Button variant="outline" className="mt-4" onClick={() => { setEditingTeam(null); setFormOpen(true) }}>
                <Plus className="w-4 h-4 mr-2" />
                创建战队
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTeams.map((team: Team) => (
            <Card key={team.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
                      {team.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{team.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {team.members?.length || 0} 成员
                        </Badge>
                        <Badge className="text-xs">活跃</Badge>
                      </div>
                    </div>
                  </div>
                  {isTeamLeader(team) && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => { setEditingTeam(team); setFormOpen(true) }}
                        title="编辑战队"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                        onClick={() => {
                          if (window.confirm('确定要删除这个战队吗？')) {
                            deleteMutation.mutate(String(team.id))
                          }
                        }}
                        title="删除战队"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-4">
                  {team.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{team.description}</p>
                  )}
                  
                  {/* Members preview */}
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {[...Array(Math.min(3, team.members?.length || 0))].map((_, i) => (
                        <div key={i} className="w-7 h-7 rounded-full border-2 bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                          {String.fromCharCode(65 + i)}
                        </div>
                      ))}
                    </div>
                    {team.members && team.members.length > 3 && (
                      <span className="text-xs text-muted-foreground">+{team.members.length - 3}</span>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    {isTeamLeader(team) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => { setEditingTeam(team); setFormOpen(true) }}
                      >
                        编辑
                      </Button>
                    )}
                    {!isTeamMember(team) && !isTeamLeader(team) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => joinMutation.mutate(String(team.id))}
                      >
                        <UserPlus className="w-4 h-4 mr-2" />
                        申请加入
                      </Button>
                    )}
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => navigate(`/teams/${team.id}`)}
                    >
                      查看详情
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <TeamFormDialog 
        open={formOpen} 
        onOpenChange={setFormOpen} 
        team={editingTeam} 
      />
    </div>
  )
}
