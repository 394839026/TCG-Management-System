import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Building2 } from 'lucide-react'
import apiClient from '@/lib/api'

interface SponsorFormData {
  name: string
  logo: string
  contactPerson: string
  contactPhone: string
  contactEmail: string
  sponsorshipAmount: number
  sponsorshipType: 'cash' | 'product' | 'service' | 'mixed'
  contractStart: string
  contractEnd: string
  benefits: string
  notes: string
}

interface AddSponsorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entityId: string
  entityType: 'team' | 'shop'
  editData?: SponsorFormData & { sponsorId: string }
}

export function AddSponsorDialog({ open, onOpenChange, entityId, entityType, editData }: AddSponsorDialogProps) {
  const queryClient = useQueryClient()
  const isEdit = !!editData

  const [formData, setFormData] = useState<SponsorFormData>({
    name: editData?.name || '',
    logo: editData?.logo || '',
    contactPerson: editData?.contactPerson || '',
    contactPhone: editData?.contactPhone || '',
    contactEmail: editData?.contactEmail || '',
    sponsorshipAmount: editData?.sponsorshipAmount || 0,
    sponsorshipType: editData?.sponsorshipType || 'cash',
    contractStart: editData?.contractStart || '',
    contractEnd: editData?.contractEnd || '',
    benefits: editData?.benefits || '',
    notes: editData?.notes || ''
  })

  const addMutation = useMutation({
    mutationFn: async (data: SponsorFormData) => {
      const baseUrl = entityType === 'team' ? '/teams' : '/shops'
      const response = await apiClient.post(`${baseUrl}/${entityId}/signing/sponsor`, {
        ...data,
        contractStart: data.contractStart || undefined,
        contractEnd: data.contractEnd || undefined
      })
      return response.data
    },
    onSuccess: () => {
      toast.success('赞助商添加成功')
      queryClient.invalidateQueries({ queryKey: ['signing-sponsors', entityId] })
      queryClient.invalidateQueries({ queryKey: ['signing-stats', entityId] })
      queryClient.invalidateQueries({ queryKey: ['signing-records', entityId] })
      queryClient.invalidateQueries({ queryKey: ['team-detail', entityId] })
      onOpenChange(false)
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || '添加失败')
    }
  })

  const updateMutation = useMutation({
    mutationFn: async (data: SponsorFormData) => {
      const baseUrl = entityType === 'team' ? '/teams' : '/shops'
      const response = await apiClient.put(`${baseUrl}/${entityId}/signing/sponsors/${editData?.sponsorId}`, {
        ...data,
        contractStart: data.contractStart || undefined,
        contractEnd: data.contractEnd || undefined
      })
      return response.data
    },
    onSuccess: () => {
      toast.success('赞助商信息更新成功')
      queryClient.invalidateQueries({ queryKey: ['signing-sponsors', entityId] })
      queryClient.invalidateQueries({ queryKey: ['signing-stats', entityId] })
      queryClient.invalidateQueries({ queryKey: ['signing-records', entityId] })
      queryClient.invalidateQueries({ queryKey: ['team-detail', entityId] })
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
      addMutation.mutate(formData)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              {isEdit ? '编辑赞助商' : '添加赞助商'}
            </DialogTitle>
            <DialogDescription>
              {isEdit ? '修改赞助商信息' : '为战队/店铺添加新的赞助商'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">赞助商名称 *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="输入赞助商名称"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="logo">赞助商Logo URL</Label>
              <Input
                id="logo"
                value={formData.logo}
                onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
                placeholder="输入Logo图片URL"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactPerson">联系人</Label>
                <Input
                  id="contactPerson"
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                  placeholder="联系人姓名"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactPhone">联系电话</Label>
                <Input
                  id="contactPhone"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                  placeholder="联系电话"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactEmail">邮箱</Label>
              <Input
                id="contactEmail"
                type="email"
                value={formData.contactEmail}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                placeholder="邮箱地址"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sponsorshipAmount">赞助金额</Label>
                <Input
                  id="sponsorshipAmount"
                  type="number"
                  min="0"
                  value={formData.sponsorshipAmount}
                  onChange={(e) => setFormData({ ...formData, sponsorshipAmount: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sponsorshipType">赞助类型</Label>
                <Select
                  value={formData.sponsorshipType}
                  onValueChange={(value: 'cash' | 'product' | 'service' | 'mixed') =>
                    setFormData({ ...formData, sponsorshipType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">现金</SelectItem>
                    <SelectItem value="product">产品</SelectItem>
                    <SelectItem value="service">服务</SelectItem>
                    <SelectItem value="mixed">混合</SelectItem>
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
              <Label htmlFor="benefits">赞助权益</Label>
              <Textarea
                id="benefits"
                value={formData.benefits}
                onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
                placeholder="描述赞助商的权益..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">备注</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="添加备注信息..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={addMutation.isPending || updateMutation.isPending}>
              {addMutation.isPending || updateMutation.isPending ? '提交中...' : isEdit ? '保存' : '添加'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
