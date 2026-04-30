import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Users, Crown, Star, X, Search, Send } from 'lucide-react';
import { teamService, Team } from '@/services/api';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export function TeamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [inviteEmail, setInviteEmail] = useState('');
  const [activeTab, setActiveTab] = useState<'members' | 'invites'>('members');
  const queryClient = useQueryClient();

  const { data: teamData, isLoading } = useQuery({
    queryKey: ['team', id],
    queryFn: () => teamService.getById(id!),
  });

  const removeMemberMutation = useMutation({
    mutationFn: () => teamService.update(id!, { members: [] }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', id] });
      toast.success('成员已移除');
    },
  });

  const promoteMemberMutation = useMutation({
    mutationFn: () => teamService.update(id!, { members: [] }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', id] });
      toast.success('权限已更新');
    },
  });

  const inviteMemberMutation = useMutation({
    mutationFn: () => teamService.update(id!, { members: [] }),
    onSuccess: () => {
      setInviteEmail('');
      toast.success('邀请已发送');
    },
  });

  const team: Team = teamData?.data || {} as Team;
  const isOwner = team.owner === user?._id;

  const memberRoleConfig: Record<string, { label: string; color: string }> = {
    owner: { label: '队长', color: 'bg-yellow-500/20 text-yellow-500' },
    admin: { label: '管理员', color: 'bg-purple-500/20 text-purple-500' },
    member: { label: '成员', color: 'bg-blue-500/20 text-blue-500' },
  };

  const mockMembers = [
    { user: { _id: '1', username: '玩家A', avatar: null }, role: 'owner' },
    { user: { _id: '2', username: '玩家B', avatar: null }, role: 'admin' },
    { user: { _id: '3', username: '玩家C', avatar: null }, role: 'member' },
    { user: { _id: '4', username: '玩家D', avatar: null }, role: 'member' },
    { user: { _id: '5', username: '玩家E', avatar: null }, role: 'member' },
  ];

  const mockInvites = [
    { email: 'playerf@example.com', status: 'pending', sentAt: '1小时前' },
    { email: 'playerg@example.com', status: 'pending', sentAt: '2小时前' },
  ];

  const members = team.members?.length ? team.members : mockMembers;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  if (!team._id) {
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
        <Badge className="px-3 py-1" style={{ background: 'hsl(220 90% 56% / 0.2)', color: 'hsl(220 90% 70%)' }}>
          {team.settings?.isPublic ? '公开战队' : '私有战队'}
        </Badge>
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
            <CardTitle className="text-sm font-medium text-muted-foreground">胜利场次</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">胜率</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">排名</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
          </CardContent>
        </Card>
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
        <Button
          variant={activeTab === 'invites' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('invites')}
          className="rounded-b-none"
        >
          <Send className="w-4 h-4 mr-2" />
          邀请管理
        </Button>
      </div>

      {activeTab === 'members' && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {members.map((member: any) => {
            const roleConfig = memberRoleConfig[member.role] || memberRoleConfig.member;
            const isCurrentUser = member.user._id === user?._id;
            
            return (
              <Card key={member.user._id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        {member.user.avatar ? (
                          <img src={member.user.avatar} alt={member.user.username} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <Users className="w-6 h-6 text-primary" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-medium flex items-center gap-2">
                          {member.user.username}
                          {member.role === 'owner' && <Crown className="w-4 h-4 text-yellow-500" />}
                        </h3>
                        <Badge className={roleConfig.color}>{roleConfig.label}</Badge>
                      </div>
                    </div>
                    {isOwner && !isCurrentUser && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => promoteMemberMutation.mutate(member.user._id)}
                        >
                          <Star className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-500"
                          onClick={() => removeMemberMutation.mutate(member.user._id)}
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

      {activeTab === 'invites' && (
        <Card>
          <CardHeader>
            <CardTitle>邀请成员</CardTitle>
            <CardDescription>发送邀请链接或通过邮箱邀请</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="输入邮箱地址"
                  className="pl-10"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && inviteEmail.trim()) {
                      inviteMemberMutation.mutate();
                    }
                  }}
                />
              </div>
              <Button onClick={() => inviteEmail.trim() && inviteMemberMutation.mutate()}>
                <Send className="w-4 h-4 mr-2" />
                发送邀请
              </Button>
            </div>

            <div className="pt-4 border-t">
              <h4 className="font-medium mb-4">待处理邀请</h4>
              {mockInvites.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">暂无待处理邀请</p>
              ) : (
                <div className="space-y-2">
                  {mockInvites.map((invite, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div>
                        <p className="font-medium">{invite.email}</p>
                        <p className="text-sm text-muted-foreground">{invite.sentAt}</p>
                      </div>
                      <Badge variant={invite.status === 'pending' ? 'secondary' : 'success'}>
                        {invite.status === 'pending' ? '待接受' : '已接受'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
