import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { inventoryService, InventoryItem } from '@/services/inventory'
import { toast } from 'sonner'

interface InventoryFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item?: InventoryItem | null
}

export function InventoryFormDialog({ open, onOpenChange, item }: InventoryFormDialogProps) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    itemName: '',
    itemType: '',
    rarity: '',
    quantity: 1,
    value: 0,
    condition: '',
    description: '',
  })

  useEffect(() => {
    if (item) {
      setFormData({
        itemName: item.name || item.itemName || '',
        itemType: item.itemType || '',
        rarity: item.rarity || '',
        quantity: item.quantity || 1,
        value: item.value || 0,
        condition: item.condition || '',
        description: item.description || '',
      })
    } else {
      setFormData({
        itemName: '',
        itemType: '',
        rarity: '',
        quantity: 1,
        value: 0,
        condition: '',
        description: '',
      })
    }
  }, [item, open])

  const createMutation = useMutation({
    mutationFn: (data: Partial<InventoryItem>) => inventoryService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['inventoryStats'] })
      toast.success('物品创建成功')
      onOpenChange(false)
    },
    onError: (error: any) => {
      const message = error?.response?.data?.errors?.[0]?.msg || '创建失败'
      toast.error(message)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InventoryItem> }) =>
      inventoryService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['inventoryStats'] })
      toast.success('物品更新成功')
      onOpenChange(false)
    },
    onError: (error: any) => {
      const message = error?.response?.data?.errors?.[0]?.msg || '更新失败'
      toast.error(message)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const submitData = {
      ...formData,
      condition: formData.condition.toLowerCase().replace(' ', '_'),
    }
    
    if (item?.id) {
      updateMutation.mutate({ id: String(item.id), data: submitData })
    } else {
      createMutation.mutate(submitData)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{item ? '编辑物品' : '添加物品'}</DialogTitle>
            <DialogDescription>
              {item ? '修改物品信息' : '添加新的卡牌或物品到库存'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="itemName">物品名称</Label>
              <Input
                id="itemName"
                value={formData.itemName}
                onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                placeholder="输入物品名称"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="itemType">物品类型</Label>
              <Select value={formData.itemType} onValueChange={(value) => setFormData({ ...formData, itemType: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="选择物品类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="card">卡牌</SelectItem>
                  <SelectItem value="booster">补充包</SelectItem>
                  <SelectItem value="box">盒装</SelectItem>
                  <SelectItem value="accessory">配件</SelectItem>
                  <SelectItem value="other">其他</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="rarity">稀有度</Label>
                <Select value={formData.rarity} onValueChange={(value) => setFormData({ ...formData, rarity: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择稀有度" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UR">UR</SelectItem>
                    <SelectItem value="SR">SR</SelectItem>
                    <SelectItem value="R">R</SelectItem>
                    <SelectItem value="N">N</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="condition">品相</Label>
                <Select value={formData.condition} onValueChange={(value) => setFormData({ ...formData, condition: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择品相" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mint">Mint</SelectItem>
                    <SelectItem value="near_mint">Near Mint</SelectItem>
                    <SelectItem value="excellent">Excellent</SelectItem>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="fair">Fair</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="quantity">数量</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="value">单价 (¥)</Label>
                <Input
                  id="value"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">描述</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="物品描述（可选）"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              取消
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? '保存中...' : item ? '更新' : '创建'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}