import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Gift, Coins, Zap, Star, Crown, Gem, Award, X, RefreshCw, Package, Layers, Check, PartyPopper } from 'lucide-react';
import { cn } from '@/lib/utils';
import { inventoryService, InventoryItem } from '@/services/inventory';
import { useAuth } from '@/contexts/AuthContext';
import { gachaService, gachaProbabilityService } from '@/services/api';
import { toast } from 'sonner';

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

const GAME_TYPE_NAME_MAP: Record<string, string> = {
  'rune': '符文战场',
  'shadowverse-evolve': '影之诗进化对决',
};

const VERSION_NAME_MAP: Record<string, string> = {
  'OGN': '起源',
  'SFD': '铸魂试炼',
  'UNL': '破限',
  'mixed': '混池',
};

const RARITY_CONFIG: Record<string, { name: string; color: string; bgColor: string; borderColor: string; probability: number; glowColor: string }> = {
  N: { name: '普通', color: 'text-gray-600', bgColor: 'bg-gray-100', borderColor: 'border-gray-300', probability: 0.5, glowColor: '' },
  N_FOIL: { name: '普通（闪）', color: 'text-gray-600', bgColor: 'bg-gray-100', borderColor: 'border-gray-300', probability: 0.05, glowColor: 'shadow-gray-400/50' },
  U: { name: '不凡', color: 'text-blue-300', bgColor: 'bg-blue-100', borderColor: 'border-blue-400', probability: 0.25, glowColor: '' },
  U_FOIL: { name: '不凡（闪）', color: 'text-blue-300', bgColor: 'bg-blue-100', borderColor: 'border-blue-400', probability: 0.03, glowColor: 'shadow-blue-400/50' },
  R: { name: '稀有', color: 'text-purple-300', bgColor: 'bg-purple-100', borderColor: 'border-purple-400', probability: 0.1, glowColor: 'shadow-purple-400/30' },
  E: { name: '史诗', color: 'text-yellow-300', bgColor: 'bg-yellow-100', borderColor: 'border-yellow-400', probability: 0.05, glowColor: 'shadow-yellow-400/40' },
  AA: { name: '异画', color: 'text-red-300', bgColor: 'bg-red-100', borderColor: 'border-red-400', probability: 0.015, glowColor: 'shadow-red-400/50' },
  AA_SIGN: { name: '异画（签字）', color: 'text-red-300', bgColor: 'bg-red-100', borderColor: 'border-red-400', probability: 0.003, glowColor: 'shadow-red-500/60' },
  AA_ULTIMATE: { name: '异画（终极超编）', color: 'text-red-300', bgColor: 'bg-red-100', borderColor: 'border-red-400', probability: 0.002, glowColor: 'shadow-red-500/70' },
  common: { name: '普通', color: 'text-gray-600', bgColor: 'bg-gray-100', borderColor: 'border-gray-300', probability: 0.5, glowColor: '' },
  uncommon: { name: '不凡', color: 'text-blue-300', bgColor: 'bg-blue-100', borderColor: 'border-blue-400', probability: 0.3, glowColor: '' },
  rare: { name: '稀有', color: 'text-purple-300', bgColor: 'bg-purple-100', borderColor: 'border-purple-400', probability: 0.15, glowColor: 'shadow-purple-400/30' },
  super_rare: { name: '超稀有', color: 'text-yellow-300', bgColor: 'bg-yellow-100', borderColor: 'border-yellow-400', probability: 0.035, glowColor: 'shadow-yellow-400/40' },
  ultra_rare: { name: '极稀有', color: 'text-orange-300', bgColor: 'bg-orange-100', borderColor: 'border-orange-400', probability: 0.01, glowColor: 'shadow-orange-400/50' },
  secret_rare: { name: '秘密稀有', color: 'text-pink-300', bgColor: 'bg-pink-100', borderColor: 'border-pink-400', probability: 0.005, glowColor: 'shadow-pink-400/60' },
};

