import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Search, Minus, Trash2, Package } from 'lucide-react';
import { inventoryService, InventoryItem } from '@/services/inventory';

interface DeckCard {
  card: string;
  quantity: number;
}

interface DeckCardsEditorProps {
  cards: DeckCard[];
  onCardsChange: (cards: DeckCard[]) => void;
}

export function DeckCardsEditor({ cards, onCardsChange }: DeckCardsEditorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showInventory, setShowInventory] = useState(false);

  const { data: inventoryData, isLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => inventoryService.getAll(),
  });

  const inventory: InventoryItem[] = inventoryData?.data || [];
  const filteredInventory = inventory.filter(item => 
    item.itemName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addCardFromInventory = (item: InventoryItem) => {
    const existingCard = cards.find(c => c.card === String(item._id));
    if (existingCard) {
      onCardsChange(cards.map(c => 
        c.card === String(item._id) 
          ? { ...c, quantity: c.quantity + 1 }
          : c
      ));
    } else {
      onCardsChange([...cards, { card: String(item._id), quantity: 1 }]);
    }
  };

  const updateQuantity = (index: number, delta: number) => {
    const newCards = [...cards];
    newCards[index] = {
      ...newCards[index],
      quantity: Math.max(1, newCards[index].quantity + delta)
    };
    onCardsChange(newCards);
  };

  const removeCard = (index: number) => {
    onCardsChange(cards.filter((_, i) => i !== index));
  };

  const addCustomCard = () => {
    const cardName = prompt('请输入卡牌名称或ID：');
    if (cardName && cardName.trim()) {
      const existingCard = cards.find(c => c.card === cardName.trim());
      if (existingCard) {
        onCardsChange(cards.map(c => 
          c.card === cardName.trim() 
            ? { ...c, quantity: c.quantity + 1 }
            : c
        ));
      } else {
        onCardsChange([...cards, { card: cardName.trim(), quantity: 1 }]);
      }
    }
  };

  const totalCards = cards.reduce((sum, c) => sum + c.quantity, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-base font-semibold">卡组构成</Label>
          <p className="text-sm text-muted-foreground mt-1">
            共 {cards.length} 种卡牌，总计 {totalCards} 张
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowInventory(true)}>
            <Package className="w-4 h-4 mr-2" />
            从库存添加
          </Button>
          <Button variant="outline" size="sm" onClick={addCustomCard}>
            <Plus className="w-4 h-4 mr-2" />
            添加卡牌
          </Button>
        </div>
      </div>

      {cards.length === 0 ? (
        <div className="text-center py-8 border border-dashed rounded-lg">
          <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">卡组中暂无卡牌</p>
          <p className="text-sm text-muted-foreground mt-1">点击上方按钮添加卡牌</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
          {cards.map((cardItem, index) => {
            const inventoryItem = inventory.find(i => String(i._id) === cardItem.card);
            const cardName = inventoryItem?.itemName || cardItem.card;
            
            return (
              <div 
                key={`${cardItem.card}-${index}`} 
                className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-lg">🎴</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{cardName}</p>
                  <p className="text-sm text-muted-foreground">
                    {inventoryItem?.rarity && (
                      <span className="mr-2">{inventoryItem.rarity}</span>
                    )}
                    {inventoryItem?.itemType}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => updateQuantity(index, -1)}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <Input 
                    type="number" 
                    value={cardItem.quantity} 
                    onChange={(e) => {
                      const newCards = [...cards];
                      newCards[index] = { ...newCards[index], quantity: Math.max(1, parseInt(e.target.value) || 1) };
                      onCardsChange(newCards);
                    }}
                    className="w-16 h-8 text-center"
                    min="1"
                  />
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => updateQuantity(index, 1)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-red-500 hover:text-red-400 hover:bg-red-500/10"
                    onClick={() => removeCard(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={showInventory} onOpenChange={setShowInventory}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>从库存选择卡牌</DialogTitle>
            <DialogDescription>选择要添加到卡组的卡牌</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="搜索卡牌..." 
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : filteredInventory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                库存中暂无卡牌
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {filteredInventory.map((item) => (
                  <div 
                    key={item._id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                        <span className="text-lg">🎴</span>
                      </div>
                      <div>
                        <p className="font-medium">{item.itemName}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.rarity} · {item.itemType} · 库存: {item.quantity}
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => addCardFromInventory(item)}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      添加
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowInventory(false)}>
              关闭
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}