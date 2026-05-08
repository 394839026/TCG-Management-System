import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  MessageCircle,
  Check,
  X,
  Users,
  Bell,
  ArrowLeft,
  User,
  Trash2,
  CheckCircle,
  Gift,
  UsersRound,
  UserPlus,
  Search,
  Eye,
  AlertCircle
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { EmojiPicker } from '@/components/EmojiPicker'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { 
  friendService, 
  messageService, 
  notificationService,
  groupChatService,
  Conversation, 
  TradeMessage,
  Notification,
  GroupChat,
  GroupMessage
} from '@/services/api'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'

type ActiveTab = 'friend-messages' | 'group-chats' | 'system-notifications' | 'friend-requests'

export function MessagesPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('friend-messages')
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [selectedGroupChat, setSelectedGroupChat] = useState<GroupChat | null>(null)
  const [messageInput, setMessageInput] = useState('')
  const [groupMessageInput, setGroupMessageInput] = useState('')
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const friendId = searchParams.get('friendId')

  const { data: conversationsData, isLoading: conversationsLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => messageService.getConversations(),
  })

  const { data: friendsData } = useQuery({
    queryKey: ['friends'],
    queryFn: () => friendService.getFriends(),
    enabled: !!friendId, // 只有在有friendId时才加载
  })

  const { data: messagesData, isLoading: messagesLoading } = useQuery({
    queryKey: ['messages', selectedConversation?._id],
    queryFn: () => selectedConversation ? messageService.getMessages(selectedConversation._id) : null,
    enabled: !!selectedConversation,
  })

  const { data: groupChatsData, isLoading: groupChatsLoading } = useQuery({
    queryKey: ['myGroups'],
    queryFn: () => groupChatService.getMyGroups(),
  })

  const { data: groupMessagesData, isLoading: groupMessagesLoading } = useQuery({
    queryKey: ['groupMessages', selectedGroupChat?._id],
    queryFn: () => selectedGroupChat ? groupChatService.getMessages(selectedGroupChat._id) : null,
    enabled: !!selectedGroupChat,
    staleTime: 2000,
  })

  const { data: friendRequestsData, isLoading: friendRequestsLoading } = useQuery({
    queryKey: ['friendRequests'],
    queryFn: () => friendService.getRequests(),
  })

  const { data: notificationsData, isLoading: notificationsLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationService.getNotifications(),
  })

  const { data: unreadNotificationsData } = useQuery({
    queryKey: ['unreadNotificationsCount'],
    queryFn: () => notificationService.getUnreadCount(),
  })

  // 自动刷新好友消息（每2秒）
  useEffect(() => {
    if (selectedConversation) {
      const interval = setInterval(() => {
        queryClient.invalidateQueries({ queryKey: ['messages', selectedConversation._id] })
        queryClient.invalidateQueries({ queryKey: ['conversations'] })
      }, 2000)
      return () => clearInterval(interval)
    }
  }, [selectedConversation, queryClient])

  const conversations = conversationsData?.data || []
  const friends = friendsData?.data || []
  const messages = messagesData?.data || []
  const groupChats = groupChatsData?.data || []
  const groupMessages = groupMessagesData?.data || []
  const friendRequests = friendRequestsData?.data || []
  const notifications = notificationsData?.data || []
  const unreadNotificationsCount = unreadNotificationsData?.count || 0

  useEffect(() => {
    console.log('=== 聊天界面调试 ===')
    console.log('friendId:', friendId)
    console.log('conversations:', conversations)
    console.log('friends:', friends)
    console.log('userId:', user?._id)
    
    if (friendId) {
      const conversation = conversations.find((c: Conversation) => {
        const other = c.participants.find((p: any) => p._id !== user?._id)
        console.log('检查对话:', c._id, 'other:', other?._id, 'friendId:', friendId, '匹配:', other?._id === friendId)
        return other?._id === friendId
      })
      
      console.log('找到的对话:', conversation)
      
      if (conversation) {
        setSelectedConversation(conversation)
        messageService.markAsRead(conversation._id)
        queryClient.invalidateQueries({ queryKey: ['conversations'] })
      } else if (friends.length > 0 && user && user._id) {
        // 如果没有找到对话，但有friends数据，查找对应的好友信息
        const friend = friends.find((f: any) => {
          const friendUserId = f.friend?._id || f.friendId
          return friendUserId === friendId
        })
        
        if (friend) {
          const friendUser = friend.friend || { _id: friendId, username: '好友' }
          // 创建一个临时的conversation对象，用于显示聊天界面
          const tempConversation: Conversation = {
            _id: friendId, // 用好友ID作为临时conversationId
            participants: [
              { _id: user._id, username: user.username, avatar: user.avatar },
              { _id: friendUser._id, username: friendUser.username, avatar: friendUser.avatar }
            ],
            listingId: undefined,
            lastMessage: undefined,
            unreadCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
          setSelectedConversation(tempConversation)
        } else if (user && user._id) {
          // 如果找不到好友信息，使用默认信息
          const tempConversation: Conversation = {
            _id: friendId, // 用好友ID作为临时conversationId
            participants: [
              { _id: user._id, username: user.username, avatar: user.avatar },
              { _id: friendId, username: '好友', avatar: '' }
            ],
            listingId: undefined,
            lastMessage: undefined,
            unreadCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
          setSelectedConversation(tempConversation)
        }
      } else if (user && user._id) {
        // 如果没有找到对话且friends还未加载完成，创建临时的conversation
        const tempConversation: Conversation = {
          _id: friendId, // 用好友ID作为临时conversationId
          participants: [
            { _id: user._id, username: user.username, avatar: user.avatar },
            { _id: friendId, username: '好友', avatar: '' }
          ],
          listingId: undefined,
          lastMessage: undefined,
          unreadCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        setSelectedConversation(tempConversation)
      }
    }

    const groupChatId = searchParams.get('groupChatId')
    if (groupChatId) {
      // 确保活动标签是群聊标签
      setActiveTab('group-chats')
      // 如果还没有选中群聊，尝试查找并选中
      if (!selectedGroupChat && groupChats.length > 0) {
        const groupChat = groupChats.find((g: GroupChat) => g._id === groupChatId)
        if (groupChat) {
          setSelectedGroupChat(groupChat)
        }
      }
    }
  }, [friendId, conversations, friends, user?._id, searchParams, groupChats, selectedGroupChat])

  // 额外的 useEffect 来处理群聊数据加载完成后的选择
  useEffect(() => {
    const groupChatId = searchParams.get('groupChatId')
    if (groupChatId && !selectedGroupChat && groupChats.length > 0) {
      const groupChat = groupChats.find((g: GroupChat) => g._id === groupChatId)
      if (groupChat) {
        setSelectedGroupChat(groupChat)
      }
    }
  }, [groupChats, searchParams, selectedGroupChat])

  const sendMessageMutation = useMutation({
    mutationFn: ({ conversationId, content }: { conversationId: string; content: string }) => 
      messageService.sendMessage(conversationId, content),
    onSuccess: () => {
      setMessageInput('')
      queryClient.invalidateQueries({ queryKey: ['messages', selectedConversation?._id] })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      toast.success('消息已发送')
      // 发送成功后，刷新对话列表，确保新对话显示
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['conversations'] })
      }, 500)
    },
  })

  const sendGroupMessageMutation = useMutation({
    mutationFn: ({ groupId, content }: { groupId: string; content: string }) => 
      groupChatService.sendMessage(groupId, content),
    onSuccess: () => {
      setGroupMessageInput('')
      queryClient.invalidateQueries({ queryKey: ['groupMessages', selectedGroupChat?._id] })
      queryClient.invalidateQueries({ queryKey: ['myGroups'] })
      toast.success('消息已发送')
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['myGroups'] })
      }, 500)
    },
  })

  const acceptRequestMutation = useMutation({
    mutationFn: (requestId: string) => friendService.acceptRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] })
      queryClient.invalidateQueries({ queryKey: ['friends'] })
      toast.success('已接受好友请求')
    },
  })

  const rejectRequestMutation = useMutation({
    mutationFn: (requestId: string) => friendService.rejectRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] })
      toast.success('已拒绝好友请求')
    },
  })

  const markNotificationAsReadMutation = useMutation({
    mutationFn: (notificationId: string) => notificationService.markAsRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['unreadNotificationsCount'] })
    },
  })

  const markAllNotificationsAsReadMutation = useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['unreadNotificationsCount'] })
      toast.success('已全部标记为已读')
    },
  })

  const markAllFriendMessagesAsReadMutation = useMutation({
    mutationFn: () => messageService.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      toast.success('所有好友消息已标记为已读')
    },
  })

  const markAllGroupChatsAsReadMutation = useMutation({
    mutationFn: () => groupChatService.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myGroups'] })
      toast.success('所有群聊消息已标记为已读')
    },
  })

  // 搜索用户
  const { data: searchUsersData } = useQuery({
    queryKey: ['searchUsers', userSearchQuery],
    queryFn: () => friendService.searchUsers(userSearchQuery),
    enabled: userSearchQuery.length >= 2,
  })

  // 添加成员到群聊
  const addGroupMembersMutation = useMutation({
    mutationFn: (userIds: string[]) => 
      groupChatService.addMembers(selectedGroupChat!._id, userIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myGroups'] })
      queryClient.invalidateQueries({ queryKey: ['group', selectedGroupChat!._id] })
      toast.success('邀请成功')
      setShowInviteDialog(false)
      setSelectedUserIds([])
      setUserSearchQuery('')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || '邀请失败')
    },
  })

  const deleteNotificationMutation = useMutation({
    mutationFn: (notificationId: string) => notificationService.deleteNotification(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      toast.success('已删除通知')
    },
  })

  const getOtherParticipant = (conversation: Conversation) => {
    return conversation.participants.find(p => p._id !== user?._id) || conversation.participants[0]
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours < 1) return '刚刚'
    if (hours < 24) return `${hours}小时前`
    return date.toLocaleDateString('zh-CN')
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'welcome':
        return <Gift className="w-6 h-6 text-green-500" />
      case 'friend_request':
        return <Users className="w-6 h-6 text-blue-500" />
      case 'friend_accepted':
        return <CheckCircle className="w-6 h-6 text-green-500" />
      case 'trade':
        return <MessageCircle className="w-6 h-6 text-purple-500" />
      case 'inventory_view_request':
        return <Eye className="w-6 h-6 text-yellow-500" />
      case 'inventory_view_accepted':
        return <CheckCircle className="w-6 h-6 text-green-500" />
      case 'inventory_view_rejected':
        return <AlertCircle className="w-6 h-6 text-red-500" />
      default:
        return <Bell className="w-6 h-6 text-gray-500" />
    }
  }

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedConversation) return
    sendMessageMutation.mutate({ 
      conversationId: selectedConversation._id, 
      content: messageInput 
    })
  }

  const handleSendGroupMessage = () => {
    if (!groupMessageInput.trim() || !selectedGroupChat) return
    sendGroupMessageMutation.mutate({ 
      groupId: selectedGroupChat._id, 
      content: groupMessageInput 
    })
  }

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation)
    messageService.markAsRead(conversation._id)
    queryClient.invalidateQueries({ queryKey: ['conversations'] })
  }

  const handleSelectGroupChat = (groupChat: GroupChat) => {
    setSelectedGroupChat(groupChat)
    // 标记群聊消息为已读
    groupChatService.markAsRead(groupChat._id).catch(() => {})
    queryClient.invalidateQueries({ queryKey: ['myGroups'] })
  }

  const handleBack = () => {
    setSelectedConversation(null)
    setSelectedGroupChat(null)
    navigate('/messages', { replace: true })
  }

  return (
    <div className="h-[calc(100vh-8rem)]">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">消息中心</h1>
        <p className="text-muted-foreground mt-1">管理您的所有消息</p>
      </div>

      {!selectedConversation && !selectedGroupChat ? (
        <div className="space-y-4">
          <div className="flex gap-2 border-b">
            <Button
              variant={activeTab === 'friend-messages' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('friend-messages')}
              className="rounded-b-none"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              好友消息
              {conversations.reduce((sum: number, c: Conversation) => sum + c.unreadCount, 0) > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {conversations.reduce((sum: number, c: Conversation) => sum + c.unreadCount, 0)}
                </Badge>
              )}
            </Button>
            <Button
              variant={activeTab === 'group-chats' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('group-chats')}
              className="rounded-b-none"
            >
              <UsersRound className="w-4 h-4 mr-2" />
              群聊
              {groupChats.reduce((sum: number, g: GroupChat) => sum + (g.unreadCount || 0), 0) > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {groupChats.reduce((sum: number, g: GroupChat) => sum + (g.unreadCount || 0), 0)}
                </Badge>
              )}
            </Button>
            <Button
              variant={activeTab === 'system-notifications' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('system-notifications')}
              className="rounded-b-none"
            >
              <Bell className="w-4 h-4 mr-2" />
              系统通知
              {unreadNotificationsCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {unreadNotificationsCount}
                </Badge>
              )}
            </Button>
            <Button
              variant={activeTab === 'friend-requests' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('friend-requests')}
              className="rounded-b-none"
            >
              <Users className="w-4 h-4 mr-2" />
              好友请求
              {friendRequests.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {friendRequests.length}
                </Badge>
              )}
            </Button>
          </div>

          <div className="space-y-4">
            {activeTab === 'friend-messages' && (
              <>
                {conversations.reduce((sum: number, c: Conversation) => sum + c.unreadCount, 0) > 0 && (
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => markAllFriendMessagesAsReadMutation.mutate()}
                      disabled={markAllFriendMessagesAsReadMutation.isPending}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      全部标记为已读
                    </Button>
                  </div>
                )}
                {conversationsLoading ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                    </CardContent>
                  </Card>
                ) : conversations.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <MessageCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">暂无好友消息</p>
                    </CardContent>
                  </Card>
                ) : (
                  conversations.map((conversation: Conversation) => {
                    const other = getOtherParticipant(conversation)
                    return (
                      <Card
                        key={conversation._id}
                        className="cursor-pointer transition-all hover:bg-muted/50"
                        onClick={() => handleSelectConversation(conversation)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              {other.avatar ? (
                                <img src={other.avatar} alt={other.username} className="w-full h-full rounded-full object-cover" />
                              ) : (
                                <User className="w-6 h-6 text-primary" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <h3 className="font-medium truncate">{other.username}</h3>
                                <span className="text-xs text-muted-foreground">
                                  {formatDate(conversation.updatedAt)}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground truncate mt-1">
                                {conversation.lastMessage?.content || '开始对话'}
                              </p>
                            </div>
                            {conversation.unreadCount > 0 && (
                              <Badge variant="destructive" className="flex-shrink-0">
                                {conversation.unreadCount}
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })
                )}
              </>
            )}

            {activeTab === 'group-chats' && (
              <>
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => markAllGroupChatsAsReadMutation.mutate()}
                    disabled={markAllGroupChatsAsReadMutation.isPending}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    全部标记为已读
                  </Button>
                </div>
                {groupChatsLoading ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                    </CardContent>
                  </Card>
                ) : groupChats.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <UsersRound className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">暂无群聊</p>
                    </CardContent>
                  </Card>
                ) : (
                  groupChats.map((groupChat: GroupChat) => (
                    <Card
                      key={groupChat._id}
                      className="cursor-pointer transition-all hover:bg-muted/50"
                      onClick={() => handleSelectGroupChat(groupChat)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 text-white font-bold text-lg">
                            {groupChat.name[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h3 className="font-medium truncate">{groupChat.name}</h3>
                              <span className="text-xs text-muted-foreground">
                                {formatDate(groupChat.updatedAt)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-sm text-muted-foreground">{groupChat.members.length} 名成员</span>
                              <span className="text-sm text-muted-foreground">|</span>
                              <span className="text-sm text-muted-foreground truncate">
                                {groupChat.lastMessage?.content || '暂无消息'}
                              </span>
                            </div>
                          </div>
                          {groupChat.unreadCount && groupChat.unreadCount > 0 && (
                            <Badge variant="destructive" className="flex-shrink-0">
                              {groupChat.unreadCount}
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </>
            )}

            {activeTab === 'system-notifications' && (
              <>
                {notifications.length > 0 && (
                  <div className="flex justify-end mb-4">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => markAllNotificationsAsReadMutation.mutate()}
                      disabled={markAllNotificationsAsReadMutation.isPending}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      全部标记为已读
                    </Button>
                  </div>
                )}
                {notificationsLoading ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                    </CardContent>
                  </Card>
                ) : notifications.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Bell className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">暂无系统通知</p>
                    </CardContent>
                  </Card>
                ) : (
                  notifications.map((notification: Notification) => (
                    <Card
                      key={notification._id}
                      className={`transition-all hover:bg-muted/50 ${!notification.isRead ? 'bg-primary/5 border-primary/20' : ''}`}
                      onClick={() => {
                    if (!notification.isRead) {
                      markNotificationAsReadMutation.mutate(notification._id)
                    }
                    // 战队邀请通知跳转到邀请管理页面
                    if ((notification.type as any) === 'team_invite' || notification.title === '战队邀请') {
                      navigate('/team-invites')
                    }
                    // 订单相关通知跳转到订单详情
                    if (notification.type === 'order_created' || notification.type === 'order_cancelled' || notification.type === 'order_confirmed' || notification.type === 'order_completed') {
                      const orderId = (notification.data as any)?.orderId
                      if (orderId) {
                        navigate(`/orders?orderId=${orderId}`)
                      }
                    }
                  }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="font-medium flex items-center gap-2">
                                  {notification.title}
                                  {!notification.isRead && (
                                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                                  )}
                                </h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {notification.content}
                                </p>
                                <p className="text-xs text-muted-foreground mt-2">
                                  {formatDate(notification.createdAt)}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  deleteNotificationMutation.mutate(notification._id)
                                }}
                                disabled={deleteNotificationMutation.isPending}
                                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </>
            )}

            {activeTab === 'friend-requests' && (
              friendRequestsLoading ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                  </CardContent>
                </Card>
              ) : friendRequests.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">暂无好友请求</p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => navigate('/friends')}
                    >
                      前往好友管理页
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                friendRequests.map((request: any) => (
                  <Card key={request._id} className="cursor-pointer transition-all hover:bg-muted/50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            {request.from?.avatar ? (
                              <img src={request.from.avatar} alt={request.from.username} className="w-full h-full rounded-full object-cover" />
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
                            onClick={(e) => {
                              e.stopPropagation()
                              acceptRequestMutation.mutate(request._id)
                            }}
                            disabled={acceptRequestMutation.isPending}
                          >
                            <Check className="w-4 h-4 mr-1" />
                            接受
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              rejectRequestMutation.mutate(request._id)
                            }}
                            disabled={rejectRequestMutation.isPending}
                          >
                            <X className="w-4 h-4 mr-1" />
                            拒绝
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )
            )}
          </div>
        </div>
      ) : (
        <div className="h-full flex flex-col">
          {selectedConversation ? (
            <>
              <div className="flex items-center gap-4 mb-4">
                <Button variant="ghost" size="icon" onClick={handleBack}>
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  {(() => {
                    const other = getOtherParticipant(selectedConversation)
                    return other.avatar ? (
                      <img src={other.avatar} alt={other.username} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <User className="w-5 h-5 text-primary" />
                    )
                  })()}
                </div>
                <div>
                  <h3 className="font-medium">{getOtherParticipant(selectedConversation).username}</h3>
                  <p className="text-sm text-muted-foreground">在线</p>
                </div>
              </div>

              <Card className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messagesLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <User className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">开始与 {getOtherParticipant(selectedConversation).username} 的对话</p>
                      <p className="text-sm text-muted-foreground mt-1">发送消息开始交流</p>
                    </div>
                  ) : (
                    messages.map((msg: TradeMessage) => {
                      const isOwn = msg.sender._id === user?._id
                      return (
                        <div key={msg._id} className={`flex gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
                            <div className={`px-4 py-2 rounded-2xl ${isOwn ? 'bg-primary text-white rounded-br-md' : 'bg-muted rounded-bl-md'}`}>
                              <p className="text-sm">{msg.content}</p>
                            </div>
                            <span className="text-xs text-muted-foreground mt-1 block">
                              {formatTime(msg.createdAt)}
                            </span>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>

                <div className="p-4 border-t">
                  <div className="flex gap-3">
                    <EmojiPicker onEmojiSelect={(emoji) => setMessageInput(prev => prev + emoji)} />
                    <Input
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      placeholder="输入消息..."
                      className="flex-1"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && messageInput.trim()) {
                          handleSendMessage()
                        }
                      }}
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!messageInput.trim() || sendMessageMutation.isPending}
                    >
                      发送
                    </Button>
                  </div>
                </div>
              </Card>
            </>
          ) : selectedGroupChat ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <Button variant="ghost" size="icon" onClick={handleBack}>
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                    {selectedGroupChat.name[0]}
                  </div>
                  <div>
                    <h3 className="font-medium">{selectedGroupChat.name}</h3>
                    <p className="text-sm text-muted-foreground">{selectedGroupChat.members.length} 名成员</p>
                  </div>
                </div>
                {/* 检查是否为群聊管理员或群主 */}
                {(() => {
                  const currentMember = selectedGroupChat.members.find(m => m.user._id === user?._id)
                  const isAdmin = currentMember?.role === 'owner' || currentMember?.role === 'admin'
                  return isAdmin && (
                    <Button onClick={() => setShowInviteDialog(true)}>
                      <UserPlus className="w-4 h-4 mr-2" />
                      邀请成员
                    </Button>
                  )
                })()}
              </div>

              <Card className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {groupMessagesLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                    </div>
                  ) : groupMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <UsersRound className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">开始在 {selectedGroupChat.name} 中聊天</p>
                      <p className="text-sm text-muted-foreground mt-1">发送消息开始交流</p>
                    </div>
                  ) : (
                    groupMessages.map((msg: GroupMessage) => {
                      const isOwn = msg.sender._id === user?._id
                      return (
                        <div key={msg._id} className={`flex gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                          {!isOwn && (
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              {msg.sender.avatar ? (
                                <img src={msg.sender.avatar} alt={msg.sender.username} className="w-full h-full rounded-full object-cover" />
                              ) : (
                                <User className="w-4 h-4 text-primary" />
                              )}
                            </div>
                          )}
                          <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
                            {!isOwn && (
                              <span className="text-xs text-muted-foreground">{msg.sender.username}</span>
                            )}
                            <div className={`px-4 py-2 rounded-2xl ${isOwn ? 'bg-primary text-white rounded-br-md' : 'bg-muted rounded-bl-md'}`}>
                              <p className="text-sm">{msg.content}</p>
                            </div>
                            <span className="text-xs text-muted-foreground mt-1 block">
                              {formatTime(msg.createdAt)}
                            </span>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>

                <div className="p-4 border-t">
                  <div className="flex gap-3">
                    <EmojiPicker onEmojiSelect={(emoji) => setGroupMessageInput(prev => prev + emoji)} />
                    <Input
                      value={groupMessageInput}
                      onChange={(e) => setGroupMessageInput(e.target.value)}
                      placeholder="输入群聊消息..."
                      className="flex-1"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && groupMessageInput.trim()) {
                          handleSendGroupMessage()
                        }
                      }}
                    />
                    <Button
                      onClick={handleSendGroupMessage}
                      disabled={!groupMessageInput.trim() || sendGroupMessageMutation.isPending}
                    >
                      发送
                    </Button>
                  </div>
                </div>
              </Card>
            </>
          ) : null}
        </div>
      )}

      {/* 邀请成员对话框 */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>邀请成员加入群聊</DialogTitle>
            <DialogDescription>
              搜索并选择用户邀请他们加入 {selectedGroupChat?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索用户（用户名、邮箱或用户ID）"
                className="pl-10"
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
              />
            </div>

            {/* 搜索结果 */}
            {searchUsersData?.data?.length > 0 && (
              <div className="max-h-[300px] overflow-y-auto space-y-2 border rounded-lg p-2">
                {searchUsersData.data.map((searchUser: any) => {
                  // 检查用户是否已在群聊中
                  const isAlreadyMember = selectedGroupChat?.members.some(
                    m => m.user._id === searchUser._id
                  )
                  // 检查用户是否已被选中
                  const isSelected = selectedUserIds.includes(searchUser._id)
                  
                  return (
                    <div
                      key={searchUser._id}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                        isSelected ? 'bg-primary/10' : 'hover:bg-muted'
                      } ${isAlreadyMember ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={() => {
                        if (!isAlreadyMember) {
                          if (isSelected) {
                            setSelectedUserIds(prev => prev.filter(id => id !== searchUser._id))
                          } else {
                            setSelectedUserIds(prev => [...prev, searchUser._id])
                          }
                        }
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{searchUser.username}</p>
                          {searchUser.email && (
                            <p className="text-sm text-muted-foreground">{searchUser.email}</p>
                          )}
                        </div>
                      </div>
                      {isAlreadyMember && (
                        <Badge variant="outline">已在群中</Badge>
                      )}
                      {isSelected && !isAlreadyMember && (
                        <CheckCircle className="w-5 h-5 text-primary" />
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* 搜索提示 */}
            {userSearchQuery.length > 0 && !searchUsersData?.data?.length && (
              <div className="text-center py-4 text-muted-foreground">
                未找到匹配的用户
              </div>
            )}

            {/* 已选择的用户 */}
            {selectedUserIds.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">已选择 {selectedUserIds.length} 人</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowInviteDialog(false)
              setSelectedUserIds([])
              setUserSearchQuery('')
            }}>
              取消
            </Button>
            <Button
              onClick={() => addGroupMembersMutation.mutate(selectedUserIds)}
              disabled={selectedUserIds.length === 0 || addGroupMembersMutation.isPending}
            >
              {addGroupMembersMutation.isPending ? '邀请中...' : '确认邀请'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
