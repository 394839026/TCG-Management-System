import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { BookOpen, Plus, Eye, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { deckService, Deck } from '@/services/api'
import { inventoryService, InventoryItem } from '@/services/inventory'
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

export function DeckBuildingPage() {
  const [formOpen, setFormOpen] = useState(false)
  const [editingDeck, setEditingDeck] = useState<Deck | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingDeckId, setDeletingDeckId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const { data: decksData, isLoading } = useQuery({
    queryKey: ['decks', 'building'],
    queryFn: () => deckService.getAll(),
  })

  const { data: inventoryData } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => inventoryService.getAll({ limit: 2000 }),
  })

  const inventory: InventoryItem[] = inventoryData?.data || []
  const decks: Deck[] = (decksData?.data || []).filter((deck: Deck) => deck.type === 'building')

  const handleDelete = async () => {
    if (!deletingDeckId) return
    
    setIsDeleting(true)
    
    try {
      // 找到要删除的构筑
      const deck = decks.find(d => d._id === deletingDeckId)
      
      if (deck) {
        // 获取所有卡牌
        const allCards = [
          ...(deck.legend || []),
          ...(deck.mainDeck || []),
          ...(deck.sideDeck || []),
          ...(deck.battlefield || []),
          ...(deck.runes || []),
          ...(deck.tokens || []),
        ]
        
        // 聚合相同卡牌的数量
        const cardQuantityMap = new Map<string, number>()
        for (const card of allCards) {
          const cardId = card.card
          const currentAmount = cardQuantityMap.get(cardId) || 0
          cardQuantityMap.set(cardId, currentAmount + card.quantity)
        }
        
        // 返还所有卡牌到库存
        const inventoryUpdates: Promise<any>[] = []
        
        for (const [cardId, quantity] of cardQuantityMap) {
          const inventoryItem = inventory.find(item => String(item._id) === String(cardId) || String(item.id) === String(cardId))
          if (inventoryItem) {
            const currentQuantity = inventoryItem.userQuantity ?? inventoryItem.quantity ?? 0
            inventoryUpdates.push(
              inventoryService.updateUserInventory(String(inventoryItem._id), {
                quantity: currentQuantity + quantity
              })
            )
          }
        }
        
        // 执行库存更新
        await Promise.all(inventoryUpdates)
      }
      
      // 删除构筑
      await deckService.delete(deletingDeckId)
      
      // 刷新数据
      queryClient.invalidateQueries({ queryKey: ['decks'] })
      queryClient.invalidateQueries({ queryKey: ['decks', 'building'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      
      toast.success('构筑已删除，库存已返还')
      setDeleteDialogOpen(false)
      setDeletingDeckId(null)
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || '删除失败'
      toast.error(errorMsg)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">卡组构筑</h1>
          <p className="text-muted-foreground mt-1">使用你的个人库存构筑卡组</p>
        </div>
        <Button variant="premium" onClick={() => { setEditingDeck(null); setFormOpen(true) }}>
          <Plus className="w-4 h-4 mr-2" />
          新建构筑
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
            <p className="text-muted-foreground">暂无构筑，点击"新建构筑"开始</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {decks.map((deck: Deck) => (
            <Card key={deck._id} className="card-hover">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className="text-lg">{deck.name}</CardTitle>
                      <Badge variant="default" className="bg-purple-600">构筑</Badge>
                    </div>
                    <CardDescription>{GAME_TYPES[deck.game] || deck.game} · {deck.format ? FORMAT_TYPES[deck.format] || deck.format : '无定位'}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="aspect-video bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-lg flex items-center justify-center">
                    <BookOpen className="w-12 h-12 text-purple-500/40" />
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">卡牌数量</span>
                    <span className="font-medium">{deck.cards?.length || 0} 张</span>
                  </div>



                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => { setEditingDeck(deck); setFormOpen(true) }}>编辑</Button>
                    <Button size="sm" className="flex-1" onClick={() => navigate(`/decks/${deck._id}`)}>查看</Button>
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
        mode="building"
      />

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              您确定要删除这个构筑吗？此操作无法撤销。删除后卡牌将返还到您的库存。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setDeleteDialogOpen(false)
                setDeletingDeckId(null)
              }}
              disabled={isDeleting}
            >
              取消
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? '删除中...' : '删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
