import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Users, Plus, Trophy, TrendingUp, Target, Shield, Star, Search, MoreVertical, Crown, Swords } from 'lucide-react'
import { teamService, Team } from '@/services/api'
import { TeamFormDialog } from '@/components/teams/TeamFormDialog'

export function TeamsPage() {
  const [formOpen, setFormOpen] = useState(false)
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const navigate = useNavigate()
  
  const { data: teamsData, isLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: () => teamService.getAll(),
  })

  

  const teams: Team[] = teamsData?.data || []
  const filteredTeams = teams.filter(team => 
    team.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalMembers = teams.reduce((sum: number, t: Team) => sum + (t.members?.length || 0), 0)

  return (
    <div className="min-h-screen" style={{ background: 'hsl(var(--team-bg))' }}>
      {/* Hero Section */}
      <div className="relative overflow-hidden border-b border-blue-500/20" style={{ 
        background: 'linear-gradient(135deg, hsl(220 40% 8%) 0%, hsl(220 50% 15%) 50%, hsl(280 40% 12%) 100%)'
      }}>
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-10 left-10 w-72 h-72 rounded-full blur-3xl" style={{ background: 'hsl(220 90% 56% / 0.3)' }}></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full blur-3xl" style={{ background: 'hsl(280 70% 60% / 0.2)' }}></div>
        </div>
        
        <div className="relative container mx-auto px-6 py-12">
          <div className="flex items-center justify-between flex-wrap gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-3 rounded-xl" style={{ background: 'hsl(220 90% 56% / 0.2)' }}>
                  <Swords className="w-8 h-8" style={{ color: 'hsl(220 90% 70%)' }} />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-white">战队管理</h1>
                  <p className="text-blue-200/80 mt-1">组建最强决斗阵容，征战卡牌世界</p>
                </div>
              </div>
            </div>
            <Button 
              onClick={() => { setEditingTeam(null); setFormOpen(true) }}
              className="px-6 py-3 text-base font-semibold shadow-lg transition-all hover:scale-105"
              style={{ 
                background: 'linear-gradient(135deg, hsl(220 90% 56%), hsl(220 85% 65%))',
                boxShadow: '0 8px 32px hsl(220 90% 56% / 0.4)'
              }}
            >
              <Plus className="w-5 h-5 mr-2" />
              创建战队
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="border-0 shadow-xl card-hover" style={{ 
            background: 'linear-gradient(135deg, hsl(220 35% 12%), hsl(220 30% 15%))',
            borderColor: 'hsl(220 40% 25%)'
          }}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg" style={{ background: 'hsl(220 90% 56% / 0.15)' }}>
                  <Users className="w-5 h-5" style={{ color: 'hsl(220 90% 70%)' }} />
                </div>
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
              <CardTitle className="text-sm font-medium mt-3" style={{ color: 'hsl(220 30% 60%)' }}>活跃战队</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{isLoading ? '...' : teams.length}</div>
              <p className="text-xs mt-2" style={{ color: 'hsl(220 30% 50%)' }}>正在征战的战队数量</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl card-hover" style={{ 
            background: 'linear-gradient(135deg, hsl(220 35% 12%), hsl(220 30% 15%))',
            borderColor: 'hsl(220 40% 25%)'
          }}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg" style={{ background: 'hsl(280 70% 60% / 0.15)' }}>
                  <Target className="w-5 h-5" style={{ color: 'hsl(280 70% 70%)' }} />
                </div>
                <Star className="w-5 h-5 text-yellow-400" />
              </div>
              <CardTitle className="text-sm font-medium mt-3" style={{ color: 'hsl(220 30% 60%)' }}>总成员数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{isLoading ? '...' : totalMembers}</div>
              <p className="text-xs mt-2" style={{ color: 'hsl(220 30% 50%)' }}>所有战队的决斗者</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl card-hover" style={{ 
            background: 'linear-gradient(135deg, hsl(220 35% 12%), hsl(220 30% 15%))',
            borderColor: 'hsl(220 40% 25%)'
          }}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg" style={{ background: 'hsl(190 85% 50% / 0.15)' }}>
                  <Trophy className="w-5 h-5" style={{ color: 'hsl(190 85% 60%)' }} />
                </div>
                <Crown className="w-5 h-5 text-amber-400" />
              </div>
              <CardTitle className="text-sm font-medium mt-3" style={{ color: 'hsl(220 30% 60%)' }}>平均胜率</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">--</div>
              <p className="text-xs mt-2" style={{ color: 'hsl(220 30% 50%)' }}>战队竞赛表现统计</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'hsl(220 30% 40%)' }} />
            <Input 
              placeholder="搜索战队..." 
              className="pl-10 border-0"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ 
                background: 'hsl(220 35% 15%)',
                color: 'hsl(220 30% 90%)'
              }}
            />
          </div>
        </div>

        {/* Teams Grid */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-500 border-t-transparent"></div>
          </div>
        ) : filteredTeams.length === 0 ? (
          <Card className="border-0 py-16" style={{ background: 'hsl(220 35% 12%)' }}>
            <CardContent className="text-center">
              <Shield className="w-16 h-16 mx-auto mb-4 opacity-30" style={{ color: 'hsl(220 40% 40%)' }} />
              <p className="text-lg font-medium mb-2" style={{ color: 'hsl(220 30% 50%)' }}>暂无战队</p>
              <p className="text-sm" style={{ color: 'hsl(220 30% 40%)' }}>点击"创建战队"开始组建你的决斗阵容</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredTeams.map((team: Team) => (
              <Card key={team._id} className="border-0 shadow-xl card-hover group relative overflow-hidden" style={{ 
                background: 'linear-gradient(135deg, hsl(220 35% 12%), hsl(220 30% 15%))',
                borderColor: 'hsl(220 40% 25%)'
              }}>
                {/* Glow effect on hover */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{
                  background: 'radial-gradient(circle at 50% 0%, hsl(220 90% 56% / 0.15), transparent 70%)'
                }}></div>
                
                <CardHeader className="pb-4 relative">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-bold" style={{
                        background: 'linear-gradient(135deg, hsl(220 90% 56%), hsl(280 70% 60%))',
                        boxShadow: '0 4px 16px hsl(220 90% 56% / 0.3)'
                      }}>
                        {team.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <CardTitle className="text-lg text-white">{team.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs" style={{ 
                            borderColor: 'hsl(220 40% 30%)',
                            color: 'hsl(220 30% 60%)'
                          }}>
                            {team.members?.length || 0} 成员
                          </Badge>
                          <Badge className="text-xs" style={{ 
                            background: 'hsl(220 90% 56% / 0.2)',
                            color: 'hsl(220 90% 70%)'
                          }}>
                            活跃
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreVertical className="w-4 h-4" style={{ color: 'hsl(220 30% 50%)' }} />
                    </Button>
                  </div>
                </CardHeader>
                
                <CardContent className="relative">
                  <div className="space-y-4">
                    {team.description && (
                      <p className="text-sm line-clamp-2" style={{ color: 'hsl(220 30% 55%)' }}>{team.description}</p>
                    )}
                    
                    {/* Members preview */}
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-2">
                        {[...Array(Math.min(3, team.members?.length || 0))].map((_, i) => (
                          <div key={i} className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-semibold" style={{
                            background: `hsl(${220 + i * 20} 70% 40%)`,
                            borderColor: 'hsl(220 35% 12%)',
                            color: 'white'
                          }}>
                            {String.fromCharCode(65 + i)}
                          </div>
                        ))}
                      </div>
                      {team.members && team.members.length > 3 && (
                        <span className="text-xs" style={{ color: 'hsl(220 30% 50%)' }}>+{team.members.length - 3}</span>
                      )}
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 transition-all hover:scale-105"
                        onClick={() => { setEditingTeam(team); setFormOpen(true) }}
                        style={{ 
                          borderColor: 'hsl(220 40% 30%)',
                          color: 'hsl(220 30% 80%)'
                        }}
                      >
                        管理
                      </Button>
                      <Button 
                        size="sm" 
                        className="flex-1 transition-all hover:scale-105"
                        onClick={() => navigate(`/teams/${team._id}`)}
                        style={{ 
                          background: 'linear-gradient(135deg, hsl(220 90% 56%), hsl(220 85% 65%))'
                        }}
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
      </div>

      <TeamFormDialog 
        open={formOpen} 
        onOpenChange={setFormOpen} 
        team={editingTeam} 
      />
    </div>
  )
}
