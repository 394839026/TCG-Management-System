import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { groupChatService, GroupChat, GroupLevelConfig } from '../services/api'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Textarea } from '../components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from '../components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Switch } from '../components/ui/switch'
import { Label } from '../components/ui/label'
import { Badge } from '../components/ui/badge'
import { toast } from 'sonner'
import { Users, Plus, MessageSquare, Trash2, Edit, MicOff } from 'lucide-react'

export function GroupChatManagementPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [selectedGroup, setSelectedGroup] = useState<GroupChat | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isMemberDialogOpen, setIsMemberDialogOpen] = useState(false)
  const [isDeleteAllDialogOpen, setIsDeleteAllDialogOpen] = useState(false)
  const [newGroupData, setNewGroupData] = useState({
    name: '',
    description: '',
    type: 'custom' as 'system' | 'team' | 'custom',
    level: 1 as number,
    isPublic: false,
    maxMembers: 50,
    memberIds: [] as string[]
  })
  const [editGroupData, setEditGroupData] = useState({
    name: '',
    description: '',
    isPublic: false,
    maxMembers: 100
  })

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin'

  const { data: myGroupsData, isLoading: loadingMyGroups } = useQuery({
    queryKey: ['myGroups'],
    queryFn: () => groupChatService.getMyGroups(),
    enabled: !!user?._id
  })

  const { data: allGroupsData, isLoading: loadingAllGroups } = useQuery({
    queryKey: ['allGroups'],
    queryFn: () => groupChatService.getAllGroups(),
    enabled: isAdmin
  })

  const myGroups = myGroupsData?.data || []
  const allGroups = allGroupsData?.data || []

  const { data: levelConfigData } = useQuery({
    queryKey: ['groupLevelConfig'],
    queryFn: () => groupChatService.getLevelConfig()
  })

  const levelConfig: Record<number, GroupLevelConfig> = levelConfigData?.data || {}

  const getLevelInfo = (level: number) => {
    return levelConfig[level] || { name: `等级${level}`, maxMembers: 50, icon: '⭐', description: '' }
  }

  const createMutation = useMutation({
    mutationFn: (data: any) => groupChatService.createGroup(data),
    onSuccess: () => {
      toast.success('群聊创建成功！')
      setIsCreateDialogOpen(false)
      setNewGroupData({
        name: '',
        description: '',
        type: 'custom',
        level: 1,
        isPublic: false,
        maxMembers: 50,
        memberIds: []
      })
      queryClient.invalidateQueries({ queryKey: ['myGroups'] })
      queryClient.invalidateQueries({ queryKey: ['allGroups'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || '创建失败')
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ groupId, data }: { groupId: string; data: any }) => 
      groupChatService.updateGroup(groupId, data),
    onSuccess: () => {
      toast.success('群聊信息已更新！')
      setIsEditDialogOpen(false)
      setSelectedGroup(null)
      queryClient.invalidateQueries({ queryKey: ['myGroups'] })
      queryClient.invalidateQueries({ queryKey: ['allGroups'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || '更新失败')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (groupId: string) => groupChatService.deleteGroup(groupId),
    onSuccess: () => {
      toast.success('群聊已删除！')
      setSelectedGroup(null)
      queryClient.invalidateQueries({ queryKey: ['myGroups'] })
      queryClient.invalidateQueries({ queryKey: ['allGroups'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || '删除失败')
    }
  })

  const deleteAllMutation = useMutation({
    mutationFn: () => groupChatService.deleteAllGroups(),
    onSuccess: (data) => {
      toast.success(data.message || '所有群聊已删除！')
      setIsDeleteAllDialogOpen(false)
      queryClient.invalidateQueries({ queryKey: ['myGroups'] })
      queryClient.invalidateQueries({ queryKey: ['allGroups'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || '删除失败')
    }
  })

  const updateMemberMutation = useMutation({
    mutationFn: ({ groupId, userId, data }: { groupId: string; userId: string; data: any }) => 
      groupChatService.updateMember(groupId, userId, data),
    onSuccess: () => {
      toast.success('成员权限已更新！')
      queryClient.invalidateQueries({ queryKey: ['myGroups'] })
      queryClient.invalidateQueries({ queryKey: ['allGroups'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || '更新失败')
    }
  })

  const removeMemberMutation = useMutation({
    mutationFn: ({ groupId, userId }: { groupId: string; userId: string }) => 
      groupChatService.removeMember(groupId, userId),
    onSuccess: () => {
      toast.success('成员已移除！')
      queryClient.invalidateQueries({ queryKey: ['myGroups'] })
      queryClient.invalidateQueries({ queryKey: ['allGroups'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || '移除失败')
    }
  })

  const handleCreateGroup = () => {
    if (!newGroupData.name.trim()) {
      toast.error('请输入群聊名称')
      return
    }
    createMutation.mutate(newGroupData)
  }

  const handleEditGroup = () => {
    if (!selectedGroup) return
    updateMutation.mutate({ groupId: selectedGroup._id, data: editGroupData })
  }

  const handleDeleteGroup = (groupId: string) => {
    if (confirm('确定要删除这个群聊吗？')) {
      deleteMutation.mutate(groupId)
    }
  }

  const handleOpenEditDialog = (group: GroupChat) => {
    setSelectedGroup(group)
    setEditGroupData({
      name: group.name,
      description: group.description || '',
      isPublic: group.isPublic,
      maxMembers: group.maxMembers
    })
    setIsEditDialogOpen(true)
  }

  const handleOpenMemberDialog = (group: GroupChat) => {
    setSelectedGroup(group)
    setIsMemberDialogOpen(true)
  }

  const getMemberRoleLabel = (role: string) => {
    switch (role) {
      case 'owner':
        return '群主'
      case 'admin':
        return '管理员'
      default:
        return '成员'
    }
  }

  const getMemberRoleBadge = (role: string) => {
    switch (role) {
      case 'owner':
        return <Badge className="bg-red-500">{getMemberRoleLabel(role)}</Badge>
      case 'admin':
        return <Badge className="bg-yellow-500">{getMemberRoleLabel(role)}</Badge>
      default:
        return <Badge variant="outline">{getMemberRoleLabel(role)}</Badge>
    }
  }

  const getGroupTypeLabel = (type: string) => {
    switch (type) {
      case 'system':
        return '系统群'
      case 'team':
        return '战队群'
      default:
        return '普通群'
    }
  }

  // 检查是否是订单群聊
  const isOrderGroupChat = (group: GroupChat) => {
    return group.name && group.name.startsWith('ORD')
  }

  const canManageGroup = (group: GroupChat) => {
    if (!user) return false
    if (user.role === 'admin' || user.role === 'superadmin') return true
    const member = group.members.find(m => m.user._id === user._id)
    return member?.role === 'owner' || member?.role === 'admin'
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">群聊管理</h1>
          <p className="text-gray-500 mt-2">管理所有群聊，包括系统群、战队群和自定义群聊</p>
        </div>
        {isAdmin && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                创建群聊
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>创建新群聊</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>群聊名称 *</Label>
                  <Input
                    value={newGroupData.name}
                    onChange={(e) => setNewGroupData({ ...newGroupData, name: e.target.value })}
                    placeholder="请输入群聊名称"
                  />
                </div>
                <div>
                  <Label>群聊描述</Label>
                  <Textarea
                    value={newGroupData.description}
                    onChange={(e) => setNewGroupData({ ...newGroupData, description: e.target.value })}
                    placeholder="请输入群聊描述"
                    rows={3}
                  />
                </div>
                <div>
                  <Label>群聊类型</Label>
                  <select
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                    value={newGroupData.type}
                    onChange={(e) => setNewGroupData({ ...newGroupData, type: e.target.value as any })}
                  >
                    <option value="system">系统群</option>
                    <option value="team">战队群</option>
                    <option value="custom">普通群</option>
                  </select>
                </div>
                <div>
                  <Label>群聊等级</Label>
                  <select
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                    value={newGroupData.level}
                    onChange={(e) => {
                      const level = parseInt(e.target.value)
                      const config = getLevelInfo(level)
                      setNewGroupData({ ...newGroupData, level, maxMembers: config.maxMembers })
                    }}
                  >
                    {Object.entries(levelConfig).map(([level, config]) => (
                      <option key={level} value={level}>
                        {config.icon} {config.name} - 最多{config.maxMembers}人 - {config.description}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={newGroupData.isPublic}
                    onCheckedChange={(checked) => setNewGroupData({ ...newGroupData, isPublic: checked })}
                  />
                  <Label>公开群聊</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  取消
                </Button>
                <Button onClick={handleCreateGroup} disabled={createMutation.isPending}>
                  {createMutation.isPending ? '创建中...' : '创建'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Tabs defaultValue="my">
        <TabsList>
          <TabsTrigger value="my">我的群聊</TabsTrigger>
          {isAdmin && <TabsTrigger value="all">所有群聊</TabsTrigger>}
        </TabsList>

        <TabsContent value="my" className="space-y-4">
          {loadingMyGroups ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : myGroups.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>您还没有加入任何群聊</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {myGroups.map((group: GroupChat) => (
                <Card key={group._id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
                          {(group.name || 'G')[0]}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{group.name}</CardTitle>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge variant="outline">{getGroupTypeLabel(group.type)}</Badge>
                            {group.team && (
                              <Badge className="bg-green-100 text-green-800 border-green-200">
                                战队: {group.team.name}
                              </Badge>
                            )}
                            {group.isPublic && <Badge variant="outline">公开</Badge>}
                          </div>
                        </div>
                      </div>
                      {canManageGroup(group) && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEditDialog(group)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {group.description && (
                      <p className="text-gray-600 mb-3">{group.description}</p>
                    )}
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      {getLevelInfo(group.level).icon}
                      <Badge variant="outline">{getLevelInfo(group.level).name}</Badge>
                      <Badge variant="outline">{getGroupTypeLabel(group.type)}</Badge>
                      {group.team && (
                        <Badge className="bg-green-100 text-green-800 border-green-200">
                          战队: {group.team.name}
                        </Badge>
                      )}
                      {group.isPublic && <Badge variant="outline">公开</Badge>}
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>{group.members.length}/{group.maxMembers} 人</span>
                      </div>
                      {group.lastMessage && (
                        <div className="flex items-center gap-1">
                          <MessageSquare className="w-4 h-4" />
                          <span className="truncate max-w-[150px]">{group.lastMessage.content}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => window.location.href = `/messages?groupId=${group._id}`}
                      >
                        进入聊天
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleOpenMemberDialog(group)}
                      >
                        成员管理
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {isAdmin && (
          <TabsContent value="all" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">所有群聊（{allGroups.length}个）</h3>
              {user?.role === 'superadmin' && allGroups.length > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setIsDeleteAllDialogOpen(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  解散所有群聊
                </Button>
              )}
            </div>
            {loadingAllGroups ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : allGroups.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>还没有创建任何群聊</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {allGroups.map((group: GroupChat) => (
                <Card key={group._id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
                          {(group.name || 'G')[0]}
                        </div>
                          <div>
                            <CardTitle className="text-lg">{group.name}</CardTitle>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <Badge variant="outline">{getGroupTypeLabel(group.type)}</Badge>
                              {group.team && (
                                <Badge className="bg-green-100 text-green-800 border-green-200">
                                  战队: {group.team.name}
                                </Badge>
                              )}
                              {group.isPublic && <Badge variant="outline">公开</Badge>}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEditDialog(group)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteGroup(group._id)}
                            className="text-red-500 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {group.description && (
                        <p className="text-gray-600 mb-3">{group.description}</p>
                      )}
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        {getLevelInfo(group.level).icon}
                        <Badge variant="outline">{getLevelInfo(group.level).name}</Badge>
                        <Badge variant="outline">{getGroupTypeLabel(group.type)}</Badge>
                        {group.team && (
                          <Badge className="bg-green-100 text-green-800 border-green-200">
                            战队: {group.team.name}
                          </Badge>
                        )}
                        {group.isPublic && <Badge variant="outline">公开</Badge>}
                      </div>
                      <div className="text-sm text-gray-500">
                        创建者: {group.creator.username}
                      </div>
                      <div className="flex items-center justify-between text-sm text-gray-500 mt-2">
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          <span>{group.members.length}/{group.maxMembers} 人</span>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => window.location.href = `/messages?groupId=${group._id}`}
                        >
                          进入聊天
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleOpenMemberDialog(group)}
                        >
                          成员管理
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* 编辑群聊对话框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>编辑群聊信息</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>群聊名称</Label>
              {selectedGroup && isOrderGroupChat(selectedGroup) ? (
                <>
                  <Input
                    value={editGroupData.name}
                    disabled
                    className="bg-gray-100 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1">订单群聊名称不可修改</p>
                </>
              ) : (
                <Input
                  value={editGroupData.name}
                  onChange={(e) => setEditGroupData({ ...editGroupData, name: e.target.value })}
                />
              )}
            </div>
            <div>
              <Label>群聊描述</Label>
              <Textarea
                value={editGroupData.description}
                onChange={(e) => setEditGroupData({ ...editGroupData, description: e.target.value })}
                rows={3}
              />
            </div>
            <div>
              <Label>最大成员数</Label>
              <Input
                type="number"
                min="2"
                max="10000"
                value={editGroupData.maxMembers}
                onChange={(e) => setEditGroupData({ ...editGroupData, maxMembers: parseInt(e.target.value) })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={editGroupData.isPublic}
                onCheckedChange={(checked) => setEditGroupData({ ...editGroupData, isPublic: checked })}
              />
              <Label>公开群聊</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleEditGroup} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? '更新中...' : '更新'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 成员管理对话框 */}
      <Dialog open={isMemberDialogOpen} onOpenChange={setIsMemberDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>成员管理 - {selectedGroup?.name}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {selectedGroup?.members.map((member) => (
              <div key={member.user._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                    {(member.user.username || 'U')[0]}
                  </div>
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {member.user.username}
                      {getMemberRoleBadge(member.role)}
                      {member.muted && (
                        <Badge variant="destructive" className="flex items-center gap-1">
                          <MicOff className="w-3 h-3" />
                          已禁言
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      加入时间: {new Date(member.joinedAt).toLocaleString()}
                    </div>
                  </div>
                </div>
                {canManageGroup(selectedGroup!) && (
                  <div className="flex items-center gap-2">
                    {member.role !== 'owner' && (
                      <>
                        <select
                          className="px-2 py-1 border rounded text-sm"
                          value={member.role}
                          onChange={(e) => {
                            updateMemberMutation.mutate({
                              groupId: selectedGroup!._id,
                              userId: member.user._id,
                              data: { role: e.target.value }
                            })
                          }}
                        >
                          <option value="member">成员</option>
                          <option value="admin">管理员</option>
                        </select>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            updateMemberMutation.mutate({
                              groupId: selectedGroup!._id,
                              userId: member.user._id,
                              data: { muted: !member.muted }
                            })
                          }}
                        >
                          {member.muted ? '取消禁言' : '禁言'}
                        </Button>
                        {user?._id !== member.user._id && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              if (confirm('确定要移除该成员吗？')) {
                                removeMemberMutation.mutate({
                                  groupId: selectedGroup!._id,
                                  userId: member.user._id
                                })
                              }
                            }}
                          >
                            移除
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsMemberDialogOpen(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 解散所有群聊确认对话框 */}
      <Dialog open={isDeleteAllDialogOpen} onOpenChange={setIsDeleteAllDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认解散所有群聊</DialogTitle>
            <DialogDescription>
              此操作不可撤销！确定要删除所有 {allGroups.length} 个群聊吗？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteAllDialogOpen(false)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteAllMutation.mutate()}
              disabled={deleteAllMutation.isPending}
            >
              {deleteAllMutation.isPending ? '删除中...' : '确认删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
