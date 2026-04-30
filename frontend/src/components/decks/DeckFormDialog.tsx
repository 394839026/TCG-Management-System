import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { deckService, Deck } from '@/services/api';
import { toast } from 'sonner';
import { DeckCardsEditor, DeckCard } from './DeckCardsEditor';

const GAME_TYPES = [
  { id: 'rune', name: '符文战场' },
  { id: 'digimon', name: '数码宝贝' },
  { id: 'pokemon', name: '宝可梦' },
  { id: 'shadowverse-evolve', name: '影之诗进化对决' },
];

interface DeckFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deck?: Deck | null;
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

export function DeckFormDialog({ open, onOpenChange, deck }: DeckFormDialogProps) {
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

  // 初始化表单
  useEffect(() => {
    if (deck) {
      const convertedDeck = convertOldDeck(deck);
      setFormData({
        name: convertedDeck.name || '',
        game: convertedDeck.game || '',
        format: convertedDeck.format || '',
        description: convertedDeck.description || '',
        isPublic: convertedDeck.isPublic || false,
      });
      setLegend(convertedDeck.legend || []);
      setMainDeck(convertedDeck.mainDeck || []);
      setSideDeck(convertedDeck.sideDeck || []);
      setBattlefield(convertedDeck.battlefield || []);
      setRunes(convertedDeck.runes || []);
      setTokens(convertedDeck.tokens || []);
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['decks'] });
      toast.success('卡组更新成功');
      onOpenChange(false);
    },
    onError: (error: any) => {
      const errorMsg = error.response?.data?.message || error.response?.data?.errors?.[0]?.msg || '更新失败';
      toast.error(errorMsg);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 游戏类型验证
    if (!formData.game) {
      toast.error('请选择游戏类型');
      return;
    }
    
    const submitData: Partial<Deck> = {
      ...formData,
      legend,
      mainDeck,
      sideDeck,
      battlefield,
      runes,
      tokens
    };
    
    console.log('提交的数据:', submitData);
    
    if (deck?._id) {
      updateMutation.mutate({ id: deck._id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
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
              />
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
  );
}
