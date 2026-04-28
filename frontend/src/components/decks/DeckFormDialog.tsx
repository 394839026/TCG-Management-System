import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { deckService, Deck } from '@/services/api'
import { toast } from 'sonner'

interface DeckFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  deck?: Deck | null
}

export function DeckFormDialog({ open, onOpenChange, deck }: DeckFormDialogProps) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    name: '',
    game: '',
    format: '',
    description: '',
    isPublic: false,
  })

  useEffect(() => {
    if (deck) {
      setFormData({
        name: deck.name || '',
        game: deck.game || '',
        format: deck.format || '',
        description: deck.description || '',
        isPublic: deck.isPublic || false,
      })
    } else {
      setFormData({
        name: '',
        game: '',
        format: '',
        description: '',
        isPublic: false,
      })
    }
  }, [deck, open])

  const createMutation = useMutation({
    mutationFn: (data: Partial<Deck>) => deckService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['decks'] })
      toast.success('卡组创建成功')
      onOpenChange(false)
    },
    onError: () => {
      toast.error('创建失败')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Deck> }) =>
      deckService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['decks'] })
      toast.success('卡组更新成功')
      onOpenChange(false)
    },
    onError: () => {
      toast.error('更新失败')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (deck?._id) {
      updateMutation.mutate({ id: deck._id, data: formData })
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
            <DialogTitle>{deck ? '编辑卡组' : '创建卡组'}</DialogTitle>
            <DialogDescription>
              {deck ? '修改卡组信息' : '创建新的卡组'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">卡组名称</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="输入卡组名称"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="game">游戏</Label>
                <Input
                  id="game"
                  value={formData.game}
                  onChange={(e) => setFormData({ ...formData, game: e.target.value })}
                  placeholder="例如：游戏王"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="format">格式</Label>
                <Select value={formData.format} onValueChange={(value) => setFormData({ ...formData, format: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择格式" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">标准</SelectItem>
                    <SelectItem value="advanced">进阶</SelectItem>
                    <SelectItem value="casual">休闲</SelectItem>
                    <SelectItem value="competitive">竞技</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">描述</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="卡组描述（可选）"
                rows={3}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPublic"
                checked={formData.isPublic}
                onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="isPublic" className="text-sm">公开卡组（其他人可以查看）</Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              取消
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? '保存中...' : deck ? '更新' : '创建'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
