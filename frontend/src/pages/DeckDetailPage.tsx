import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Heart, Eye, Share2, Copy, Check, ArrowLeft, BookOpen, TrendingUp, Users, Trophy, Edit3, Trash2, Crown, Sparkles, Shield, Sword, Gem, BookOpen as BookIcon, LayoutGrid, List } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { deckService, Deck } from '@/services/api';
import { toast } from 'sonner';
import { DeckFormDialog } from '@/components/decks/DeckFormDialog';
import { inventoryService, InventoryItem } from '@/services/inventory';

const GAME_TYPES: Record<string, string> = {
  'rune': '符文战场',
  'shadowverse-evolve': '影之诗进化对决',
};

const FORMAT_TYPES: Record<string, string> = {
  'casual': '休闲',
  'competitive': '竞技',
  'creative': '脑洞',
  'top-deck': '上位构筑',
};

// 符文战场插槽配置
const RUNE_SLOT_CONFIG = {
  legend: { name: '传奇', icon: Crown, color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  mainDeck: { name: '主卡组', icon: Sparkles, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  sideDeck: { name: '备用卡组', icon: Shield, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  battlefield: { name: '战场', icon: Sword, color: 'text-red-600', bgColor: 'bg-red-100' },
  runes: { name: '符文', icon: Gem, color: 'text-green-600', bgColor: 'bg-green-100' },
  tokens: { name: '指示物', icon: BookIcon, color: 'text-orange-600', bgColor: 'bg-orange-100' },
};

// 稀有度中文映射
const RARITY_MAP: Record<string, string> = {
  'N': '普通',
  'N_FOIL': '普通（闪）',
  'U': '不凡',
  'U_FOIL': '不凡（闪）',
  'R': '稀有',
  'E': '史诗',
  'AA': '异画',
  'AA_SIGN': '异画（签字）',
  'AA_ULTIMATE': '异画（终极超编）',
  'common': '普通',
  'uncommon': '不凡',
  'rare': '稀有',
  'super_rare': '超级稀有',
  'ultra_rare': '极稀有',
  'secret_rare': '秘稀有',
};

// 卡牌属性颜色映射
const CARD_PROPERTY_COLORS: Record<string, string> = {
  '专属': '#8B5CF6', // 紫色
  '法术': '#EC4899', // 粉色
  '单位': '#3B82F6', // 蓝色
  '英雄': '#F59E0B', // 橙色
  '装备': '#10B981', // 绿色
  '其他': '#6B7280', // 灰色
};

// 饼图组件
const DeckPieChart = ({ data, title }: { data: { name: string; value: number; color: string }[], title: string }) => {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  
  if (total === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>暂无数据</p>
      </div>
    );
  }
  
  return (
    <div className="w-full">
      <h4 className="text-sm font-semibold mb-3 text-center">{title}</h4>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={80}
            paddingAngle={3}
            dataKey="value"
            label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
            labelLine={{ strokeWidth: 1.5 }}
            labelStyle={{ fontSize: 11, fontWeight: 500 }}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number, name: string) => [`${value}张 (${((value / total) * 100).toFixed(1)}%)`, name]}
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '8px 12px',
            }}
          />
          <Legend 
            layout="vertical"
            align="right"
            verticalAlign="middle"
            iconType="circle"
            iconSize={12}
            textStyle={{ fontSize: 12 }}
            wrapperStyle={{ paddingLeft: '10px' }}
          />
        </PieChart>
      </ResponsiveContainer>
      {/* 数据标签 */}
      <div className="mt-3 text-center">
        <span className="text-xs text-muted-foreground">
          共 {total} 张
        </span>
      </div>
    </div>
  );
};

