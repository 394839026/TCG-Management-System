import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Sparkles, Gift, History, Coins, Zap, Star, Crown, Gem, Award, Shuffle, X, RefreshCw, Package, Layers, Check, PartyPopper } from 'lucide-react';
import { cn } from '@/lib/utils';
import { inventoryService, InventoryItem } from '@/services/inventory';

interface GachaCard {
  id: string;
  name: string;
  rarity: string;
  type: string;
  description: string;
  gameType: string;
  version?: string;
  images?: string[];
}

const GAME_VERSIONS: Record<string, { id: string; name: string }[]> = {
  rune: [
    { id: 'OGN', name: '起源' },
    { id: 'SFD', name: '铸魂试炼' },
    { id: 'UNL', name: '破限' },
  ],
};

const RARITY_CONFIG: Record<string, { name: string; color: string; bgColor: string; borderColor: string; probability: number; glowColor: string }> = {
  N: { name: '普通', color: 'text-gray-600', bgColor: 'bg-gray-100', borderColor: 'border-gray-300', probability: 0.5, glowColor: '' },
  N_FOIL: { name: '普通（闪）', color: 'text-gray-600', bgColor: 'bg-gray-100', borderColor: 'border-gray-300', probability: 0.05, glowColor: 'shadow-gray-400/50' },
  U: { name: '不凡', color: 'text-blue-600', bgColor: 'bg-blue-100', borderColor: 'border-blue-400', probability: 0.25, glowColor: '' },
  U_FOIL: { name: '不凡（闪）', color: 'text-blue-600', bgColor: 'bg-blue-100', borderColor: 'border-blue-400', probability: 0.03, glowColor: 'shadow-blue-400/50' },
  R: { name: '稀有', color: 'text-purple-600', bgColor: 'bg-purple-100', borderColor: 'border-purple-400', probability: 0.1, glowColor: 'shadow-purple-400/30' },
  E: { name: '史诗', color: 'text-yellow-600', bgColor: 'bg-yellow-100', borderColor: 'border-yellow-400', probability: 0.05, glowColor: 'shadow-yellow-400/40' },
  AA: { name: '异画', color: 'text-red-600', bgColor: 'bg-red-100', borderColor: 'border-red-400', probability: 0.015, glowColor: 'shadow-red-400/50' },
  AA_SIGN: { name: '异画（签字）', color: 'text-red-600', bgColor: 'bg-red-100', borderColor: 'border-red-400', probability: 0.003, glowColor: 'shadow-red-500/60' },
  AA_ULTIMATE: { name: '异画（终极超编）', color: 'text-red-600', bgColor: 'bg-red-100', borderColor: 'border-red-400', probability: 0.002, glowColor: 'shadow-red-500/70' },
  common: { name: '普通', color: 'text-gray-600', bgColor: 'bg-gray-100', borderColor: 'border-gray-300', probability: 0.5, glowColor: '' },
  uncommon: { name: '不凡', color: 'text-blue-600', bgColor: 'bg-blue-100', borderColor: 'border-blue-400', probability: 0.3, glowColor: '' },
  rare: { name: '稀有', color: 'text-purple-600', bgColor: 'bg-purple-100', borderColor: 'border-purple-400', probability: 0.15, glowColor: 'shadow-purple-400/30' },
  super_rare: { name: '超稀有', color: 'text-yellow-600', bgColor: 'bg-yellow-100', borderColor: 'border-yellow-400', probability: 0.035, glowColor: 'shadow-yellow-400/40' },
  ultra_rare: { name: '极稀有', color: 'text-orange-600', bgColor: 'bg-orange-100', borderColor: 'border-orange-400', probability: 0.01, glowColor: 'shadow-orange-400/50' },
  secret_rare: { name: '秘密稀有', color: 'text-pink-600', bgColor: 'bg-pink-100', borderColor: 'border-pink-400', probability: 0.005, glowColor: 'shadow-pink-400/60' },
};

const PACK_CONFIG = [
  { id: 'standard', name: '标准补充包', price: 100, cards: 5, color: 'from-blue-500 to-purple-500' },
  { id: 'premium', name: '进阶补充包', price: 250, cards: 15, color: 'from-purple-500 to-pink-500' },
];

const RARITY_GROUPS = {
  NORMAL: ['N', 'common'],
  NON_FOIL: ['U', 'uncommon', 'R', 'rare', 'E', 'super_rare', 'ultra_rare', 'secret_rare', 'AA', 'AA_SIGN', 'AA_ULTIMATE'],
  RARE_AND_ABOVE: ['R', 'rare', 'E', 'super_rare', 'ultra_rare', 'secret_rare', 'AA', 'AA_SIGN', 'AA_ULTIMATE'],
};

const getRarityConfig = (rarity: string) => {
  return RARITY_CONFIG[rarity] || { name: rarity, color: 'text-gray-600', bgColor: 'bg-gray-100', borderColor: 'border-gray-300', probability: 0.1, glowColor: '' };
};

