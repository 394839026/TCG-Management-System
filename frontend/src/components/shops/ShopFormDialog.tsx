import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { shopService, Shop } from '@/services/api'
import { toast } from 'sonner'

interface ShopFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  shop?: Shop | null
}

export function ShopFormDialog({ open, onOpenChange, shop }: ShopFormDialogProps) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
  })

  useEffect(() => {
    if (shop) {
      setFormData({
        name: shop.name || '',
        description: shop.description || '',
        location: shop.location || '',
      })
    } else {
      setFormData({
        name: '',
        description: '',
        location: '',
      })
    }
  }, [shop, open])

  const createMutation = useMutation({
    mutationFn: (data: Partial<Shop>) => shopService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shops'] })
      toast.success('店铺创建成功')
      onOpenChange(false)
    },
    onError: () => {
      toast.error('创建失败')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Shop> }) =>
      shopService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shops'] })
      toast.success('店铺更新成功')
      onOpenChange(false)
    },
    onError: () => {
      toast.error('更新失败')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (shop?._id) {
      updateMutation.mutate({ id: shop._id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{shop ? '编辑店铺' : '创建店铺'}</DialogTitle>
            <DialogDescription>
              {shop ? '修改店铺信息' : '创建新的卡牌店铺'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">店铺名称</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="输入店铺名称"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="location">地址</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="店铺地址"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">描述</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="店铺描述（可选）"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              取消
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? '保存中...' : shop ? '更新' : '创建'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
