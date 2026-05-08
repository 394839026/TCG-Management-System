import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { UserPlus } from 'lucide-react'
import apiClient from '@/lib/api'

interface SignPlayerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  teamId: string
  editData?: {
    playerId: string
    signingFee: number
    contractStart?: string
    contractEnd?: string
    role: string
    monthlySalary: number
    notes: string
  }
}

export function SignPlayerDialog({ open, onOpenChange, teamId, editData }: SignPlayerDialogProps) {
  const queryClient = useQueryClient()
  const isEdit = !!editData

  const [formData, setFormData] = useState({
    playerId: editData?.playerId || '',
    signingFee: editData?.signingFee || 0,
    contractStart: editData?.contractStart || '',
    contractEnd: editData?.contractEnd || '',
    role: editData?.role || 'starter',
    monthlySalary: editData?.monthlySalary || 0,
    notes: editData?.notes || ''
  })

  const signMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiClient.post(`/teams/${teamId}/signing/player`, {
        ...data,
        contractStart: data.contractStart || undefined,
        contractEnd: data.contractEnd || undefined
      })
      return response.data
    },
    onSuccess: () => {
      toast.success('选手签约成功')
      queryClient.invalidateQueries({ queryKey: ['signing-players', teamId] })
      queryClient.invalidateQueries({ queryKey: ['signing-stats', teamId] })
      queryClient.invalidateQueries({ queryKey: ['signing-records', teamId] })
      queryClient.invalidateQueries({ queryKey: ['team-detail', teamId] })
      onOpenChange(false)
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || '签约失败')
    }
  })

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiClient.put(`/teams/${teamId}/signing/players/${data.playerId}`, {
        signingFee: data.signingFee,
        contractStart: data.contractStart || undefined,
        contractEnd: data.contractEnd || undefined,
        role: data.role,
        monthlySalary: data.monthlySalary,
        notes: data.notes
      })
      return response.data
    },
    onSuccess: () => {
      toast.success('签约信息更新成功')
      queryClient.invalidateQueries({ queryKey: ['signing-players', teamId] })
      queryClient.invalidateQueries({ queryKey: ['signing-stats', teamId] })
      queryClient.invalidateQueries({ queryKey: ['signing-records', teamId] })
      queryClient.invalidateQueries({ queryKey: ['team-detail', teamId] })
      onOpenChange(false)
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || '更新失败')
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isEdit) {
      updateMutation.mutate(formData)
    } else {
      signMutation.mutate(formData)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              {isEdit ? '编辑签约信息' : '签约新选手'}
            </DialogTitle>
            <DialogDescription>
              {isEdit ? '修改选手的签约信息' : '为战队签约新选手'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {!isEdit && (
              <div className="space-y-2">
                <Label htmlFor="playerId">选手用户ID</Label>
                <Input
                  id="playerId"
                  value={formData.playerId}
                  onChange={(e) => setFormData({ ...formData, playerId: e.target.value })}
                  placeholder="输入选手的用户ID"
                  required
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="signingFee">签约费</Label>
                <Input
                  id="signingFee"
                  type="number"
                  min="0"
                  value={formData.signingFee}
                  onChange={(e) => setFormData({ ...formData, signingFee: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="monthlySalary">月薪</Label>
                <Input
                  id="monthlySalary"
                  type="number"
                  min="0"
                  value={formData.monthlySalary}
                  onChange={(e) => setFormData({ ...formData, monthlySalary: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">选手角色</Label>
              <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="选择角色" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="starter">主力</SelectItem>
                  <SelectItem value="reserve">替补</SelectItem>
                  <SelectItem value="coach">教练</SelectItem>
                  <SelectItem value="staff">工作人员</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contractStart">合约开始日期</Label>
                <Input
                  id="contractStart"
                  type="date"
                  value={formData.contractStart}
                  onChange={(e) => setFormData({ ...formData, contractStart: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contractEnd">合约结束日期</Label>
                <Input
                  id="contractEnd"
                  type="date"
                  value={formData.contractEnd}
                  onChange={(e) => setFormData({ ...formData, contractEnd: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">备注</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="添加备注信息..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={signMutation.isPending || updateMutation.isPending}>
              {signMutation.isPending || updateMutation.isPending ? '提交中...' : isEdit ? '保存' : '签约'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