export function DeckDetailPage() {
 const { id } = useParams<{ id: string }>();
 const navigate = useNavigate();
 const [copied, setCopied] = useState(false);
const [formOpen, setFormOpen] = useState(false);
const [editingDeck, setEditingDeck] = useState<Deck | null>(null);
const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
 const queryClient = useQueryClient();
 
 const { data: deckData, isLoading, error } = useQuery({
 queryKey: ['deck', id],
 queryFn: () => deckService.getById(id!),
 });
 
 const { data: inventoryData } = useQuery({
 queryKey: ['inventory'],
 queryFn: () => inventoryService.getAll({ limit: 2000 }),
 });
 
 const inventory: InventoryItem[] = inventoryData?.data || [];
 
 const getCardInfo = (cardId: string) => {
 return inventory.find(i => String(i._id) === cardId);
 };
 
 const deck: Deck = deckData?.data || {} as Deck;
 
 // 计算卡组类型分布数据
 const mainDeckTypeData = useMemo(() => {
 const typeCounts: Record<string, number> = {};
 const mainDeck = (deck as any).mainDeck || [];
 
 mainDeck.forEach((cardItem: any) => {
 const cardInfo = getCardInfo(cardItem.card);
 const property = cardInfo?.cardProperty || '其他';
 typeCounts[property] = (typeCounts[property] || 0) + cardItem.quantity;
 });
 
 return Object.entries(typeCounts).map(([name, value]) => ({
 name,
 value,
 color: CARD_PROPERTY_COLORS[name] || CARD_PROPERTY_COLORS['其他'],
 }));
 }, [deck, inventory]);
 
 const sideDeckTypeData = useMemo(() => {
 const typeCounts: Record<string, number> = {};
 const sideDeck = (deck as any).sideDeck || [];
 
 sideDeck.forEach((cardItem: any) => {
 const cardInfo = getCardInfo(cardItem.card);
 const property = cardInfo?.cardProperty || '其他';
 typeCounts[property] = (typeCounts[property] || 0) + cardItem.quantity;
 });
 
 return Object.entries(typeCounts).map(([name, value]) => ({
 name,
 value,
 color: CARD_PROPERTY_COLORS[name] || CARD_PROPERTY_COLORS['其他'],
 }));
 }, [deck, inventory]);
 
 const likeMutation = useMutation({
 mutationFn: () => deckService.like(id!),
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['deck', id] });
 toast.success('点赞成功');
 },
 });
 const deleteMutation = useMutation({
 mutationFn: () => deckService.delete(id!),
 onSuccess: () => {
 toast.success('卡组已删除');
 navigate('/decks');
 },
 onError: (error: any) => {
 const errorMsg = error.response?.data?.message || '删除失败';
 toast.error(errorMsg);
 },
 });
 const updatePublicMutation = useMutation({
 mutationFn: (isPublic: boolean) => deckService.update(id!, { isPublic }),
 onSuccess: (_, isPublic) => {
 queryClient.invalidateQueries({ queryKey: ['deck', id] });
 toast.success(isPublic ? '卡组已设为公开' : '卡组已设为私有');
 },
 onError: () => {
 toast.error('更新失败');
 },
 });
 const isLiked = deck.likes?.includes('current-user-id') || false;
 const handleCopyDeck = () => {
 const deckText = `${deck.name} (${GAME_TYPES[deck.game] || deck.game} - ${deck.format ? FORMAT_TYPES[deck.format] || deck.format : '无定位'})\n\n卡牌列表:\n${deck.cards?.map((c: any) => `${c.quantity}x ${typeof c.card === 'string' ? c.card : '未知卡牌'}`).join('\n') || '暂无卡牌'}`;
 navigator.clipboard.writeText(deckText);
 setCopied(true);
 setTimeout(() => setCopied(false), 2000);
 toast.success('卡组已复制到剪贴板');
 };
 if (isLoading) {
 return (<div className="flex items-center justify-center min-h-[600px]">
 <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"/>
 </div>);
 }
 if (error || !deck._id) {
 return (<div className="flex flex-col items-center justify-center min-h-[600px]">
 <BookOpen className="w-16 h-16 text-muted-foreground mb-4"/>
 <p className="text-muted-foreground">卡组不存在或已被删除</p>
 <Button onClick={() => navigate('/decks')} className="mt-4">
 <ArrowLeft className="w-4 h-4 mr-2"/>
 返回卡组列表
 </Button>
 </div>);
 }
 const cardTypes = deck.cards?.reduce((acc: Record<string, number>, card: any) => {
 const type = typeof card.card === 'string' ? '卡牌' : '其他';
 acc[type] = (acc[type] || 0) + card.quantity;
 return acc;
 }, {});
 const totalCards = deck.cards?.reduce((sum: number, card: any) => sum + card.quantity, 0) || 0;
 return (<>
 <div className="space-y-6">
 <Button variant="outline" onClick={() => navigate('/decks')}>
 <ArrowLeft className="w-4 h-4 mr-2"/>
 返回卡组列表
 </Button>

 <div className="grid gap-6 lg:grid-cols-3">
 <Card className="lg:col-span-2">
 <CardHeader className="pb-4">
 <div className="flex items-start justify-between">
 <div>
 <div className="flex items-center gap-2 mb-2">
 <Badge variant={deck.isPublic ? 'success' : 'secondary'}>
 {deck.isPublic ? '公开' : '私有'}
 </Badge>
 <Badge variant="outline">{GAME_TYPES[deck.game] || deck.game}</Badge>
 {deck.format && <Badge variant="outline">{FORMAT_TYPES[deck.format] || deck.format}</Badge>}
 </div>
 <CardTitle className="text-2xl">{deck.name}</CardTitle>
 <CardDescription>{deck.description || '暂无描述'}</CardDescription>
 </div>
 <div className="flex items-center gap-3">
 <button className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${isLiked ? 'bg-red-50 text-red-500' : 'bg-muted hover:bg-muted/80'}`} onClick={() => likeMutation.mutate()}>
 <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`}/>
 <span className="font-medium">{deck.likes?.length || 0}</span>
 </button>
 <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
 <Eye className="w-5 h-5"/>
 <span className="font-medium">0</span>
 </button>
 <Button variant="outline" onClick={handleCopyDeck}>
 {copied ? <Check className="w-4 h-4"/> : <Copy className="w-4 h-4"/>}
 {copied ? '已复制' : '复制卡组'}
 </Button>
 <Button variant="outline">
 <Share2 className="w-4 h-4"/>
 分享
 </Button>
 </div>
 </div>
 </CardHeader>

 <CardContent>
 <div className="space-y-6">
 <div>
