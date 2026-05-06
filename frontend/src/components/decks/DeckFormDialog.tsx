import { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { deckService, Deck } from '@/services/api';
import { inventoryService, InventoryItem } from '@/services/inventory';
import { toast } from 'sonner';
import { DeckCardsEditor, DeckCard, DeckSlot } from './DeckCardsEditor';

const GAME_TYPES = [
  { id: 'rune', name: '符文战场' },
  { id: 'shadowverse-evolve', name: '影之诗进化对决' },
];

interface DeckFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deck?: Deck | null;
  mode?: 'building' | 'collection'; // building: 构筑，collection: 卡组
}

// 转换旧数据格式
const convertOldDeck = (deck?: Deck | null) => {
  if (!deck) return null;
  
  // 如果已有新格式数据，直接返回
  if (deck.mainDeck || deck.sideDeck || deck.battlefield || deck.runes || deck.tokens) {
    return deck;
  }
  
  // 兼容旧数据
  const legend: DeckCard[] = [];
  const mainDeck: DeckCard[] = [];
  const sideDeck: DeckCard[] = [];
  
  deck.cards?.forEach(card => {
    // 这里需要通过 inventory 来判断是否是传奇，但我们暂时无法获取
    // 所以默认放到主卡组
    if (card.sideboard) {
      sideDeck.push({ ...card, slot: 'sideDeck' });
    } else {
      mainDeck.push({ ...card, slot: 'mainDeck' });
    }
  });
  
  return {
    ...deck,
    legend,
    mainDeck,
    sideDeck,
    battlefield: [],
    runes: [],
    tokens: []
  };
};

