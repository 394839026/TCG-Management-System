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
import { Search, Check, X, Clock, Eye, Send, User, MessageSquare, ShieldCheck } from 'lucide-react'
import apiClient from '@/lib/api'
import { 
  inventoryViewRequestService, 
  friendService,
  type InventoryViewRequest as InventoryViewRequestType
} from '@/services/api'

interface InventoryViewRequestDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId?: string // 如果提供了userId，则直接显示发送申请给该用户
  onSuccess?: () => void
}

const STATUS_OPTIONS = [
  { value: 'pending', label: '待处理', color: 'bg-yellow-500' },
  { value: 'accepted', label: '已接受', color: 'bg-green-500' },
  { value: 'rejected', label: '已拒绝', color: 'bg-red-500' },
  { value: 'expired', label: '已过期', color: 'bg-gray-500' }
]

export function InventoryViewRequestDialog({ open, onOpenChange, userId, onSuccess }: InventoryViewRequestDialogProps) {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('received')
  const [searchQuery, setSearchQuery] = useState('')
  const [message, setMessage] = useState('')
  const [selectedUser, setSelectedUser] = useState<string | null>(userId || null)
  const [sendDialogOpen, setSendDialogOpen] = useState(false)

  // 获取我收到的申请
  const { data: receivedRequests, isLoading: isLoadingReceived } = useQuery({
    queryKey: ['inventoryViewRequests', 'received'],
    queryFn: () => inventoryViewRequestService.getMyReceivedRequests(),
    enabled: open && activeTab === 'received'
  })

  // 获取我发送的申请
  const { data: sentRequests, isLoading: isLoadingSent } = useQuery({
    queryKey: ['inventoryViewRequests', 'sent'],
    queryFn: () => inventoryViewRequestService.getMySentRequests(),
    enabled: open && activeTab === 'sent'
  })

  // 搜索用户
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['users', 'search', searchQuery],
    queryFn: () => friendService.searchUsers(searchQuery),
    enabled: searchQuery.length >= 2 && open && activeTab === 'search'
  })

  // 接受申请的mutation
  const acceptMutation = useMutation({
    mutationFn: (requestId: string) => inventoryViewRequestService.acceptRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventoryViewRequests'] })
      toast.success('已接受申请')
      onSuccess?.()
    },
    onError: () => {
      toast.error('操作失败')
    }
  })

  // 拒绝申请的mutation
  const rejectMutation = useMutation({
    mutationFn: (requestId: string) => inventoryViewRequestService.rejectRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventoryViewRequests'] })
      toast.success('已拒绝申请')
      onSuccess?.()
    },
    onError: () => {
      toast.error('操作失败')
    }
  })

  // 删除申请的mutation
  const deleteMutation = useMutation({
    mutationFn: (requestId: string) => inventoryViewRequestService.deleteRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventoryViewRequests'] })
      toast.success('已删除申请')
      onSuccess?.()
    },
    onError: () => {
      toast.error('操作失败')
    }
  })

  // 发送申请的mutation
  const sendRequestMutation = useMutation({
    mutationFn: ({ userId, message }: { userId: string; message?: string }) => 
      inventoryViewRequestService.sendRequest(userId, message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventoryViewRequests'] })
      toast.success('申请已发送')
      setSelectedUser(null)
      setMessage('')
      setSendDialogOpen(false)
      setActiveTab('sent')
      onSuccess?.()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || '发送失败')
    }
  })

  // 渲染状态标签
  const renderStatusBadge = (status: string) => {
    const option = STATUS_OPTIONS.find(o => o.value === status)
    return (
      <Badge className={option?.color || 'bg-gray-500'}>
        {option?.label || status}
      </Badge>
    )
  }

  // 渲染申请列表
  const renderRequestList = (requests: InventoryViewRequestType[], isReceived: boolean) => {
    if (!requests || requests.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          暂无申请
        </div>
      )
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{isReceived ? '申请人' : '被申请人'}</TableHead>
            <TableHead>状态</TableHead>
            <TableHead>申请留言</TableHead>
            <TableHead>申请时间</TableHead>
            <TableHead>过期时间</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((request) => (
            <TableRow key={request._id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  {isReceived ? (
                    <div>
                      <div className="font-medium">{request.requester.username}</div>
                    </div>
                  ) : (
                    <div>
                      <div className="font-medium">{request.owner.username}</div>
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>{renderStatusBadge(request.status)}</TableCell>
              <TableCell>
                {request.message || '无留言'}
              </TableCell>
              <TableCell>
                {new Date(request.createdAt).toLocaleString('zh-CN')}
              </TableCell>
              <TableCell>
                {new Date(request.expiresAt).toLocaleString('zh-CN')}
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  {isReceived && request.status === 'pending' && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => acceptMutation.mutate(request._id)}
                        disabled={acceptMutation.isPending}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        接受
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => rejectMutation.mutate(request._id)}
                        disabled={rejectMutation.isPending}
                      >
                        <X className="w-4 h-4 mr-1" />
                        拒绝
                      </Button>
                    </>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deleteMutation.mutate(request._id)}
                    disabled={deleteMutation.isPending}
                  >
                    <X className="w-4 h-4 mr-1" />
                    删除
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              库存查看申请管理
            </DialogTitle>
            <DialogDescription>
              管理查看他人库存的申请和权限
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="mb-4">
              <TabsTrigger value="received" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                我收到的申请
                {receivedRequests?.data?.filter((r: any) => r.status === 'pending').length > 0 && (
                  <Badge variant="destructive" className="ml-1">
                    {receivedRequests.data.filter((r: any) => r.status === 'pending').length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="sent" className="flex items-center gap-2">
                <Send className="w-4 h-4" />
                我发送的申请
              </TabsTrigger>
              <TabsTrigger value="search" className="flex items-center gap-2">
                <Search className="w-4 h-4" />
                发送申请
              </TabsTrigger>
            </TabsList>

            <TabsContent value="received" className="flex-1 overflow-auto">
              {renderRequestList(receivedRequests?.data || [], true)}
            </TabsContent>

            <TabsContent value="sent" className="flex-1 overflow-auto">
              {renderRequestList(sentRequests?.data || [], false)}
            </TabsContent>

            <TabsContent value="search" className="flex-1 overflow-auto">
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="搜索用户名或邮箱..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {searchResults?.data && searchResults.data.length > 0 && (
                  <div className="space-y-2">
                    {searchResults.data.map((user: any) => (
                      <Card key={user._id}>
                        <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div>
                              <div className="font-medium">{user.username}</div>
                              {user.email && (
                                <div className="text-sm text-gray-500">{user.email}</div>
                              )}
                            </div>
                          </div>
                          <Button
                            onClick={() => {
                              setSelectedUser(user._id)
                              setSendDialogOpen(true)
                            }}
                          >
                            <Send className="w-4 h-4 mr-2" />
                            发送申请
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {searchQuery.length >= 2 && searchResults?.data?.length === 0 && !isSearching && (
                  <div className="text-center py-8 text-gray-500">
                    未找到匹配的用户
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* 发送申请对话框 */}
      <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>发送查看库存申请</DialogTitle>
            <DialogDescription>
              向对方发送查看库存的申请
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>申请留言（可选）</Label>
              <Textarea
                placeholder="可以写一些留言让对方知道你的来意..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setSendDialogOpen(false)}
              >
                取消
              </Button>
              <Button
                onClick={() => {
                  if (selectedUser) {
                    sendRequestMutation.mutate({ userId: selectedUser, message })
                  }
                }}
                disabled={sendRequestMutation.isPending}
              >
                <Send className="w-4 h-4 mr-2" />
                发送申请
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}