<div className="flex items-center justify-between mb-4">
<h3 className="text-lg font-semibold">卡组构成</h3>
<div className="flex items-center gap-2 bg-muted rounded-lg p-1">
<button
className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
viewMode === 'card'
? 'bg-white shadow-sm text-primary'
: 'text-muted-foreground hover:text-foreground'
}`}
onClick={() => setViewMode('card')}
>
<LayoutGrid className="w-4 h-4 inline mr-1" />
卡片视图
</button>
<button
className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
viewMode === 'list'
? 'bg-white shadow-sm text-primary'
: 'text-muted-foreground hover:text-foreground'
}`}
onClick={() => setViewMode('list')}
>
<List className="w-4 h-4 inline mr-1" />
列表视图
</button>
</div>
</div>

{deck.game === 'rune' ? (
viewMode === 'card' ? (
// 符文战场卡片视图 - 按插槽分组
<div className="space-y-6">
{(['legend', 'mainDeck', 'sideDeck', 'battlefield', 'runes', 'tokens'] as const).map((slot) => {
const slotConfig = RUNE_SLOT_CONFIG[slot];
const cards = (deck as any)[slot] || [];
const Icon = slotConfig.icon;
const totalCount = cards.reduce((sum: number, c: any) => sum + c.quantity, 0);

if (totalCount === 0) return null;

return (
<div key={slot}>
<div className="flex items-center gap-2 mb-3">
<div className={`p-2 rounded-lg ${slotConfig.bgColor}`}>
<Icon className={`w-5 h-5 ${slotConfig.color}`} />
</div>
<h4 className="font-semibold">{slotConfig.name}</h4>
<span className="text-sm text-muted-foreground">({totalCount}张)</span>
</div>
<div className="space-y-2 pl-8">
{cards.map((cardItem: any, index: number) => {
const cardInfo = getCardInfo(cardItem.card);
const cardName = cardInfo?.itemName || `卡牌 #${cardItem.card.slice(0, 8)}`;
return (
<div key={`${cardItem.card}-${index}`} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
<span className="text-lg">🎴</span>
</div>
<div>
<p className="font-medium">{cardName}</p>
<div className="flex items-center gap-2 mt-1">
{cardInfo?.rarity && (
<span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
{RARITY_MAP[cardInfo.rarity] || cardInfo.rarity}
</span>
)}
{cardInfo?.cardProperty && (
<span className={`text-xs px-2 py-0.5 rounded-full ${
cardInfo.cardProperty === '传奇' ? 'bg-yellow-100 text-yellow-700' :
cardInfo.cardProperty === '符文' ? 'bg-green-100 text-green-700' :
cardInfo.cardProperty === '战场' ? 'bg-red-100 text-red-700' :
cardInfo.cardProperty === '指示物' ? 'bg-orange-100 text-orange-700' :
'bg-gray-100 text-gray-700'
}`}>
{cardInfo.cardProperty}
</span>
)}
</div>
</div>
</div>
<div className="flex items-center gap-3">
<span className="font-bold text-lg">{cardItem.quantity}</span>
<span className="text-sm text-muted-foreground">
{cardInfo?.value ? `¥${cardInfo.value.toFixed(0)}` : '-'}
</span>
</div>
</div>
);
})}
</div>
</div>
);
})}
</div>
) : (
// 符文战场列表视图 - 表格形式
<div className="overflow-x-auto">
<table className="w-full text-sm">
<thead>
<tr className="border-b border-muted">
<th className="text-left py-3 px-4 font-semibold">卡牌名称</th>
<th className="text-left py-3 px-4 font-semibold">稀有度</th>
<th className="text-left py-3 px-4 font-semibold">属性</th>
<th className="text-left py-3 px-4 font-semibold">插槽</th>
<th className="text-right py-3 px-4 font-semibold">数量</th>
<th className="text-right py-3 px-4 font-semibold">价格</th>
</tr>
</thead>
<tbody>
{(['legend', 'mainDeck', 'sideDeck', 'battlefield', 'runes', 'tokens'] as const).flatMap((slot) => {
const cards = (deck as any)[slot] || [];
return cards.map((cardItem: any, index: number) => {
const cardInfo = getCardInfo(cardItem.card);
const cardName = cardInfo?.itemName || `卡牌 #${cardItem.card.slice(0, 8)}`;
return (
<tr key={`${slot}-${cardItem.card}-${index}`} className="border-b border-muted/50 hover:bg-muted/30">
<td className="py-3 px-4 font-medium">{cardName}</td>
<td className="py-3 px-4">
{cardInfo?.rarity ? (
<span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
{RARITY_MAP[cardInfo.rarity] || cardInfo.rarity}
</span>
) : '-'}
</td>
<td className="py-3 px-4">
{cardInfo?.cardProperty ? (
<span className={`text-xs px-2 py-0.5 rounded-full ${
cardInfo.cardProperty === '传奇' ? 'bg-yellow-100 text-yellow-700' :
cardInfo.cardProperty === '符文' ? 'bg-green-100 text-green-700' :
cardInfo.cardProperty === '战场' ? 'bg-red-100 text-red-700' :
cardInfo.cardProperty === '指示物' ? 'bg-orange-100 text-orange-700' :
'bg-gray-100 text-gray-700'
}`}>
{cardInfo.cardProperty}
</span>
) : '-'}
</td>
<td className="py-3 px-4">{RUNE_SLOT_CONFIG[slot]?.name || slot}</td>
<td className="py-3 px-4 text-right font-bold">{cardItem.quantity}</td>
<td className="py-3 px-4 text-right">
{cardInfo?.value ? `¥${cardInfo.value.toFixed(0)}` : '-'}
</td>
</tr>
);
});
})}
</tbody>
</table>
</div>
)
) : (
 // 其他游戏显示旧格式
 deck.cards && deck.cards.length > 0 ? (
 <div className="space-y-2">
 {deck.cards.map((card: any, index: number) => {
 const cardInfo = typeof card.card === 'string' ? getCardInfo(card.card) : card.card;
 const cardName = cardInfo?.itemName || (typeof card.card === 'string' ? `卡牌 #${card.card.slice(0, 8)}` : '未知卡牌');
 return (
 <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
 <span className="text-lg">🎴</span>
 </div>
 <div>
 <p className="font-medium">{cardName}</p>
 <p className="text-sm text-muted-foreground">数量: {card.quantity}</p>
 </div>
 </div>
 <span className="text-sm text-muted-foreground">
 {cardInfo?.value ? `¥${cardInfo.value.toFixed(0)}` : '-'}
 </span>
 </div>
 );
 })}
 </div>
 ) : (
 <div className="text-center py-8 text-muted-foreground">
 卡组中暂无卡牌
 </div>
 )
 )}
 </div>

 {/* 计算符文战场卡组的统计数据 */}
 {deck.game === 'rune' ? (
 <div className="grid grid-cols-2 gap-4">
 <div className="p-4 rounded-lg bg-muted/50">
 <p className="text-sm text-muted-foreground mb-1">卡牌总数</p>
 <p className="text-2xl font-bold">{
 (deck as any).legend?.reduce((sum: number, c: any) => sum + c.quantity, 0) +
 (deck as any).mainDeck?.reduce((sum: number, c: any) => sum + c.quantity, 0) +
 (deck as any).sideDeck?.reduce((sum: number, c: any) => sum + c.quantity, 0) +
 (deck as any).battlefield?.reduce((sum: number, c: any) => sum + c.quantity, 0) +
 (deck as any).runes?.reduce((sum: number, c: any) => sum + c.quantity, 0) +
 (deck as any).tokens?.reduce((sum: number, c: any) => sum + c.quantity, 0)
 } 张</p>
 </div>
 <div className="p-4 rounded-lg bg-muted/50">
 <p className="text-sm text-muted-foreground mb-1">卡牌种类</p>
 <p className="text-2xl font-bold">{
 ((deck as any).legend?.length || 0) +
 ((deck as any).mainDeck?.length || 0) +
 ((deck as any).sideDeck?.length || 0) +
 ((deck as any).battlefield?.length || 0) +
 ((deck as any).runes?.length || 0) +
 ((deck as any).tokens?.length || 0)
 } 种</p>
 </div>
 </div>
 ) : (
 <div className="grid grid-cols-2 gap-4">
 <div className="p-4 rounded-lg bg-muted/50">
 <p className="text-sm text-muted-foreground mb-1">卡牌总数</p>
 <p className="text-2xl font-bold">{totalCards} 张</p>
 </div>
 <div className="p-4 rounded-lg bg-muted/50">
 <p className="text-sm text-muted-foreground mb-1">卡牌种类</p>
 <p className="text-2xl font-bold">{deck.cards?.length || 0} 种</p>
 </div>
 </div>
 )}
 </div>
 </CardContent>
 </Card>
 
 {/* 符文战场饼图分析 */}
 {deck.game === 'rune' && (
 <Card className="lg:col-span-2">
 <CardContent className="p-6">
 <h3 className="text-lg font-semibold mb-6 text-center">卡组类型分布</h3>
 <div className="grid grid-cols-2 gap-4">
 <div className="flex justify-center">
 <div className="w-full max-w-sm">
 <DeckPieChart data={mainDeckTypeData} title="主卡组" />
 </div>
 </div>
 <div className="flex justify-center">
 <div className="w-full max-w-sm">
 <DeckPieChart data={sideDeckTypeData} title="备用卡组" />
 </div>
 </div>
 </div>
 </CardContent>
 </Card>
 )}

 <Card>
 <CardHeader>
 <CardTitle className="text-lg">快速操作</CardTitle>
 </CardHeader>
 <CardContent className="space-y-2">
 <Button variant="outline" className="w-full" onClick={() => { setEditingDeck(deck); setFormOpen(true); }}>
 <Edit3 className="w-4 h-4 mr-2"/>
 编辑卡组
 </Button>
 <div className="flex items-center justify-between py-2">
 <div className="flex items-center gap-2">
 <Users className="w-4 h-4 text-muted-foreground" />
 <span>公开状态</span>
 </div>
 <Switch
 checked={deck.isPublic || false}
 onCheckedChange={(checked) => updatePublicMutation.mutate(checked)}
 disabled={updatePublicMutation.isPending}
 />
 </div>
 <Button variant="outline" className="w-full" onClick={handleCopyDeck}>
 <Copy className="w-4 h-4 mr-2"/>
 复制卡组
 </Button>
 <Button variant="destructive" className="w-full" onClick={() => setDeleteDialogOpen(true)}>
 <Trash2 className="w-4 h-4 mr-2"/>
 删除卡组
 </Button>
 <Button variant="outline" className="w-full">报告问题</Button>
 </CardContent>
 </Card>
 </div>
 </div>

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
 onClick={() => setDeleteDialogOpen(false)}
 disabled={deleteMutation.isPending}
 >
 取消
 </Button>
 <Button 
 variant="destructive" 
 onClick={() => deleteMutation.mutate()}
 disabled={deleteMutation.isPending}
 >
 {deleteMutation.isPending ? '删除中...' : '删除'}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </>);
}

