import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { BookOpen, Plus, Heart, Eye, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { deckService, Deck } from '@/services/api'
import { toast } from 'sonner'
import { DeckFormDialog } from '@/components/decks/DeckFormDialog'

const GAME_TYPES: Record<string, string> = {
  'rune': '符文战场',
}

const FORMAT_TYPES: Record<string, string> = {
  'casual': '休闲',
  'competitive': '竞技',
  'creative': '脑洞',
  'top-deck': '上位构筑',
}

export function DecksPage() {
  const [activeTab, setActiveTab] = useState<'my' | 'public' | 'favorites'>('my')
  const [formOpen, setFormOpen] = useState(false)
  const [editingDeck, setEditingDeck] = useState<Deck | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingDeckId, setDeletingDeckId] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const { data: decksData, isLoading } = useQuery({
    queryKey: ['decks', activeTab],
    queryFn: () => activeTab === 'public' ? deckService.getPublic() : deckService.getAll(),
  })

  const likeMutation = useMutation({
    mutationFn: (id: string) => deckService.like(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['decks'] })
      toast.success('点赞成功')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deckService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['decks'] })
      toast.success('卡组已删除')
      setDeleteDialogOpen(false)
      setDeletingDeckId(null)
    },
    onError: (error: any) => {
      const errorMsg = error.response?.data?.message || '删除失败'
      toast.error(errorMsg)
    },
  })

  const decks: Deck[] = decksData?.data || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">卡组管理</h1>
          <p className="text-muted-foreground mt-1">创建和分享你的卡组</p>
        </div>
        <Button variant="premium" onClick={() => { setEditingDeck(null); setFormOpen(true) }}>
          <Plus className="w-4 h-4 mr-2" />
          创建卡组
        </Button>
      </div>

      {/* Deck tabs */}
      <div className="flex gap-2 border-b">
        <Button 
          variant={activeTab === 'my' ? 'default' : 'ghost'} 
          onClick={() => setActiveTab('my')}
          className="rounded-b-none"
        >
          我的卡组
        </Button>
        <Button 
          variant={activeTab === 'public' ? 'default' : 'ghost'} 
          onClick={() => setActiveTab('public')}
          className="rounded-b-none"
        >
          公共卡组
        </Button>
        <Button 
          variant={activeTab === 'favorites' ? 'default' : 'ghost'} 
          onClick={() => setActiveTab('favorites')}
          className="rounded-b-none"
        >
          收藏的卡组
        </Button>
      </div>

      {/* Decks grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : decks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">暂无卡组，点击"创建卡组"开始</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {decks.map((deck: Deck) => (
            <Card key={deck._id} className="card-hover">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{deck.name}</CardTitle>
                    <CardDescription>{GAME_TYPES[deck.game] || deck.game} · {deck.format ? FORMAT_TYPES[deck.format] || deck.format : '无定位'}</CardDescription>
                  </div>
                  {deck.isPublic ? (
                    <Badge variant="success">公开</Badge>
                  ) : (
                    <Badge variant="secondary">私有</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="aspect-video bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg flex items-center justify-center">
                    <BookOpen className="w-12 h-12 text-primary/40" />
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">卡牌数量</span>
                    <span className="font-medium">{deck.cards?.length || 0} 张</span>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <button 
                      className="flex items-center gap-1 hover:text-primary transition-colors"
                      onClick={() => likeMutation.mutate(deck._id)}
                    >
                      <Heart className="w-4 h-4" />
                      {deck.likes?.length || 0}
                    </button>
                    <span className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      0
                    </span>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => { setEditingDeck(deck); setFormOpen(true) }}>编辑</Button>
                    <Button size="sm" className="flex-1" onClick={() => navigate(`/decks/${deck._id}`)}>查看</Button>
                    {activeTab === 'my' && (
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeletingDeckId(deck._id)
                          setDeleteDialogOpen(true)
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        删除
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <DeckFormDialog 
        open={formOpen} 
        onOpenChange={setFormOpen} 
        deck={editingDeck} 
      />

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              您确定要删除这个卡组吗？此操作无法撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setDeleteDialogOpen(false)
                setDeletingDeckId(null)
              }}
              disabled={deleteMutation.isPending}
            >
              取消
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                if (deletingDeckId) {
                  deleteMutation.mutate(deletingDeckId)
                }
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? '删除中...' : '删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
