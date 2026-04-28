import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { tradeService, TradeListing } from '@/services/api'
import { toast } from 'sonner'

interface TradeFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  listing?: TradeListing | null
}

export function TradeFormDialog({ open, onOpenChange, listing }: TradeFormDialogProps) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    type: 'sell' as 'sell' | 'buy' | 'trade',
    price: 0,
  })

  useEffect(() => {
    if (listing) {
      setFormData({
        type: listing.type || 'sell',
        price: listing.price || 0,
      })
    } else {
      setFormData({
        type: 'sell',
        price: 0,
      })
    }
  }, [listing, open])

  const createMutation = useMutation({
    mutationFn: (data: Partial<TradeListing>) => tradeService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tradeListings'] })
      toast.success('交易发布成功')
      onOpenChange(false)
    },
    onError: () => {
      toast.error('发布失败')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TradeListing> }) =>
      tradeService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tradeListings'] })
      toast.success('交易更新成功')
      onOpenChange(false)
    },
    onError: () => {
      toast.error('更新失败')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (listing?._id) {
      updateMutation.mutate({ id: listing._id, data: formData })
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
            <DialogTitle>{listing ? '编辑交易' : '发布交易'}</DialogTitle>
            <DialogDescription>
              {listing ? '修改交易信息' : '发布新的交易信息'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="type">交易类型</Label>
              <Select value={formData.type} onValueChange={(value: 'sell' | 'buy' | 'trade') => setFormData({ ...formData, type: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="选择交易类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sell">出售</SelectItem>
                  <SelectItem value="buy">求购</SelectItem>
                  <SelectItem value="trade">交换</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="price">价格 (¥)</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              取消
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? '保存中...' : listing ? '更新' : '发布'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
