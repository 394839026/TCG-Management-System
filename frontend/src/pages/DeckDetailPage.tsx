import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, Eye, Share2, Copy, Check, ArrowLeft, BookOpen, TrendingUp, Users, Trophy } from 'lucide-react';
import { deckService, Deck } from '@/services/api';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
export function DeckDetailPage() {
 const { id } = useParams<{ id: string }>();
 const navigate = useNavigate();
 const [copied, setCopied] = useState(false);
 const queryClient = useQueryClient();
 const { data: deckData, isLoading, error } = useQuery({
 queryKey: ['deck', id],
 queryFn: () => deckService.getById(id!),
 });
 const likeMutation = useMutation({
 mutationFn: () => deckService.like(id!),
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['deck', id] });
 toast.success('点赞成功');
 },
 });
 const deck: Deck = deckData?.data || {} as Deck;
 const isLiked = deck.likes?.includes('current-user-id') || false;
 const handleCopyDeck = () => {
 const deckText = `${deck.name} (${deck.game} - ${deck.format || '无格式'})\n\n卡牌列表:\n${deck.cards?.map((c: any) => `${c.quantity}x ${typeof c.card === 'string' ? c.card : '未知卡牌'}`).join('\n') || '暂无卡牌'}`;
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
 return (<div className="space-y-6">
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
 <Badge variant="outline">{deck.game}</Badge>
 {deck.format && <Badge variant="outline">{deck.format}</Badge>}
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
 <h3 className="text-lg font-semibold mb-4">卡组构成</h3>
 {deck.cards && deck.cards.length > 0 ? (<div className="space-y-2">
 {deck.cards.map((card: any, index: number) => (<div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
 <span className="text-lg">🎴</span>
 </div>
 <div>
 <p className="font-medium">
 {typeof card.card === 'string' ? `卡牌 #${card.card.slice(0, 8)}` : '未知卡牌'}
 </p>
 <p className="text-sm text-muted-foreground">数量: {card.quantity}</p>
 </div>
 </div>
 <span className="text-sm text-muted-foreground">
 ¥{(Math.floor(Math.random() * 100) + 10).toFixed(0)}
 </span>
 </div>))}
 </div>) : (<div className="text-center py-8 text-muted-foreground">
 卡组中暂无卡牌
 </div>)}
 </div>

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
 </div>
 </CardContent>
 </Card>

 <div className="space-y-6">
 <Card>
 <CardHeader>
 <CardTitle className="text-lg">卡组分析</CardTitle>
 </CardHeader>
 <CardContent className="space-y-4">
 <div>
 <p className="text-sm text-muted-foreground mb-2">卡牌类型分布</p>
 <div className="space-y-2">
 {Object.entries(cardTypes).map(([type, count]) => (<div key={type}>
 <div className="flex items-center justify-between mb-1">
 <span className="text-sm">{type}</span>
 <span className="text-sm font-medium">{count}</span>
 </div>
 <div className="h-2 bg-muted rounded-full overflow-hidden">
 <div className="h-full bg-primary rounded-full" style={{ width: `${(count / totalCards) * 100}%` }}/>
 </div>
 </div>))}
 </div>
 </div>
 </CardContent>
 </Card>

 <Card>
 <CardHeader>
 <CardTitle className="text-lg">卡组数据</CardTitle>
 </CardHeader>
 <CardContent className="space-y-4">
 <div className="flex items-center gap-3">
 <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
 <TrendingUp className="w-6 h-6 text-green-500"/>
 </div>
 <div>
 <p className="text-sm text-muted-foreground">胜率</p>
 <p className="text-xl font-bold">{deck.stats?.winRate || '--'}%</p>
 </div>
 </div>
 <div className="flex items-center gap-3">
 <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
 <Trophy className="w-6 h-6 text-blue-500"/>
 </div>
 <div>
 <p className="text-sm text-muted-foreground">对战次数</p>
 <p className="text-xl font-bold">{deck.stats?.matches || 0} 场</p>
 </div>
 </div>
 <div className="flex items-center gap-3">
 <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
 <Users className="w-6 h-6 text-purple-500"/>
 </div>
 <div>
 <p className="text-sm text-muted-foreground">收藏人数</p>
 <p className="text-xl font-bold">{deck.likes?.length || 0} 人</p>
 </div>
 </div>
 </CardContent>
 </Card>

 <Card>
 <CardHeader>
 <CardTitle className="text-lg">快速操作</CardTitle>
 </CardHeader>
 <CardContent className="space-y-2">
 <Button variant="outline" className="w-full">编辑卡组</Button>
 <Button variant="outline" className="w-full">复制卡组</Button>
 <Button variant="outline" className="w-full">报告问题</Button>
 </CardContent>
 </Card>
 </div>
 </div>
 </div>);
}

