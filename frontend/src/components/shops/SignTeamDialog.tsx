import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Plus, Edit, Trash2, Building2, Users, Calendar, DollarSign, ShieldCheck } from 'lucide-react'
import { shopService, teamService } from '@/services/api'

interface SignTeamDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  shopId: string
  mode?: 'create' | 'edit'
  existingTeam?: any
  onSuccess?: () => void
}

const SPONSORSHIP_TYPE_OPTIONS = [
  { value: 'cash', label: '现金' },
  { value: 'product', label: '产品' },
  { value: 'service', label: '服务' },
  { value: 'mixed', label: '混合' }
]

const STATUS_OPTIONS = [
  { value: 'active', label: '生效中' },
  { value: 'expired', label: '已到期' },
  { value: 'terminated', label: '已解除' }
]

export function SignTeamDialog({ open, onOpenChange, shopId, mode = 'create', existingTeam, onSuccess }: SignTeamDialogProps) {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [formData, setFormData] = useState({
    teamId: '',
    sponsorshipAmount: 0,
    sponsorshipType: 'cash',
    contractStart: new Date().toISOString().split('T')[0],
    contractEnd: '',
    benefits: '',
    notes: '',
    status: 'active'
  })

  // 获取可用的战队列表
  const { data: teamsData } = useQuery({
    queryKey: ['teams-search', searchQuery],
    queryFn: async () => {
      return await teamService.getAll({ search: searchQuery || undefined })
    },
    enabled: open && mode === 'create'
  })

  const signTeamMutation = useMutation({
    mutationFn: async (data: any) => shopService.signTeam(shopId, data),
    onSuccess: () => {
      toast.success('战队签约成功！')
      queryClient.invalidateQueries({ queryKey: ['shop-signed-teams', shopId] })
      queryClient.invalidateQueries({ queryKey: ['shop', shopId] })
      onOpenChange(false)
      resetForm()
      onSuccess?.()
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || '签约失败')
    }
  })

  const updateTeamMutation = useMutation({
    mutationFn: async (data: any) => shopService.updateSignedTeam(shopId, existingTeam?.team, data),
    onSuccess: () => {
      toast.success('战队签约信息已更新！')
      queryClient.invalidateQueries({ queryKey: ['shop-signed-teams', shopId] })
      queryClient.invalidateQueries({ queryKey: ['shop', shopId] })
      onOpenChange(false)
      resetForm()
      onSuccess?.()
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || '更新失败')
    }
  })

  useEffect(() => {
    if (existingTeam && mode === 'edit') {
      setFormData({
        teamId: existingTeam.team,
        sponsorshipAmount: existingTeam.sponsorshipAmount || 0,
        sponsorshipType: existingTeam.sponsorshipType || 'cash',
        contractStart: existingTeam.contractStart?.split('T')[0] || new Date().toISOString().split('T')[0],
        contractEnd: existingTeam.contractEnd?.split('T')[0] || '',
        benefits: existingTeam.benefits || '',
        notes: existingTeam.notes || '',
        status: existingTeam.status || 'active'
      })
    } else {
      resetForm()
    }
  }, [existingTeam, mode, open])

  const resetForm = () => {
    setFormData({
      teamId: '',
      sponsorshipAmount: 0,
      sponsorshipType: 'cash',
      contractStart: new Date().toISOString().split('T')[0],
      contractEnd: '',
      benefits: '',
      notes: '',
      status: 'active'
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.teamId) {
      toast.error('请选择战队')
      return
    }

    if (mode === 'create') {
      signTeamMutation.mutate(formData)
    } else {
      updateTeamMutation.mutate(formData)
    }
  }

  const availableTeams = teamsData?.data?.filter((team: any) => {
    if (!searchQuery) return true
    return team.name?.toLowerCase().includes(searchQuery.toLowerCase())
  }) || []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'create' ? <Plus className="w-5 h-5" /> : <Edit className="w-5 h-5" />}
            {mode === 'create' ? '签约战队' : '更新战队签约信息'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' ? '选择要签约的战队并填写相关信息' : '修改战队签约的详细信息'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'create' && (
            <div className="space-y-2">
              <Label htmlFor="teamSearch">搜索战队</Label>
              <div className="space-y-2">
                <Input
                  id="teamSearch"
                  placeholder="输入战队名称搜索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <div className="max-h-[200px] overflow-y-auto border rounded-md p-2 space-y-1">
                  {availableTeams.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">未找到战队</p>
                  ) : (
                    availableTeams.map((team: any) => (
                    <button
                      key={team._id}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, teamId: team._id }))}
                      className={`w-full text-left p-2 rounded hover:bg-muted flex items-center gap-2 ${formData.teamId === team._id ? 'bg-primary/10 border border-primary' : ''}`}
                    >
                      <Building2 className="w-4 h-4" />
                      <div>
                        <p className="font-medium">{team.name}</p>
                        {team.description && <p className="text-sm text-muted-foreground">{team.description}</p>}
                      </div>
                    </button>
                  ))
                  )}
                </div>
                )}
                {formData.teamId && (
                  <Card>
                    <CardContent className="p-3">
                      <p className="text-sm font-medium">已选择战队</p>
                      <p className="text-lg">{teamsData?.data?.find((t: any) => t._id === formData.teamId)?.name}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}

          {mode === 'edit' && existingTeam && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">战队</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="font-medium">{existingTeam.teamInfo?.name || '未知战队'}</p>
                {existingTeam.teamInfo?.description && (
                  <p className="text-sm text-muted-foreground">{existingTeam.teamInfo.description}</p>
                )}
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sponsorshipAmount">赞助金额</Label>
              <Input
                id="sponsorshipAmount"
                type="number"
                min="0"
                value={formData.sponsorshipAmount}
                onChange={(e) => setFormData(prev => ({ ...prev, sponsorshipAmount: Number(e.target.value) }))}
                placeholder="输入赞助金额"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sponsorshipType">赞助类型</Label>
              <Select
                value={formData.sponsorshipType}
                onValueChange={(value) => setFormData(prev => ({ ...prev, sponsorshipType: value }))}
            >
                <SelectTrigger>
                  <SelectValue placeholder="选择赞助类型" />
                </SelectTrigger>
                <SelectContent>
                  {SPONSORSHIP_TYPE_OPTIONS.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contractStart">合约开始日期</Label>
              <Input
                id="contractStart"
                type="date"
                value={formData.contractStart}
                onChange={(e) => setFormData(prev => ({ ...prev, contractStart: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contractEnd">合约结束日期（可选）</Label>
              <Input
                id="contractEnd"
                type="date"
                value={formData.contractEnd}
                onChange={(e) => setFormData(prev => ({ ...prev, contractEnd: e.target.value }))}
              />
            </div>
          </div>

          {mode === 'edit' && (
            <div className="space-y-2">
              <Label htmlFor="status">状态</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as any }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择状态" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="benefits">权益描述</Label>
            <Textarea
              id="benefits"
              value={formData.benefits}
              onChange={(e) => setFormData(prev => ({ ...prev, benefits: e.target.value }))}
              placeholder="描述战队可获得的权益..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">备注</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="其他备注信息..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button 
              type="submit" 
              disabled={signTeamMutation.isPending || updateTeamMutation.isPending}
            >
              {mode === 'create' ? '签约' : '更新'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