const RARITY_ICONS: Record<string, React.ReactNode> = {
  N: <Star className="w-3 h-3" />,
  N_FOIL: <Sparkles className="w-3 h-3" />,
  U: <Star className="w-3 h-3" />,
  U_FOIL: <Sparkles className="w-3 h-3" />,
  R: <Gem className="w-3 h-3" />,
  E: <Crown className="w-3 h-3" />,
  AA: <Award className="w-3 h-3" />,
  AA_SIGN: <Award className="w-3 h-3" />,
  AA_ULTIMATE: <Award className="w-3 h-3" />,
  common: <Star className="w-3 h-3" />,
  uncommon: <Star className="w-3 h-3" />,
  rare: <Gem className="w-3 h-3" />,
  super_rare: <Crown className="w-3 h-3" />,
  ultra_rare: <Award className="w-3 h-3" />,
  secret_rare: <Sparkles className="w-3 h-3" />,
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

interface DrawResult {
  card: GachaCard;
  isNew: boolean;
  packIndex: number;
}

export function GachaPage() {
  const [selectedGame, setSelectedGame] = useState('rune');
  const [selectedVersion, setSelectedVersion] = useState<string>('');
  const [isMixedPool, setIsMixedPool] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [currentDraws, setCurrentDraws] = useState<DrawResult[]>([]);
  const [drawHistory, setDrawHistory] = useState<DrawResult[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [animationStep, setAnimationStep] = useState(0);
  const [ownedCards, setOwnedCards] = useState<Set<string>>(new Set());
  const [selectedPack, setSelectedPack] = useState<string>('');
  const [openResultDialog, setOpenResultDialog] = useState(false);
  const [historyViewMode, setHistoryViewMode] = useState<'grid' | 'list'>('grid');
  const [showGift, setShowGift] = useState(false);
  const [hasClaimedGift, setHasClaimedGift] = useState(false);
  const [showGiftDialog, setShowGiftDialog] = useState(false);
  const [giftPosition, setGiftPosition] = useState({ x: 0, y: 0 });
  const [isClaimingGift, setIsClaimingGift] = useState(false);

  const { user, setUser } = useAuth();
  const coins = user?.coins || 0;
  const currentGameVersions = GAME_VERSIONS[selectedGame] || [];
  const queryClient = useQueryClient();

  const { data: probabilityData } = useQuery({
    queryKey: ['gachaProbability'],
    queryFn: gachaProbabilityService.getActiveConfig,
  });

  const currentRarityConfig = useMemo(() => {
    const config: Record<string, { name: string; color: string; bgColor: string; borderColor: string; probability: number; glowColor: string }> = { ...RARITY_CONFIG };
    
    if (probabilityData?.data?.rarities) {
      probabilityData.data.rarities.forEach((rarity: any) => {
        config[rarity.rarityId] = {
          name: rarity.rarityName,
          color: rarity.color,
          bgColor: rarity.bgColor,
          borderColor: rarity.borderColor,
          probability: rarity.probability,
          glowColor: rarity.glowColor
        };
      });
    }
    
    return config;
  }, [probabilityData]);

  const getRarityConfig = (rarity: string) => {
    return currentRarityConfig[rarity] || { name: rarity, color: 'text-gray-600', bgColor: 'bg-gray-100', borderColor: 'border-gray-300', probability: 0.1, glowColor: '' };
  };

  const updateCoinsInAuth = useCallback(async (newCoins: number) => {
    if (user && setUser) {
      const updatedUser = { ...user, coins: newCoins };
      setUser(updatedUser);
    }
  }, [user, setUser]);

  const giveDailyReward = useCallback(async () => {
    const lastCheckIn = localStorage.getItem('gacha_last_check_in');
    const today = new Date().toDateString();
    
    if (lastCheckIn !== today) {
      try {
        const response = await gachaService.addCoins(1000);
        if (response.success) {
          updateCoinsInAuth(response.data.coins);
          localStorage.setItem('gacha_last_check_in', today);
          toast.success('每日签到成功，获得1000金币！');
        }
      } catch (error) {
        console.error('签到失败:', error);
      }
    }
  }, [updateCoinsInAuth]);

  const fetchGiftStatus = useCallback(async () => {
    try {
      const response = await gachaService.getGiftStatus();
      if (response.success) {
        setShowGift(response.data.showGift);
        setHasClaimedGift(response.data.hasClaimedWithin24h);
        
        if (response.data.showGift && !response.data.hasClaimedWithin24h) {
          setGiftPosition({
            x: Math.random() * 80 + 10,
            y: Math.random() * 60 + 20
          });
        }
      }
    } catch (error) {
      console.error('获取礼物状态失败:', error);
    }
  }, []);

  const claimGift = useCallback(async () => {
    setIsClaimingGift(true);
    try {
      const response = await gachaService.claimGift();
      if (response.success) {
        updateCoinsInAuth(response.data.coins);
        setShowGiftDialog(true);
        setHasClaimedGift(true);
        setShowGift(false);
      }
    } catch (error) {
      console.error('领取礼物失败:', error);
      toast.error('领取失败，请稍后重试');
    } finally {
      setIsClaimingGift(false);
    }
  }, [updateCoinsInAuth]);

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
      const result = await inventoryService.getAllTemplates(params);
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

  const cardPool: GachaCard[] = useMemo(() => {
    if (!inventoryData?.data) return [];
    return inventoryData.data.map((item: InventoryItem) => ({
      id: String(item._id),
      name: item.itemName || item.name || '未知卡牌',
      rarity: item.rarity || 'N',
      type: item.cardProperty || item.itemType,
      description: item.description || '暂无描述',
      gameType: item.gameType || '',
      version: item.runeCardInfo?.version || item.version,
      images: item.images,
    }));
  }, [inventoryData]);

  useEffect(() => {
    giveDailyReward();
    fetchGiftStatus();
  }, [giveDailyReward, fetchGiftStatus]);

  const selectVersion = (versionId: string) => {
    if (isMixedPool) return;
    setSelectedVersion(versionId);
  };

  const getCardsByRarityGroup = (pool: GachaCard[], rarityGroup: string[]): GachaCard[] => {
    return pool.filter(card => rarityGroup.includes(card.rarity));
  };

  const isRuneCard = (card: GachaCard): boolean => {
    return card.type === '符文';
  };

  const drawCardByRarityGroup = useCallback((rarityGroup: string[], excludeIds: Set<string> = new Set(), excludeRune: boolean = true): GachaCard => {
    let pool = cardPool.filter(card => !excludeIds.has(card.id));
    if (excludeRune) {
      pool = pool.filter(card => !isRuneCard(card));
    }
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

  const drawRandomRarityCard = useCallback((excludeIds: Set<string> = new Set(), excludeRune: boolean = true): GachaCard => {
    let pool = cardPool.filter(card => !excludeIds.has(card.id));
    if (excludeRune) {
      pool = pool.filter(card => !isRuneCard(card));
    }
    
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
    const sortedRarities = Object.keys(currentRarityConfig).sort((a, b) => {
      return currentRarityConfig[b].probability - currentRarityConfig[a].probability;
    });

    for (const rarity of sortedRarities) {
      const config = currentRarityConfig[rarity];
      cumulative += config.probability;
      if (random <= cumulative) {
        const cards = pool.filter(card => card.rarity === rarity);
        if (cards.length > 0) {
          return cards[Math.floor(Math.random() * cards.length)];
        }
      }
    }
    
    return pool[Math.floor(Math.random() * pool.length)];
  }, [cardPool, selectedGame, currentRarityConfig]);

  const drawFoilCard = useCallback((excludeIds: Set<string> = new Set(), excludeRune: boolean = true): GachaCard => {
    let pool = cardPool.filter(card => !excludeIds.has(card.id));
    if (excludeRune) {
      pool = pool.filter(card => !isRuneCard(card));
    }
    
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
    const pool = cardPool.filter(card => !excludeIds.has(card.id));
    
    const tokenRunePool = pool.filter(card => card.type === '符文');
    
    if (tokenRunePool.length === 0) {
      const tokenPool = pool.filter(card => card.type === '指示物' || card.type === '指示物或符文');
      if (tokenPool.length > 0) {
        return tokenPool[Math.floor(Math.random() * tokenPool.length)];
      }
      return drawRandomRarityCard(excludeIds, false);
    }
    
    return tokenRunePool[Math.floor(Math.random() * tokenRunePool.length)];
  }, [cardPool, selectedGame, drawRandomRarityCard]);

  const drawTokenCard = useCallback((excludeIds: Set<string> = new Set()): GachaCard => {
    const pool = cardPool.filter(card => !excludeIds.has(card.id));
    
    const tokenPool = pool.filter(card => card.type === '指示物' || card.type === '指示物或符文');
    
    if (tokenPool.length === 0) {
      return drawRandomRarityCard(excludeIds, false);
    }
    
    return tokenPool[Math.floor(Math.random() * tokenPool.length)];
  }, [cardPool, selectedGame, drawRandomRarityCard]);

  const drawCard = useCallback((): GachaCard => {
    const pool = cardPool;
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
  }, [cardPool, selectedGame, getRarityConfig]);

  const canOpenPack = useCallback(() => {
    if (isOpening) return false;
    if (!selectedPack) return false;
    if (!isMixedPool && !selectedVersion) return false;
    const pack = PACK_CONFIG.find(p => p.id === selectedPack);
    if (!pack || coins < pack.price) return false;
    return true;
  }, [isOpening, selectedPack, isMixedPool, selectedVersion, coins]);

  const openPack = useCallback(async () => {
    if (!canOpenPack()) return;
    
    const pack = PACK_CONFIG.find(p => p.id === selectedPack)!;
    
    try {
      const spendResponse = await gachaService.spendCoins(pack.price);
      if (!spendResponse.success) {
        toast.error(spendResponse.message || '金币扣除失败');
        return;
      }
      updateCoinsInAuth(spendResponse.data.coins);
    } catch (error) {
      console.error('金币扣除失败:', error);
      toast.error('金币扣除失败，请重试');
      return;
    }
    
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
        
        const drawNext = async () => {
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
              await finishDrawing();
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
          RARITY_GROUPS.NON_FOIL,
          RARITY_GROUPS.NON_FOIL,
          RARITY_GROUPS.NON_FOIL,
          RARITY_GROUPS.RARE_AND_ABOVE,
          RARITY_GROUPS.RARE_AND_ABOVE,
          'token_rune',
          'token'
        ];
        
        const drawNext = async () => {
          if (cardIndex < premiumDraws.length) {
            const drawType = premiumDraws[cardIndex];
            let card: GachaCard;
            
            if (drawType === 'random') {
              card = drawRandomRarityCard(drawnIds);
            } else if (drawType === 'foil') {
              card = drawFoilCard(drawnIds);
            } else if (drawType === 'token_rune') {
              card = drawTokenRuneCard(drawnIds);
            } else if (drawType === 'token') {
              card = drawTokenCard(drawnIds);
            } else {
              card = drawCardByRarityGroup(Array.isArray(drawType) ? drawType : [drawType], drawnIds);
            }
            
            addResult(card);
            cardIndex++;
            
            if (cardIndex < premiumDraws.length) {
              setTimeout(drawNext, delay);
            } else {
              await finishDrawing();
            }
          }
        };
        
        drawNext();
      }
    };

    const finishDrawing = async () => {
      setDrawHistory(prev => [...results, ...prev]);
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
  }, [selectedPack, coins, isOpening, ownedCards, isMixedPool, selectedVersion, drawCardByRarityGroup, drawRandomRarityCard, drawFoilCard, drawTokenRuneCard, drawTokenCard, canOpenPack, updateCoinsInAuth, getRarityConfig]);

  const resetHistory = () => {
    setDrawHistory([]);
  };

  const refreshCardPool = () => {
    refetch();
  };

  const pool = cardPool;
  const selectedPackConfig = PACK_CONFIG.find(p => p.id === selectedPack);

  const rareCardsCount = currentDraws.filter(r => ['R', 'E', 'AA', 'AA_SIGN', 'AA_ULTIMATE', 'rare', 'super_rare', 'ultra_rare', 'secret_rare'].includes(r.card.rarity)).length;
  const newCardsCount = currentDraws.filter(r => r.isNew).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-purple-950 to-black p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent pointer-events-none" />
      
      <div className="max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-4 mb-4 relative">
            <div className="absolute inset-0 blur-xl bg-yellow-500/30 animate-pulse rounded-full" />
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 flex items-center justify-center shadow-[0_0_30px_rgba(251,191,36,0.6)] animate-[pulse_2s_ease-in-out_infinite]">
              <Gift className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl font-black tracking-wider relative">
              <span className="bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(251,191,36,0.8)]">
                抽卡系统（测试）
              </span>
            </h1>
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 flex items-center justify-center shadow-[0_0_30px_rgba(251,191,36,0.6)] animate-[pulse_2s_ease-in-out_infinite]">
              <Gift className="w-6 h-6 text-white" />
            </div>
          </div>
          <p className="text-orange-300/80 text-lg tracking-wide">开启卡牌之旅，收集稀有卡牌</p>
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
              <span className="text-yellow-400/80 font-bold">星币</span>
            </div>
          </div>
        </div>

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
                      ? `bg-gradient-to-br ${pack.color} border-white shadow-[0_0_60px_rgba(168,85,247,0.4)] scale-105`
                      : 'bg-white/5 border-white/20 hover:bg-white/10 hover:border-white/40'
                  )}
                >
                  {selectedPack === pack.id && (
                    <div className="absolute inset-0 bg-white/10 animate-pulse" />
                  )}
                  <div className="relative z-10">
                    <div className="flex items-center justify-center mb-4">
                      <div className={cn(
                        'w-20 h-20 rounded-2xl bg-gradient-to-br',
                        pack.color,
                        'flex items-center justify-center shadow-2xl transform group-hover:scale-110 transition-transform duration-500'
                      )}>
                        <Package className="w-10 h-10 text-white" />
                      </div>
                    </div>
                    <h3 className={cn(
                      'text-2xl font-black tracking-wider mb-2 text-center',
                      selectedPack === pack.id ? 'text-white' : 'text-purple-200'
                    )}>
                      {pack.name}
                    </h3>
                    <p className={cn(
                      'text-sm mb-4 text-center',
                      selectedPack === pack.id ? 'text-white/80' : 'text-purple-300/70'
                    )}>
                      包含 <span className="font-bold">{pack.cards}</span> 张卡牌
                    </p>
                    <div className={cn(
                      'inline-flex items-center gap-2 px-6 py-3 rounded-2xl transition-all duration-300 w-full justify-center',
                      selectedPack === pack.id 
                        ? 'bg-black/30 text-white' 
                        : 'bg-orange-500/20 text-orange-300'
                    )}>
                      <Coins className="w-5 h-5" />
                      <span className={cn(
                        'text-2xl font-black',
                        selectedPack === pack.id ? 'text-yellow-300' : 'text-orange-400'
                      )}>
                        {pack.price}
                      </span>
                    </div>
                  </div>
                  {selectedPack === pack.id && (
                    <div className="absolute top-4 right-4 flex items-center gap-1 text-white bg-green-500/90 px-3 py-1 rounded-full animate-bounce">
                      <Check className="w-4 h-4" />
                      <span className="text-sm font-bold">已选</span>
                    </div>
                  )}
                </button>
              ))}
            </div>

            <div className="flex justify-center">
              <Button
                onClick={openPack}
                disabled={!canOpenPack()}
                className={cn(
                  'relative px-16 py-6 text-2xl font-black rounded-3xl transition-all duration-500 overflow-hidden group',
                  canOpenPack()
                    ? 'bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 hover:from-yellow-400 hover:via-orange-400 hover:to-red-400 shadow-[0_0_60px_rgba(251,191,36,0.5)] hover:scale-105 active:scale-95'
                    : 'bg-gray-700/50 text-gray-400 cursor-not-allowed'
                )}
              >
                {isOpening ? (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>开包中...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Zap className="w-8 h-8 animate-pulse" />
                    <span>开启补充包</span>
                  </div>
                )}
              </Button>
            </div>
          </div>
        </div>

        {(showResult || drawHistory.length > 0) && (
          <Card className="bg-black/80 backdrop-blur-xl border border-purple-500/30 rounded-3xl overflow-hidden mb-8">
            <CardHeader className="border-b border-purple-500/20 bg-gradient-to-r from-purple-500/10 to-pink-500/10 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-3 text-purple-300">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <PartyPopper className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xl font-bold tracking-wide">本次结果</span>
                  {newCardsCount > 0 && (
                    <Badge className="bg-green-500 text-white px-3 py-1 text-sm">
                      {newCardsCount} 张新卡
                    </Badge>
                  )}
                  {rareCardsCount > 0 && (
                    <Badge className="bg-purple-500 text-white px-3 py-1 text-sm">
                      {rareCardsCount} 张稀有
                    </Badge>
                  )}
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetHistory}
                    className="border-gray-600 text-gray-300 hover:bg-gray-800"
                  >
                    <RefreshCw className="w-4 h-4 mr-1" />
                    清除
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {historyViewMode === 'grid' ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {(showResult ? currentDraws : drawHistory).map((draw, index) => {
                    const rarityConfig = getRarityConfig(draw.card.rarity);
                    const rarityIcon = RARITY_ICONS[draw.card.rarity];
                    return (
                      <div
                        key={index}
                        className={cn(
                          'group relative bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl p-4 border-2 transition-all duration-300 hover:scale-105',
                          rarityConfig.glowColor,
                          draw.card.rarity === 'AA_ULTIMATE' ? 'border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.5)]' :
                          draw.card.rarity === 'AA_SIGN' ? 'border-red-400 shadow-[0_0_20px_rgba(248,113,113,0.4)]' :
                          ['R', 'E', 'AA', 'rare', 'super_rare', 'ultra_rare', 'secret_rare'].includes(draw.card.rarity) ? 'border-purple-400 shadow-[0_0_15px_rgba(192,132,252,0.3)]' :
                          'border-gray-700'
                        )}
                      >
                        {draw.isNew && (
                          <div className="absolute -top-2 -left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-bold z-10 animate-pulse">
                            NEW
                          </div>
                        )}
                        <div
                          className={cn(
                            'w-full aspect-square rounded-lg mb-3 flex items-center justify-center bg-gradient-to-br',
                            rarityConfig.bgColor,
                            'border',
                            rarityConfig.borderColor
                          )}
                        >
                          {draw.card.images && draw.card.images.length > 0 ? (
                            <img
                              src={draw.card.images[0]}
                              alt={draw.card.name}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <Package className="w-12 h-12 text-gray-500" />
                          )}
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className={cn(
                              'text-sm font-bold truncate',
                              rarityConfig.color
                            )}>
                              {draw.card.name}
                            </p>
                            <span className="text-xs font-mono text-gray-500">#{index + 1}</span>
                          </div>
                          <div className={cn('flex items-center gap-1', rarityConfig.color)}>
                            {rarityIcon}
                            <span className="text-xs font-medium">{rarityConfig.name}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-2">
                  {(showResult ? currentDraws : drawHistory).map((draw, index) => {
                    const rarityConfig = getRarityConfig(draw.card.rarity);
                    const rarityIcon = RARITY_ICONS[draw.card.rarity];
                    return (
                      <div
                        key={index}
                        className={cn(
                          'flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-300',
                          rarityConfig.glowColor,
                          ['R', 'E', 'AA', 'AA_SIGN', 'AA_ULTIMATE', 'rare', 'super_rare', 'ultra_rare', 'secret_rare'].includes(draw.card.rarity)
                            ? 'bg-purple-500/10 border-purple-500/50'
                            : 'bg-white/5 border-white/10'
                        )}
                      >
                        <div
                          className={cn(
                            'w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0',
                            rarityConfig.bgColor,
                            'border',
                            rarityConfig.borderColor
                          )}
                        >
                          {draw.card.images && draw.card.images.length > 0 ? (
                            <img
                              src={draw.card.images[0]}
                              alt={draw.card.name}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <Package className="w-8 h-8 text-gray-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className={cn('text-lg font-bold', rarityConfig.color)}>{draw.card.name}</p>
                            <span className="text-xs font-mono text-gray-500">#{index + 1}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className={cn('flex items-center gap-1', rarityConfig.color)}>
                              {rarityIcon}
                              <span className="text-xs">{rarityConfig.name}</span>
                            </div>
                            {draw.isNew && (
                              <Badge className="bg-green-500 text-white text-xs flex-shrink-0">
                                NEW
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {showGift && !hasClaimedGift && (
          <div
            className="absolute cursor-pointer z-20"
            style={{
              left: `${giftPosition.x}%`,
              top: `${giftPosition.y}%`,
              transform: 'translate(-50%, -50%)'
            }}
            onClick={claimGift}
          >
            <div className="relative group">
              <div className="absolute -inset-4 bg-gradient-to-r from-yellow-500/50 to-orange-500/50 rounded-full blur-xl animate-pulse" />
              <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-[0_0_30px_rgba(251,191,36,0.6)] animate-[bounce_2s_ease-in-out_infinite] hover:scale-110 transition-transform">
                <Gift className="w-8 h-8 text-white" />
              </div>
              <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap text-yellow-400 font-bold text-sm animate-pulse">
                点击领取！
              </div>
            </div>
          </div>
        )}
      </div>

      <Dialog open={openResultDialog} onOpenChange={setOpenResultDialog}>
        <DialogContent className="sm:max-w-4xl bg-gradient-to-br from-gray-900 via-purple-950 to-black border border-purple-500/50 p-8">
          <DialogHeader className="text-center mb-6">
            <DialogTitle className="text-3xl font-black bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 bg-clip-text text-transparent">
              🎉 抽卡完成！
            </DialogTitle>
            <DialogDescription className="text-purple-300 mt-2">
              本次获得 {currentDraws.length} 张卡牌，{newCardsCount} 张新卡
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-3 md:grid-cols-5 gap-4 mb-6">
            {currentDraws.map((draw, index) => {
              const rarityConfig = getRarityConfig(draw.card.rarity);
              const rarityIcon = RARITY_ICONS[draw.card.rarity];
              return (
                <div
                  key={index}
                  className={cn(
                    'relative p-4 rounded-2xl border-2 bg-gradient-to-br from-gray-800/30 to-gray-900/30',
                    rarityConfig.glowColor,
                    ['R', 'E', 'AA', 'AA_SIGN', 'AA_ULTIMATE', 'rare', 'super_rare', 'ultra_rare', 'secret_rare'].includes(draw.card.rarity)
                      ? 'border-purple-400 shadow-[0_0_20px_rgba(192,132,252,0.3)]'
                      : 'border-gray-700'
                  )}
                >
                  {draw.isNew && (
                    <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-bold z-10">
                      NEW
                    </div>
                  )}
                  <div
                    className={cn(
                      'w-full aspect-square rounded-xl mb-3 flex items-center justify-center',
                      rarityConfig.bgColor,
                      'border',
                      rarityConfig.borderColor
                    )}
                  >
                    {draw.card.images && draw.card.images.length > 0 ? (
                      <img
                        src={draw.card.images[0]}
                        alt={draw.card.name}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <Package className="w-10 h-10 text-gray-500" />
                    )}
                  </div>
                  <div className="text-center space-y-1">
                    <p className={cn('text-sm font-bold truncate', rarityConfig.color)}>
                      {draw.card.name}
                    </p>
                    <div className={cn('flex items-center justify-center gap-1 text-xs', rarityConfig.color)}>
                      {rarityIcon}
                      <span>{rarityConfig.name}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-center">
            <Button
              onClick={() => setOpenResultDialog(false)}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 px-8 py-3 rounded-xl font-bold"
            >
              关闭
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showGiftDialog} onOpenChange={setShowGiftDialog}>
        <DialogContent className="sm:max-w-md bg-gradient-to-br from-yellow-900/50 via-orange-950 to-black border border-yellow-500/50 p-8">
          <DialogHeader className="text-center mb-6">
            <DialogTitle className="text-3xl font-black text-yellow-400">
              🎁 领取成功！
            </DialogTitle>
            <DialogDescription className="text-orange-300 mt-2">
              恭喜获得随机礼包！
            </DialogDescription>
          </DialogHeader>
          <div className="text-center py-8">
            <div className="flex items-center justify-center gap-3 text-3xl font-black text-yellow-400">
              <Coins className="w-10 h-10" />
              <span>+1000 星币</span>
            </div>
            <p className="text-orange-300 mt-4">24小时后可再次领取</p>
          </div>
          <div className="flex justify-center">
            <Button
              onClick={() => setShowGiftDialog(false)}
              className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 px-8 py-3 rounded-xl font-bold text-black"
            >
              太棒了！
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