export function DeckFormDialog({ open, onOpenChange, deck, mode = 'building' }: DeckFormDialogProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: '',
    game: '',
    format: '',
    description: '',
    isPublic: false,
  });
  const [legend, setLegend] = useState<DeckCard[]>([]);
  const [mainDeck, setMainDeck] = useState<DeckCard[]>([]);
  const [sideDeck, setSideDeck] = useState<DeckCard[]>([]);
  const [battlefield, setBattlefield] = useState<DeckCard[]>([]);
  const [runes, setRunes] = useState<DeckCard[]>([]);
  const [tokens, setTokens] = useState<DeckCard[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  
  // 获取个人库存，用于验证和扣除
  const { data: inventoryData } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => inventoryService.getAll({ limit: 2000 }),
    enabled: open && mode === 'building',
  });
  
  const inventory: InventoryItem[] = inventoryData?.data || [];
  
  // 计算新旧卡组的卡牌差异（用于编辑时）
  const calculateCardDiff = (oldDeck: Deck | null, newCards: DeckCard[]) => {
    if (!oldDeck) {
      // 新创建，直接返回所有新卡牌
      return { added: newCards, removed: [] };
    }
    
    const oldCards = [
      ...(oldDeck.legend || []),
      ...(oldDeck.mainDeck || []),
      ...(oldDeck.sideDeck || []),
      ...(oldDeck.battlefield || []),
      ...(oldDeck.runes || []),
      ...(oldDeck.tokens || []),
    ];
    
    const oldCardMap = new Map<string, number>();
    const newCardMap = new Map<string, number>();
    
    oldCards.forEach(card => {
      oldCardMap.set(card.card, (oldCardMap.get(card.card) || 0) + card.quantity);
    });
    
    newCards.forEach(card => {
      newCardMap.set(card.card, (newCardMap.get(card.card) || 0) + card.quantity);
    });
    
    const added: DeckCard[] = [];
    const removed: DeckCard[] = [];
    
    // 计算新增
    newCardMap.forEach((quantity, cardId) => {
      const oldQuantity = oldCardMap.get(cardId) || 0;
      if (quantity > oldQuantity) {
        added.push({ card: cardId, quantity: quantity - oldQuantity, slot: 'mainDeck' });
      } else if (quantity < oldQuantity) {
        removed.push({ card: cardId, quantity: oldQuantity - quantity, slot: 'mainDeck' });
      }
    });
    
    // 计算移除
    oldCardMap.forEach((quantity, cardId) => {
      if (!newCardMap.has(cardId)) {
        removed.push({ card: cardId, quantity, slot: 'mainDeck' });
      }
    });
    
    return { added, removed };
  };

  const resetForm = () => {
    setFormData({
      name: '',
      game: '',
      format: '',
      description: '',
      isPublic: false,
    });
    setLegend([]);
    setMainDeck([]);
    setSideDeck([]);
    setBattlefield([]);
    setRunes([]);
    setTokens([]);
  };

  // 初始化表单
  useEffect(() => {
    if (deck) {
      const convertedDeck = convertOldDeck(deck);
      if (!convertedDeck) {
        resetForm();
        return;
      }
      setFormData({
        name: convertedDeck.name || '',
        game: convertedDeck.game || '',
        format: convertedDeck.format || '',
        description: convertedDeck.description || '',
        isPublic: convertedDeck.isPublic || false,
      });
      setLegend((convertedDeck.legend || []).map(card => ({ ...card, slot: (card.slot as DeckSlot) || 'legend' })));
      setMainDeck((convertedDeck.mainDeck || []).map(card => ({ ...card, slot: (card.slot as DeckSlot) || 'mainDeck' })));
      setSideDeck((convertedDeck.sideDeck || []).map(card => ({ ...card, slot: (card.slot as DeckSlot) || 'sideDeck' })));
      setBattlefield((convertedDeck.battlefield || []).map(card => ({ ...card, slot: (card.slot as DeckSlot) || 'battlefield' })));
      setRunes((convertedDeck.runes || []).map(card => ({ ...card, slot: (card.slot as DeckSlot) || 'runes' })));
      setTokens((convertedDeck.tokens || []).map(card => ({ ...card, slot: (card.slot as DeckSlot) || 'tokens' })));
    } else {
      setFormData({
        name: '',
        game: '',
        format: '',
        description: '',
        isPublic: false,
      });
      setLegend([]);
      setMainDeck([]);
      setSideDeck([]);
      setBattlefield([]);
      setRunes([]);
      setTokens([]);
    }
  }, [deck, open]);

  const createMutation = useMutation({
    mutationFn: (data: Partial<Deck>) => deckService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['decks'] });
      queryClient.invalidateQueries({ queryKey: ['decks', 'building'] });
      toast.success('卡组创建成功');
      onOpenChange(false);
    },
    onError: (error: any) => {
      const errorMsg = error.response?.data?.message || error.response?.data?.errors?.[0]?.msg || '创建失败';
      toast.error(errorMsg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Deck> }) =>
      deckService.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['decks'] });
      queryClient.invalidateQueries({ queryKey: ['decks', 'building'] });
      queryClient.invalidateQueries({ queryKey: ['deck', variables.id] });
      toast.success('卡组更新成功');
      onOpenChange(false);
    },
    onError: (error: any) => {
      const errorMsg = error.response?.data?.message || error.response?.data?.errors?.[0]?.msg || '更新失败';
      toast.error(errorMsg);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 游戏类型验证
    if (!formData.game) {
      toast.error('请选择游戏类型');
      return;
    }
    
    setIsSaving(true);
    
    const allCards = [...legend, ...mainDeck, ...sideDeck, ...battlefield, ...runes, ...tokens];
    
    // 构筑模式下验证库存
    if (mode === 'building') {
      const { added, removed } = calculateCardDiff(deck, allCards);
      
      console.log('=== 创建构筑调试信息 ===');
      console.log('添加的卡牌:', added);
      console.log('当前库存:', inventory.map(i => ({ _id: i._id, itemName: i.itemName, userQuantity: i.userQuantity, userInventoryId: i.userInventoryId })));
      
      // 验证新增的卡牌库存是否足够
      for (const card of added) {
        const inventoryItem = inventory.find(item => String(item._id) === String(card.card) || String(item.id) === String(card.card));
        console.log('查找卡牌:', card.card, '找到:', inventoryItem);
        
        if (!inventoryItem) {
          toast.error(`找不到卡牌 ${card.card}`);
          setIsSaving(false);
          return;
        }
        const available = inventoryItem.userQuantity ?? inventoryItem.quantity ?? 0;
        if (available < card.quantity) {
          toast.error(`卡牌 ${inventoryItem.itemName} 库存不足！需要 ${card.quantity}，可用 ${available}`);
          setIsSaving(false);
          return;
        }
      }
      
      // 提交数据
      const submitData: Partial<Deck> = {
        ...formData,
        isPublic: false,
        type: 'building',
        legend,
        mainDeck,
        sideDeck,
        battlefield,
        runes,
        tokens
      };
      
      try {
        // 先保存构筑
        let result;
        if (deck?._id) {
          result = await deckService.update(deck._id, submitData);
        } else {
          result = await deckService.create(submitData);
        }
        
        // 库存处理：扣除新增的，返还移除的
        const inventoryUpdates: Promise<any>[] = [];
        
        // 扣除新增的卡牌
        for (const card of added) {
          const inventoryItem = inventory.find(item => String(item._id) === String(card.card) || String(item.id) === String(card.card));
          console.log('处理新增卡牌:', card.card, inventoryItem);
          
          if (inventoryItem) {
            // 使用 inventoryItem._id 来更新，不管 userInventoryId 是否存在
            const currentQuantity = inventoryItem.userQuantity ?? inventoryItem.quantity ?? 0;
            inventoryUpdates.push(
              inventoryService.updateUserInventory(String(inventoryItem._id), {
                quantity: currentQuantity - card.quantity
              })
            );
          }
        }
        
        // 返还移除的卡牌
        for (const card of removed) {
          const inventoryItem = inventory.find(item => String(item._id) === String(card.card) || String(item.id) === String(card.card));
          console.log('处理移除卡牌:', card.card, inventoryItem);
          
          if (inventoryItem) {
            const currentQuantity = inventoryItem.userQuantity ?? inventoryItem.quantity ?? 0;
            inventoryUpdates.push(
              inventoryService.updateUserInventory(String(inventoryItem._id), {
                quantity: currentQuantity + card.quantity
              })
            );
          }
        }
        
        // 执行库存更新
        await Promise.all(inventoryUpdates);
        
        // 刷新数据
        queryClient.invalidateQueries({ queryKey: ['decks'] });
        queryClient.invalidateQueries({ queryKey: ['decks', 'building'] });
        queryClient.invalidateQueries({ queryKey: ['inventory'] });
        if (deck?._id) {
          queryClient.invalidateQueries({ queryKey: ['deck', deck._id] });
        }
        
        toast.success('构筑创建成功，已同步到卡组管理并扣除库存');
        onOpenChange(false);
      } catch (error: any) {
        const errorMsg = error.response?.data?.message || error.response?.data?.errors?.[0]?.msg || '保存失败';
        toast.error(errorMsg);
      } finally {
        setIsSaving(false);
      }
    } else {
      // 卡组管理模式，正常保存
      const submitData: Partial<Deck> = {
        ...formData,
        isPublic: formData.isPublic,
        type: 'deck',
        legend,
        mainDeck,
        sideDeck,
        battlefield,
        runes,
        tokens
      };
      
      try {
        if (deck?._id) {
          await deckService.update(deck._id, submitData);
          queryClient.invalidateQueries({ queryKey: ['decks'] });
          queryClient.invalidateQueries({ queryKey: ['deck', deck._id] });
        } else {
          await deckService.create(submitData);
          queryClient.invalidateQueries({ queryKey: ['decks'] });
        }
        toast.success('卡组保存成功');
        onOpenChange(false);
      } catch (error: any) {
        const errorMsg = error.response?.data?.message || error.response?.data?.errors?.[0]?.msg || '保存失败';
        toast.error(errorMsg);
      } finally {
        setIsSaving(false);
      }
    }
  };



  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{deck ? (mode === 'building' ? '编辑构筑' : '编辑卡组') : (mode === 'building' ? '新建构筑' : '创建卡组')}</DialogTitle>
            <DialogDescription>
              {deck ? '修改信息' : (mode === 'building' ? '使用个人库存创建新的构筑' : '使用全部库存模板创建新的卡组')}
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
                  <Select value={formData.game} onValueChange={(value) => setFormData({ ...formData, game: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择游戏" />
                    </SelectTrigger>
                    <SelectContent>
                      {GAME_TYPES.map((game) => (
                        <SelectItem key={game.id} value={game.id}>{game.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="format">定位</Label>
                  <Select value={formData.format} onValueChange={(value) => setFormData({ ...formData, format: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择定位" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="casual">休闲</SelectItem>
                      <SelectItem value="competitive">竞技</SelectItem>
                      <SelectItem value="creative">脑洞</SelectItem>
                      <SelectItem value="top-deck">上位构筑</SelectItem>
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
              {mode !== 'building' && (
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
              )}
              
              {/* 卡组编辑器 */}
              <DeckCardsEditor
                legend={legend}
                mainDeck={mainDeck}
                sideDeck={sideDeck}
                battlefield={battlefield}
                runes={runes}
                tokens={tokens}
                onLegendChange={setLegend}
                onMainDeckChange={setMainDeck}
                onSideDeckChange={setSideDeck}
                onBattlefieldChange={setBattlefield}
                onRunesChange={setRunes}
                onTokensChange={setTokens}
                selectedGameType={formData.game}
                mode={mode}
              />
            </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
              取消
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? '保存中...' : deck ? '更新' : '创建'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
