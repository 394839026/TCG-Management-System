import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { User, Search, Send, Check, X, Trash2, MessageCircle, Users, Clock } from 'lucide-react';
import { friendService } from '@/services/api';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export function FriendsPage() {
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'search'>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: friendsData, isLoading: friendsLoading, error: friendsError } = useQuery({
    queryKey: ['friends'],
    queryFn: () => friendService.getFriends(),
  });

  const { data: requestsData, isLoading: requestsLoading, error: requestsError } = useQuery({
    queryKey: ['friendRequests'],
    queryFn: () => friendService.getRequests(),
  });

  const { data: searchData, error: searchError } = useQuery({
    queryKey: ['searchUsers', searchQuery],
    queryFn: () => friendService.searchUsers(searchQuery),
    enabled: searchQuery.length > 0,
  });

  const acceptMutation = useMutation({
    mutationFn: (requestId: string) => friendService.acceptRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] });
      toast.success('好友请求已接受');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (requestId: string) => friendService.rejectRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] });
      toast.success('好友请求已拒绝');
    },
  });

  const sendRequestMutation = useMutation({
    mutationFn: (userId: string) => friendService.sendRequest(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['searchUsers'] });
      toast.success('好友请求已发送');
    },
  });

  const removeFriendMutation = useMutation({
    mutationFn: (friendId: string) => friendService.removeFriend(friendId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      toast.success('已移除好友');
    },
  });

  const friends = friendsData?.data || [];
  const requests = requestsData?.data || [];
  const searchResults = searchData?.data || [];

  const renderFriendCard = (friend: any) => {
    if (!friend) return null;
    
    const friendUser = friend.friend || friend.friendId;
    
    return (
      <Card key={friend._id} className="card-hover">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                {friendUser?.avatar ? (
                  <img src={friendUser.avatar} alt={friendUser.username || '用户'} className="w-full h-full rounded-full object-cover" />
                ) : (
                  <User className="w-6 h-6 text-primary" />
                )}
              </div>
              <div>
                <h3 className="font-medium">{friendUser?.username || '未知用户'}</h3>
                <p className="text-sm text-muted-foreground">好友</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate(`/messages?friendId=${friendUser._id}`)}>
                <MessageCircle className="w-4 h-4" />
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="text-red-500 hover:text-red-600"
                onClick={() => (friend.userId || friendUser?._id) && removeFriendMutation.mutate(friend.userId || friendUser?._id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderRequestCard = (request: any) => {
    if (!request) return null;
    return (
      <Card key={request._id}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                {request.from?.avatar ? (
                  <img src={request.from.avatar} alt={request.from.username || '用户'} className="w-full h-full rounded-full object-cover" />
                ) : (
                  <User className="w-6 h-6 text-primary" />
                )}
              </div>
              <div>
                <h3 className="font-medium">{request.from?.username || '未知用户'}</h3>
                <p className="text-sm text-muted-foreground">请求添加你为好友</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                size="sm" 
                onClick={() => acceptMutation.mutate(request._id)}
                disabled={acceptMutation.isPending}
              >
                <Check className="w-4 h-4" />
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => rejectMutation.mutate(request._id)}
                disabled={rejectMutation.isPending}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderSearchResult = (user: any) => {
    if (!user) return null;
    return (
      <Card key={user._id}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.username} className="w-full h-full rounded-full object-cover" />
                ) : (
                  <User className="w-6 h-6 text-primary" />
                )}
              </div>
              <div>
                <h3 className="font-medium">{user.username || '未知用户'}</h3>
                {user.isFriend && (
                  <Badge variant="success" className="text-xs mt-1">已为好友</Badge>
                )}
                {user.hasRequest && !user.isFriend && (
                  <Badge variant="secondary" className="text-xs mt-1">请求已发送</Badge>
                )}
              </div>
            </div>
            {!user.isFriend && !user.hasRequest && (
              <Button 
                size="sm" 
                onClick={() => sendRequestMutation.mutate(user._id)}
                disabled={sendRequestMutation.isPending}
              >
                <Send className="w-4 h-4 mr-1" />
                添加好友
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (friendsError || requestsError || searchError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">好友系统</h1>
          <p className="text-muted-foreground mt-1">管理你的好友关系</p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-red-500 mb-2">加载失败</p>
            <Button onClick={() => window.location.reload()}>刷新页面</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">好友系统</h1>
        <p className="text-muted-foreground mt-1">管理你的好友关系</p>
      </div>

      <div className="flex gap-2 border-b">
        <Button
          variant={activeTab === 'friends' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('friends')}
          className="rounded-b-none"
        >
          <Users className="w-4 h-4 mr-2" />
          好友列表
          {friends.length > 0 && (
            <Badge variant="secondary" className="ml-2">{friends.length}</Badge>
          )}
        </Button>
        <Button
          variant={activeTab === 'requests' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('requests')}
          className="rounded-b-none"
        >
          <Clock className="w-4 h-4 mr-2" />
          好友请求
          {requests.length > 0 && (
            <Badge variant="destructive" className="ml-2">{requests.length}</Badge>
          )}
        </Button>
        <Button
          variant={activeTab === 'search' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('search')}
          className="rounded-b-none"
        >
          <Search className="w-4 h-4 mr-2" />
          搜索用户
        </Button>
      </div>

      {activeTab === 'search' && (
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索用户名..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {activeTab === 'friends' && (
          friendsLoading ? (
            <div className="col-span-full flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : friends.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="py-12 text-center">
                <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">暂无好友</p>
                <p className="text-sm text-muted-foreground mt-1">切换到"搜索用户"添加好友</p>
              </CardContent>
            </Card>
          ) : (
            friends.filter(Boolean).map(renderFriendCard)
          )
        )}

        {activeTab === 'requests' && (
          requestsLoading ? (
            <div className="col-span-full flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : requests.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="py-12 text-center">
                <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">暂无好友请求</p>
              </CardContent>
            </Card>
          ) : (
            requests.filter(Boolean).map(renderRequestCard)
          )
        )}

        {activeTab === 'search' && (
          searchData === undefined ? (
            <Card className="col-span-full">
              <CardContent className="py-12 text-center">
                <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">输入用户名开始搜索</p>
              </CardContent>
            </Card>
          ) : searchResults.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="py-12 text-center">
                <User className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">未找到匹配的用户</p>
              </CardContent>
            </Card>
          ) : (
            searchResults.filter(Boolean).map(renderSearchResult)
          )
        )}
      </div>
    </div>
  );
}