interface DrawResult {
  card: GachaCard;
  isNew: boolean;
  packIndex: number;
}

export function GachaPage() {
  const [selectedGame, setSelectedGame] = useState('rune');
  const [selectedVersion, setSelectedVersion] = useState<string>('');
  const [isMixedPool, setIsMixedPool] = useState(false);
  const [coins, setCoins] = useState(() => {
    return parseInt(localStorage.getItem('gacha_coins') || '1000', 10);
  });
  const [isOpening, setIsOpening] = useState(false);
  const [currentDraws, setCurrentDraws] = useState<DrawResult[]>([]);
  const [drawHistory, setDrawHistory] = useState<DrawResult[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [animationStep, setAnimationStep] = useState(0);
  const [ownedCards, setOwnedCards] = useState<Set<string>>(new Set());
  const [selectedPack, setSelectedPack] = useState<string>('');
  const [openResultDialog, setOpenResultDialog] = useState(false);
  const [historyViewMode, setHistoryViewMode] = useState<'grid' | 'list'>('grid');

  const currentGameVersions = GAME_VERSIONS[selectedGame] || [];

  const updateCoins = (updater: (prev: number) => number) => {
    setCoins(prev => {
      const newValue = updater(prev);
      localStorage.setItem('gacha_coins', String(newValue));
      return newValue;
    });
  };

  const { data: inventoryData, isLoading, refetch } = useQuery({
    queryKey: ['gacha-cards', selectedGame, selectedVersion, isMixedPool],
    queryFn: async () => {
      const params: { gameType: string; version?: string; limit?: number } = {
        gameType: selectedGame,
        limit: 9999,
      };
      if (!isMixedPool && selectedVersion) {
        params.version = selectedVersion;
      }
      console.log('[DEBUG Gacha] Request params:', params);
      const result = await inventoryService.getAll(params);
      console.log('[DEBUG Gacha] Response:', { total: result.total, dataLength: result.data?.length || 0, fullResponse: result });
      return result;
    },
    refetchOnWindowFocus: true,
    refetchInterval: false,
    staleTime: 0,
  });

  useEffect(() => {
    setSelectedVersion('');
    setIsMixedPool(false);
  }, [selectedGame]);

  const cardPool: GachaCard[] = useCallback(() => {
    if (!inventoryData?.data) return [];
    return inventoryData.data.map((item: InventoryItem) => ({
      id: String(item._id),
      name: item.itemName,
      rarity: item.rarity || 'N',
      type: item.cardProperty || item.itemType,
      description: item.description || '暂无描述',
      gameType: item.gameType || '',
      version: item.runeCardInfo?.version || item.version,
      images: item.images,
    }));
  }, [inventoryData]);

  useEffect(() => {
    const lastCheckIn = localStorage.getItem('gacha_last_check_in');
    const today = new Date().toDateString();
    if (lastCheckIn !== today) {
      updateCoins(prev => Math.min(prev + 1000, 10000));
      localStorage.setItem('gacha_last_check_in', today);
    }
  }, []);

  const selectVersion = (versionId: string) => {
    if (isMixedPool) return;
    setSelectedVersion(versionId);
  };

  const getCardsByRarityGroup = (pool: GachaCard[], rarityGroup: string[]): GachaCard[] => {
    return pool.filter(card => rarityGroup.includes(card.rarity));
  };

  const drawCardByRarityGroup = useCallback((rarityGroup: string[], excludeIds: Set<string> = new Set()): GachaCard => {
    const pool = cardPool().filter(card => !excludeIds.has(card.id));
    const filteredPool = getCardsByRarityGroup(pool, rarityGroup);
    
    if (filteredPool.length === 0) {
      const fallbackPool = pool.length > 0 ? pool : [{
        id: 'default',
        name: '神秘卡牌',
        rarity: 'N',
        type: '未知',
        description: '卡池为空',
        gameType: selectedGame,
      }];
      return fallbackPool[Math.floor(Math.random() * fallbackPool.length)];
    }
    
    return filteredPool[Math.floor(Math.random() * filteredPool.length)];
  }, [cardPool, selectedGame]);

  const drawRandomRarityCard = useCallback((excludeIds: Set<string> = new Set()): GachaCard => {
    const pool = cardPool().filter(card => !excludeIds.has(card.id));
    
    if (pool.length === 0) {
      return {
        id: 'default',
        name: '神秘卡牌',
        rarity: 'N',
        type: '未知',
        description: '卡池为空',
        gameType: selectedGame,
      };
    }

    const random = Math.random();
    let cumulative = 0;
    const sortedRarities = Object.keys(RARITY_CONFIG).sort((a, b) => {
      return RARITY_CONFIG[b].probability - RARITY_CONFIG[a].probability;
    });

    for (const rarity of sortedRarities) {
      const config = RARITY_CONFIG[rarity];
      cumulative += config.probability;
      if (random <= cumulative) {
        const cards = pool.filter(card => card.rarity === rarity);
        if (cards.length > 0) {
          return cards[Math.floor(Math.random() * cards.length)];
        }
      }
    }
    
    return pool[Math.floor(Math.random() * pool.length)];
  }, [cardPool, selectedGame]);

  const drawFoilCard = useCallback((excludeIds: Set<string> = new Set()): GachaCard => {
    const pool = cardPool().filter(card => !excludeIds.has(card.id));
    
    const foilRarities = ['N_FOIL', 'U_FOIL', 'R', 'E', 'AA', 'AA_SIGN', 'AA_ULTIMATE', 'rare', 'super_rare', 'ultra_rare', 'secret_rare'];
    const foilPool = pool.filter(card => foilRarities.includes(card.rarity));
    
    if (foilPool.length === 0) {
      const fallbackPool = pool.length > 0 ? pool : [{
        id: 'default',
        name: '神秘卡牌（闪）',
        rarity: 'N_FOIL',
        type: '未知',
        description: '卡池为空',
        gameType: selectedGame,
      }];
      return fallbackPool[Math.floor(Math.random() * fallbackPool.length)];
    }
    
    return foilPool[Math.floor(Math.random() * foilPool.length)];
  }, [cardPool, selectedGame]);

  const drawTokenRuneCard = useCallback((excludeIds: Set<string> = new Set()): GachaCard => {
    const pool = cardPool().filter(card => !excludeIds.has(card.id));
    
    const tokenRunePool = pool.filter(card => 
      card.type === '指示物' || card.type === '符文' || card.type === '指示物或符文'
    );
    
    if (tokenRunePool.length === 0) {
      return drawRandomRarityCard(excludeIds);
    }
    
    return tokenRunePool[Math.floor(Math.random() * tokenRunePool.length)];
  }, [cardPool, selectedGame, drawRandomRarityCard]);

  const drawCard = useCallback((): GachaCard => {
    const pool = cardPool();
    if (pool.length === 0) {
      return {
        id: 'default',
        name: '神秘卡牌',
        rarity: 'N',
        type: '未知',
        description: '卡池为空',
        gameType: selectedGame,
      };
    }

    const rarityGroups: Record<string, GachaCard[]> = {};
    pool.forEach(card => {
      if (!rarityGroups[card.rarity]) {
        rarityGroups[card.rarity] = [];
      }
      rarityGroups[card.rarity].push(card);
    });

    const random = Math.random();
    let cumulative = 0;
    
    const sortedRarities = Object.keys(rarityGroups).sort((a, b) => {
      const configA = getRarityConfig(a);
      const configB = getRarityConfig(b);
      return configB.probability - configA.probability;
    });

    for (const rarity of sortedRarities) {
      const config = getRarityConfig(rarity);
      cumulative += config.probability;
      if (random <= cumulative) {
        const cards = rarityGroups[rarity];
        return cards[Math.floor(Math.random() * cards.length)];
      }
    }
    
    return pool[Math.floor(Math.random() * pool.length)];
  }, [cardPool, selectedGame]);

  const canOpenPack = () => {
    if (isOpening) return false;
    if (!selectedPack) return false;
    if (!isMixedPool && !selectedVersion) return false;
    const pack = PACK_CONFIG.find(p => p.id === selectedPack);
    if (!pack || coins < pack.price) return false;
    return true;
  };

  const openPack = useCallback(() => {
    if (!canOpenPack()) return;
    
    const pack = PACK_CONFIG.find(p => p.id === selectedPack)!;
    
    setIsOpening(true);
    setShowResult(false);
    setCurrentDraws([]);
    setAnimationStep(0);
    setOpenResultDialog(false);

    const results: DrawResult[] = [];
    const drawnIds = new Set<string>();

    const addResult = (card: GachaCard) => {
      const isNew = !ownedCards.has(card.id);
      if (isNew) {
        setOwnedCards(prev => new Set([...prev, card.id]));
      }
      drawnIds.add(card.id);
      results.push({ card, isNew, packIndex: results.length });
      setCurrentDraws([...results]);
    };

    let cardIndex = 0;
    const drawWithAnimation = () => {
      const delay = 150;
      
      if (selectedPack === 'standard') {
        const standardDraws: (string | string[])[] = [
          RARITY_GROUPS.NORMAL,
          RARITY_GROUPS.NORMAL,
          RARITY_GROUPS.NON_FOIL,
          'random',
          'foil'
        ];
        
        const drawNext = () => {
          if (cardIndex < standardDraws.length) {
            const drawType = standardDraws[cardIndex];
            let card: GachaCard;
            
            if (drawType === 'random') {
              card = drawRandomRarityCard(drawnIds);
            } else if (drawType === 'foil') {
              card = drawFoilCard(drawnIds);
            } else {
              card = drawCardByRarityGroup(Array.isArray(drawType) ? drawType : [drawType], drawnIds);
            }
            
            addResult(card);
            cardIndex++;
            
            if (cardIndex < standardDraws.length) {
              setTimeout(drawNext, delay);
            } else {
              finishDrawing();
            }
          }
        };
        
        drawNext();
      } else {
        const premiumDraws: (string | string[])[] = [
          RARITY_GROUPS.NORMAL,
          RARITY_GROUPS.NORMAL,
          RARITY_GROUPS.NORMAL,
          RARITY_GROUPS.NORMAL,
          RARITY_GROUPS.NORMAL,
          RARITY_GROUPS.NORMAL,
          RARITY_GROUPS.NORMAL,
          RARITY_GROUPS.NORMAL,
          RARITY_GROUPS.NON_FOIL,
          RARITY_GROUPS.NON_FOIL,
          RARITY_GROUPS.NON_FOIL,
          RARITY_GROUPS.RARE_AND_ABOVE,
          RARITY_GROUPS.RARE_AND_ABOVE,
          'foil',
          'token_rune'
        ];
        
        const drawNext = () => {
          if (cardIndex < premiumDraws.length) {
            const drawType = premiumDraws[cardIndex];
            let card: GachaCard;
            
            if (drawType === 'random') {
              card = drawRandomRarityCard(drawnIds);
            } else if (drawType === 'foil') {
              card = drawFoilCard(drawnIds);
            } else if (drawType === 'token_rune') {
              card = drawTokenRuneCard(drawnIds);
            } else {
              card = drawCardByRarityGroup(Array.isArray(drawType) ? drawType : [drawType], drawnIds);
            }
            
            addResult(card);
            cardIndex++;
            
            if (cardIndex < premiumDraws.length) {
              setTimeout(drawNext, delay);
            } else {
              finishDrawing();
            }
          }
        };
        
        drawNext();
      }
    };

    const finishDrawing = () => {
      setDrawHistory(prev => [...results, ...prev]);
      updateCoins(prev => prev - pack.price);
      setAnimationStep(1);
      
      setTimeout(() => {
        setShowResult(true);
        setIsOpening(false);
        setTimeout(() => {
          setOpenResultDialog(true);
        }, 300);
      }, 500);
    };

    drawWithAnimation();
  }, [selectedPack, coins, isOpening, ownedCards, isMixedPool, selectedVersion, drawCardByRarityGroup, drawRandomRarityCard, drawFoilCard, drawTokenRuneCard]);

  const resetHistory = () => {
    setDrawHistory([]);
  };

  const refreshCardPool = () => {
    refetch();
  };

  const pool = cardPool();
  const selectedPackConfig = PACK_CONFIG.find(p => p.id === selectedPack);

  const rareCardsCount = currentDraws.filter(r => ['R', 'E', 'AA', 'AA_SIGN', 'AA_ULTIMATE', 'rare', 'super_rare', 'ultra_rare', 'secret_rare'].includes(r.card.rarity)).length;
  const newCardsCount = currentDraws.filter(r => r.isNew).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-purple-950 to-black p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent pointer-events-none" />
      
      <div className="max-w-5xl mx-auto relative z-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-4 mb-4 relative">
            <div className="absolute inset-0 blur-xl bg-yellow-500/30 animate-pulse rounded-full" />
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 flex items-center justify-center shadow-[0_0_30px_rgba(251,191,36,0.5)] animate-[pulse_2s_ease-in-out_infinite]">
              <Gift className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-5xl font-black tracking-wider relative">
              <span className="bg-gradient-to-r from-yellow-400 via-orange-400 to-red-500 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(251,191,36,0.8)]">
                幸运开包
              </span>
            </h1>
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 flex items-center justify-center shadow-[0_0_30px_rgba(251,191,36,0.5)] animate-[pulse_2s_ease-in-out_infinite]">
              <Gift className="w-10 h-10 text-white" />
            </div>
          </div>
          <p className="text-orange-300/80 text-lg tracking-wide">选择你的命运，开启卡牌之旅</p>
          <div className="mt-4 inline-block">
            <div className="px-4 py-2 bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 rounded-full border border-amber-500/30">
              <p className="text-amber-300/90 text-sm">
                ⚠️ 概率有点小错误，反正随便做着玩的，抽着图一乐吧~
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-center items-center gap-4 mb-8">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-2xl blur opacity-60 group-hover:opacity-100 transition duration-500" />
            <div className="relative flex items-center gap-3 px-8 py-5 bg-black/80 rounded-2xl border border-yellow-500/50">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center animate-[spin_3s_linear_infinite]">
                <Coins className="w-6 h-6 text-black" />
              </div>
              <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400 tabular-nums">
                {coins.toLocaleString()}
              </span>
              <span className="text-yellow-400/80 font-bold">金币</span>
            </div>
          </div>
        </div>

        {/* Version Selection */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-purple-500/20 rounded-3xl blur-xl" />
          <div className="relative bg-black/60 backdrop-blur-xl rounded-3xl p-6 border border-purple-500/30 shadow-[0_0_50px_rgba(168,85,247,0.2)]">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Layers className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-white tracking-wide">选择版本</h2>
              </div>
              <Button
                variant={isMixedPool ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setIsMixedPool(!isMixedPool);
                  setSelectedVersion('');
                }}
                className={cn(
                  'font-bold transition-all duration-300',
                  isMixedPool 
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-[0_0_20px_rgba(168,85,247,0.5)]' 
                    : 'bg-white/5 border-purple-500/50 text-purple-300 hover:bg-purple-500/20'
                )}
              >
                <Sparkles className="w-4 h-4 mr-1" />
                混池模式
              </Button>
            </div>
          
            {isMixedPool ? (
              <div className="relative py-12 text-center">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/10 to-transparent animate-[shimmer_2s_infinite]" />
                <Sparkles className="w-20 h-20 mx-auto text-purple-400 mb-4 animate-pulse drop-shadow-[0_0_15px_rgba(168,85,247,0.8)]" />
                <p className="text-white text-2xl font-bold tracking-wider">全卡池混抽</p>
                <p className="text-purple-300 mt-2">所有版本卡牌混合抽取</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {currentGameVersions.map((version, index) => (
                  <button
                    key={version.id}
                    onClick={() => selectVersion(version.id)}
                    className={cn(
                      'relative p-5 rounded-2xl border-2 transition-all duration-300 transform',
                      selectedVersion === version.id
                        ? 'bg-gradient-to-br from-purple-600 to-pink-600 border-pink-400 shadow-[0_0_30px_rgba(236,72,153,0.5)] scale-105'
                        : 'bg-white/5 border-purple-500/30 hover:bg-white/10 hover:border-purple-500/50'
                    )}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="text-center">
                      <p className={cn(
                        'text-2xl font-black tracking-wider mb-1',
                        selectedVersion === version.id ? 'text-white' : 'text-purple-200'
                      )}>
                        {version.name}
                      </p>
                      <p className={cn(
                        'text-sm font-mono tracking-widest',
                        selectedVersion === version.id ? 'text-pink-200' : 'text-purple-400/70'
                      )}>
                        {version.id}
                      </p>
                    </div>
                    {selectedVersion === version.id && (
                      <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(34,197,94,0.8)]">
                        <Check className="w-5 h-5 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Card Pool Info */}
        <div className="text-center mb-6">
          <p className="inline-block px-6 py-2 bg-black/40 rounded-full border border-purple-500/30">
            <span className="text-purple-300">符文战场</span>
            {isMixedPool && <span className="text-yellow-400 ml-2">✨ 混池模式</span>}
            {!isMixedPool && selectedVersion && (
              <span className="text-pink-400 ml-2">• {currentGameVersions.find(v => v.id === selectedVersion)?.name}</span>
            )}
            <span className="text-purple-300 ml-2">•</span>
            <span className="text-white ml-2 font-bold">{pool.length}</span>
            <span className="text-purple-300 ml-1">张卡牌</span>
          </p>
        </div>

        {/* Pack Selection */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-yellow-500/10 to-transparent rounded-3xl blur-2xl" />
          <div className="relative bg-black/70 backdrop-blur-xl rounded-3xl p-8 border border-yellow-500/30 shadow-[0_0_60px_rgba(251,191,36,0.15)]">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 tracking-wider mb-2">
                选择补充包
              </h2>
              <p className="text-orange-300/70">选择你想要开启的卡包</p>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-10">
              {PACK_CONFIG.map((pack, index) => (
                <button
                  key={pack.id}
                  onClick={() => setSelectedPack(pack.id)}
                  className={cn(
                    'relative p-8 rounded-3xl border-2 transition-all duration-500 transform overflow-hidden group',
                    selectedPack === pack.id
                      ? 'bg-gradient-to-br from-yellow-600 via-orange-500 to-red-500 border-orange-400 shadow-[0_0_50px_rgba(251,146,60,0.6)] scale-105'
                      : 'bg-white/5 border-orange-500/20 hover:bg-white/10 hover:border-orange-500/40'
                  )}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative">
                    <div className="text-center">
                      <div className={cn(
                        'w-24 h-24 mx-auto mb-4 rounded-2xl flex items-center justify-center transition-all duration-300',
                        selectedPack === pack.id 
                          ? 'bg-white/30 shadow-[0_0_30px_rgba(255,255,255,0.3)]' 
                          : 'bg-gradient-to-br from-yellow-500/20 to-orange-500/20'
                      )}>
                        <Package className={cn(
                          'w-14 h-14 transition-all duration-300',
                          selectedPack === pack.id ? 'text-white animate-bounce' : 'text-orange-400'
                        )} />
                      </div>
                      <h3 className={cn(
                        'text-2xl font-black tracking-wide mb-2',
                        selectedPack === pack.id ? 'text-white' : 'text-orange-200'
                      )}>
                        {pack.name}
                      </h3>
                      <p className={cn(
                        'text-sm mb-4',
                        selectedPack === pack.id ? 'text-orange-100' : 'text-orange-300/60'
                      )}>
                        包含 <span className="font-bold">{pack.cards}</span> 张卡牌
                      </p>
                      <div className={cn(
                        'inline-flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300',
                        selectedPack === pack.id 
                          ? 'bg-black/30 text-white' 
                          : 'bg-orange-500/20 text-orange-300'
                      )}>
                        <Coins className="w-5 h-5 text-yellow-400" />
                        <span className={cn(
                          'text-xl font-black',
                          selectedPack === pack.id ? 'text-yellow-300' : 'text-orange-400'
                        )}>
                          {pack.price}
                        </span>
                      </div>
                    </div>
                    {selectedPack === pack.id && (
                      <div className="absolute top-4 right-4 flex items-center gap-1 text-white bg-green-500/90 px-3 py-1 rounded-full">
                        <Check className="w-4 h-4" />
                        <span className="text-sm font-bold">已选</span>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>

            <div className="flex justify-center">
              <Button
                onClick={openPack}
                disabled={!canOpenPack()}
                className={cn(
                  'relative px-16 py-6 text-2xl font-black rounded-2xl transition-all duration-300 overflow-hidden group',
                  canOpenPack()
                    ? 'bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 hover:from-yellow-400 hover:via-orange-400 hover:to-red-400 shadow-[0_0_40px_rgba(251,146,60,0.5)] hover:scale-105'
                    : 'bg-gray-700/50 text-gray-400 cursor-not-allowed'
                )}
              >
                <span className="relative z-10 flex items-center gap-3">
                  <Gift className="w-8 h-8" />
                  {isOpening ? '正在开包...' : '开始抽卡'}
                </span>
                {canOpenPack() && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_1.5s_infinite]" />
                )}
              </Button>
            </div>
            
            {!canOpenPack() && (
              <p className="text-center text-orange-300/60 mt-4 text-sm">
                {isOpening ? '🎰 转动中...' : !selectedPack ? '💡 请先选择补充包' : (!isMixedPool && !selectedVersion ? '💡 请先选择版本' : coins < (PACK_CONFIG.find(p => p.id === selectedPack)?.price || 0) ? '💰 金币不足' : '📦 卡池为空')}
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-center items-center min-h-[280px]">
          {isLoading ? (
            <div className="text-center">
              <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 animate-spin flex items-center justify-center">
                <RefreshCw className="w-12 h-12 text-white" />
              </div>
              <p className="text-purple-300 text-xl font-bold">加载卡池中...</p>
            </div>
          ) : pool.length === 0 ? (
            <div className="text-center">
              <div className="w-32 h-32 mx-auto mb-4 rounded-full bg-gray-800/50 flex items-center justify-center border-2 border-dashed border-purple-500/30">
                <Package className="w-16 h-16 text-purple-400/50" />
              </div>
              <p className="text-purple-300/60 text-xl">暂无卡牌数据</p>
            </div>
          ) : isOpening && !showResult ? (
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/30 via-orange-500/30 to-red-500/30 rounded-3xl blur-2xl animate-pulse" />
              <div className="relative w-56 h-72 bg-gradient-to-br from-amber-600 via-amber-700 to-amber-900 rounded-3xl border-4 border-yellow-400/50 flex items-center justify-center shadow-[0_0_60px_rgba(251,191,36,0.4)]">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-xl bg-gradient-to-br from-yellow-400/30 to-orange-400/30 flex items-center justify-center animate-bounce">
                    <Package className="w-12 h-12 text-yellow-300" />
                  </div>
                  <p className="text-yellow-200 text-2xl font-black mb-3 animate-pulse">正在开包</p>
                  <p className="text-yellow-400/80 font-mono text-lg">{currentDraws.length} / {selectedPackConfig?.cards}</p>
                </div>
              </div>
              <div className="absolute -inset-1 bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 rounded-3xl opacity-50 animate-ping" />
              <div className="absolute -inset-2 bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 rounded-3xl opacity-30 animate-pulse" />
            </div>
          ) : showResult && !openResultDialog ? (
            <div className="text-center">
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-gradient-to-r from-green-500/30 to-yellow-500/30 rounded-3xl blur-xl animate-pulse" />
                <div className="relative w-48 h-60 bg-gradient-to-br from-green-600 via-emerald-700 to-green-900 rounded-3xl border-4 border-green-400/50 flex items-center justify-center shadow-[0_0_50px_rgba(34,197,94,0.4)]">
                  <div className="text-center">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-xl bg-white/20 flex items-center justify-center animate-bounce">
                      <PartyPopper className="w-12 h-12 text-white" />
                    </div>
                    <p className="text-white text-xl font-black mb-2">开包完成!</p>
                    <p className="text-green-200/70 text-sm">点击查看结果</p>
                  </div>
                </div>
                <Sparkles className="absolute -top-4 -right-4 w-10 h-10 text-yellow-400 animate-pulse drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]" />
                <Sparkles className="absolute -bottom-2 -left-4 w-8 h-8 text-yellow-300 animate-pulse drop-shadow-[0_0_10px_rgba(250,204,21,0.6)]" />
              </div>
            </div>
          ) : (
            <div className="text-center">
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-3xl blur-lg" />
                <div className="relative w-44 h-56 bg-gradient-to-br from-amber-600 via-amber-700 to-amber-900 rounded-3xl border-4 border-amber-400/30 flex items-center justify-center shadow-[0_0_40px_rgba(251,191,36,0.3)]">
                  <div className="text-center">
                    <Package className="w-16 h-16 mx-auto text-amber-300/80 mb-3" />
                    <p className="text-amber-200 font-bold">等待开包</p>
                  </div>
                </div>
                <div className="absolute -top-3 -right-3 w-12 h-12">
                  <div className="w-full h-full bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full animate-pulse shadow-[0_0_20px_rgba(251,191,36,0.6)]" />
                </div>
                <div className="absolute -bottom-2 -left-3 w-8 h-8">
                  <div className="w-full h-full bg-gradient-to-br from-pink-400 to-red-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.6)]" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* History */}
        <Card className="bg-white/10 backdrop-blur-lg border-0">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              开包记录
              <span className="text-sm font-normal text-gray-400">({drawHistory.length})</span>
            </CardTitle>
            {drawHistory.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex bg-white/10 rounded-lg p-1">
                  <Button
                    variant={historyViewMode === 'grid' ? 'default' : 'ghost'}
                    size="icon"
                    className={historyViewMode === 'grid' ? 'bg-purple-600 hover:bg-purple-700' : 'hover:bg-white/10'}
                    onClick={() => setHistoryViewMode('grid')}
                  >
                    <Layers className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={historyViewMode === 'list' ? 'default' : 'ghost'}
                    size="icon"
                    className={historyViewMode === 'list' ? 'bg-purple-600 hover:bg-purple-700' : 'hover:bg-white/10'}
                    onClick={() => setHistoryViewMode('list')}
                  >
                    <span className="w-4 h-4 flex items-center justify-center">☰</span>
                  </Button>
                </div>
                <Button variant="ghost" size="sm" onClick={resetHistory} className="text-gray-400 hover:text-red-400">
                  <X className="w-4 h-4 mr-1" />
                  清空记录
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {drawHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>暂无开包记录</p>
              </div>
            ) : historyViewMode === 'grid' ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 max-h-64 overflow-y-auto">
                {drawHistory.map((result, index) => {
                  const rarity = getRarityConfig(result.card.rarity);
                  return (
                    <div
                      key={`${result.card.id}-${index}`}
                      className={cn(
                        'relative p-3 rounded-xl border',
                        rarity.borderColor,
                        rarity.bgColor
                      )}
                    >
                      {result.isNew && (
                        <div className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs">新</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1 mb-2">
                        <Star className={cn('w-3 h-3', rarity.color)} />
                        <span className={cn('text-xs font-bold', rarity.color)}>{rarity.name}</span>
                      </div>
                      <p className="text-sm font-medium text-gray-800 truncate">{result.card.name}</p>
                      <p className="text-xs text-gray-500">{result.card.type}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {drawHistory.map((result, index) => {
                  const rarity = getRarityConfig(result.card.rarity);
                  return (
                    <div
                      key={`${result.card.id}-${index}`}
                      className={cn(
                        'flex items-center gap-4 p-3 rounded-xl border',
                        rarity.borderColor,
                        rarity.bgColor
                      )}
                    >
                      {result.isNew && (
                        <div className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
                          NEW!
                        </div>
                      )}
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 rounded-lg flex items-center justify-center flex-shrink-0">
                        {result.card.images?.[0] ? (
                          <img src={result.card.images[0]} alt={result.card.name} className="w-10 h-10 object-contain rounded" />
                        ) : (
                          <span className="text-lg">🎴</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Star className={cn('w-4 h-4', rarity.color)} />
                          <span className={cn('font-bold', rarity.color)}>{rarity.name}</span>
                          <span className="font-semibold text-gray-800 truncate">{result.card.name}</span>
                        </div>
                        <p className="text-sm text-gray-600">{result.card.type}</p>
                      </div>
                      <div className="text-xs text-gray-500 flex-shrink-0">
                        {result.card.version && <span>版本: {result.card.version}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Collection Stats */}
        <Card className="bg-white/10 backdrop-blur-lg border-0 mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-yellow-400" />
              收藏进度
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-300">已收集卡牌</span>
                  <span className="text-white">{ownedCards.size} / {pool.length}</span>
                </div>
                <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-yellow-400 via-pink-400 to-purple-400 transition-all duration-500"
                    style={{ width: `${pool.length > 0 ? (ownedCards.size / pool.length) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <div className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                {pool.length > 0 ? Math.round((ownedCards.size / pool.length) * 100) : 0}%
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Result Dialog */}
      <Dialog open={openResultDialog} onOpenChange={setOpenResultDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden bg-gradient-to-br from-indigo-950 via-purple-950 to-pink-950 border-purple-500/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-2xl">
              <PartyPopper className="w-8 h-8 text-yellow-400" />
              <span className="bg-gradient-to-r from-yellow-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
                开包结果
              </span>
            </DialogTitle>
            <DialogDescription className="text-purple-300">
              {selectedPackConfig?.name} · 获得 {currentDraws.length} 张卡牌
              {rareCardsCount > 0 && <span className="text-yellow-400 ml-2">· {rareCardsCount} 张稀有</span>}
              {newCardsCount > 0 && <span className="text-green-400 ml-2">· {newCardsCount} 张新卡</span>}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6 max-h-[60vh] overflow-y-auto py-4 px-2">
            {currentDraws.map((result, index) => {
              const rarity = getRarityConfig(result.card.rarity);
              const isHighRarity = ['R', 'E', 'AA', 'AA_SIGN', 'AA_ULTIMATE', 'rare', 'super_rare', 'ultra_rare', 'secret_rare'].includes(result.card.rarity);
              const isFoil = result.card.rarity.includes('FOIL');
              
              return (
                <div
                  key={`${result.card.id}-${index}`}
                  className={cn(
                    'relative w-32 h-44 rounded-2xl border-2 overflow-hidden transform transition-all duration-500',
                    rarity.borderColor,
                    rarity.bgColor,
                    isHighRarity && 'shadow-[0_0_25px_rgba(168,85,247,0.6)]',
                    isFoil && 'shadow-[0_0_20px_rgba(251,191,36,0.5)]',
                    !isHighRarity && !isFoil && rarity.glowColor ? `shadow-lg ${rarity.glowColor}` : 'shadow-lg'
                  )}
                  style={{ 
                    animationDelay: `${index * 80}ms`,
                    animation: isHighRarity ? 'pulse-glow 2s ease-in-out infinite' : 'none'
                  }}
                >
                  {result.isNew && (
                    <div className="absolute -top-1 -right-1 px-2 py-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-black rounded-full z-20 shadow-lg animate-bounce">
                      NEW!
                    </div>
                  )}
                  
                  {isHighRarity && (
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 via-pink-500/10 to-transparent pointer-events-none animate-pulse" />
                  )}
                  
                  <div className="absolute top-1 left-1 flex items-center gap-1">
                    <div className={cn(
                      'p-1 rounded-lg',
                      isHighRarity ? 'bg-gradient-to-br from-purple-500 to-pink-500' : isFoil ? 'bg-gradient-to-br from-yellow-400 to-orange-400' : 'bg-gray-200/80'
                    )}>
                      <Star className={cn('w-3 h-3', isHighRarity || isFoil ? 'text-white' : rarity.color)} />
                    </div>
                    <span className={cn('text-xs font-black', isHighRarity ? 'text-purple-200' : isFoil ? 'text-orange-200' : rarity.color)}>{rarity.name}</span>
                  </div>
                  
                  <div className="flex flex-col items-center justify-center h-full pt-6">
                    <div className={cn(
                      'w-20 h-20 rounded-xl flex items-center justify-center mb-2 transition-all duration-300',
                      isHighRarity 
                        ? 'bg-gradient-to-br from-purple-600 via-pink-500 to-red-500 shadow-[0_0_20px_rgba(168,85,247,0.6)]' 
                        : isFoil
                        ? 'bg-gradient-to-br from-yellow-400 via-orange-400 to-red-400 shadow-[0_0_15px_rgba(251,191,36,0.5)]'
                        : 'bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 shadow-lg'
                    )}>
                      {result.card.images?.[0] ? (
                        <img src={result.card.images[0]} alt={result.card.name} className="w-16 h-16 object-contain rounded-lg" />
                      ) : (
                        <span className="text-3xl">🎴</span>
                      )}
                    </div>
                    <h3 className={cn(
                      'font-black text-center px-1 truncate text-sm',
                      isHighRarity ? 'text-purple-900' : 'text-gray-800'
                    )}>{result.card.name}</h3>
                    <p className={cn(
                      'text-xs mt-1',
                      isHighRarity ? 'text-purple-600' : 'text-gray-500'
                    )}>{result.card.type}</p>
                  </div>
                  
                  <div className={cn(
                    'absolute bottom-0 left-0 right-0 h-9 flex items-center justify-center',
                    isHighRarity 
                      ? 'bg-gradient-to-r from-purple-600/90 via-pink-600/90 to-purple-600/90' 
                      : 'bg-black/60'
                  )}>
                    <p className="text-xs text-white/90 truncate px-2 font-medium">{result.card.description}</p>
                  </div>
                  
                  {isHighRarity && (
                    <>
                      <div className="absolute -top-1 -left-1 w-4 h-4 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full animate-ping opacity-75" />
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-gradient-to-br from-pink-400 to-red-400 rounded-full animate-ping opacity-75" />
                    </>
                  )}
                </div>
              );
            })}
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <Button
              variant="outline"
              onClick={() => setOpenResultDialog(false)}
              className="bg-white/10 border-white/20 hover:bg-white/20"
            >
              关闭
            </Button>
            <Button
              onClick={() => {
                setOpenResultDialog(false);
                setShowResult(false);
              }}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              继续开包
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}