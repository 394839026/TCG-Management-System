import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Users, Check, X, ArrowLeft, Inbox } from 'lucide-react'
import { teamService } from '@/services/api'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export function TeamInvitesPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: invitesData, isLoading } = useQuery({
    queryKey: ['myInvites'],
    queryFn: () => teamService.getMyInvites(),
  })

  const acceptInviteMutation = useMutation({
    mutationFn: (inviteId: string) => teamService.acceptInvite(inviteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myInvites'] })
      toast.success('已接受邀请')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || '操作失败')
    },
  })

  const rejectInviteMutation = useMutation({
    mutationFn: (inviteId: string) => teamService.rejectInvite(inviteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myInvites'] })
      toast.success('已拒绝邀请')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || '操作失败')
    },
  })

  const invites = invitesData?.data || []

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="w-8 h-8" />
            我的邀请
          </h1>
          <p className="text-muted-foreground mt-1">查看和处理收到的战队邀请</p>
        </div>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回
        </Button>
      </div>

      {invites.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Inbox className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium">暂无收到的邀请</p>
            <p className="text-sm text-muted-foreground mt-1">当你收到战队邀请时会显示在这里</p>
            <Button className="mt-4" onClick={() => navigate('/teams')}>
              <Users className="w-4 h-4 mr-2" />
              浏览战队
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {invites.map((invite: any) => (
            <Card key={invite._id} className="card-hover">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{invite.team?.name || '未知战队'}</CardTitle>
                      <CardDescription>
                        邀请人: {invite.invitedBy?.username || '未知'}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="secondary">待处理</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {invite.message && (
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">邀请留言:</p>
                    <p className="font-medium italic mt-1">"{invite.message}"</p>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => acceptInviteMutation.mutate(invite._id)}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    接受邀请
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => rejectInviteMutation.mutate(invite._id)}
                  >
                    <X className="w-4 h-4 mr-2" />
                    拒绝邀请
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
