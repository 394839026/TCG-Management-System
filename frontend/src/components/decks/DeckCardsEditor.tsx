import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Crown, Sparkles, Shield, Sword, BookOpen, Gem, Plus, Search, Minus, Trash2, Package, X, CheckCircle, AlertCircle, Shuffle } from 'lucide-react';
import { inventoryService, InventoryItem } from '@/services/inventory';

// 卡牌位置类型
export type DeckSlot = 'legend' | 'mainDeck' | 'sideDeck' | 'battlefield' | 'runes' | 'tokens';

// 卡组卡牌接口
export interface DeckCard {
  card: string;
  quantity: number;
  slot: DeckSlot;
}

interface DeckCardsEditorProps {
  legend: DeckCard[];
  mainDeck: DeckCard[];
  sideDeck: DeckCard[];
  battlefield: DeckCard[];
  runes: DeckCard[];
  tokens: DeckCard[];
  onLegendChange: (cards: DeckCard[]) => void;
  onMainDeckChange: (cards: DeckCard[]) => void;
  onSideDeckChange: (cards: DeckCard[]) => void;
  onBattlefieldChange: (cards: DeckCard[]) => void;
  onRunesChange: (cards: DeckCard[]) => void;
  onTokensChange: (cards: DeckCard[]) => void;
  selectedGameType?: string;
  mode?: 'building' | 'collection'; // building: 个人库存，collection: 全部库存/模板
}

// 验证结果接口
export interface ValidationResult {
  isValid: boolean;
  messages: string[];
  warnings: string[];
}

// Fisher-Yates 洗牌算法
const shuffleArray = <T>(array: T[]): T[] => {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

// 从库存中随机生成合法的符文战场卡组
const generateRandomRuneDeck = (inventory: InventoryItem[], mode: 'building' | 'collection'): {
  legend: DeckCard[];
  mainDeck: DeckCard[];
  sideDeck: DeckCard[];
  battlefield: DeckCard[];
  runes: DeckCard[];
  tokens: DeckCard[];
} => {
  const getAvailableQuantity = (item: InventoryItem): number => {
    if (mode === 'building') {
      return item.userQuantity ?? item.quantity ?? 0;
    }
    return item.quantity ?? 1;
  };

  // 筛选各类卡牌
  const legends = inventory.filter(item => 
    item.cardProperty === '传奇' && getAvailableQuantity(item) > 0
  );
  
  const mainCards = inventory.filter(item => 
    ['专属', '法术', '单位', '英雄', '装备'].includes(item.cardProperty || '') &&
    getAvailableQuantity(item) > 0
  );
  
  const sideCards = inventory.filter(item => 
    ['专属', '法术', '单位', '英雄', '装备'].includes(item.cardProperty || '') &&
    getAvailableQuantity(item) > 0
  );
  
  const battlefields = inventory.filter(item => 
    item.cardProperty === '战场' && getAvailableQuantity(item) > 0
  );
  
  const runes = inventory.filter(item => 
    item.cardProperty === '符文' && getAvailableQuantity(item) > 0
  );
  
  const tokens = inventory.filter(item => 
    item.cardProperty === '指示物' && getAvailableQuantity(item) > 0
  );

  // 生成各部分卡牌
  const selectedCards = new Map<string, number>();
  const result: {
    legend: DeckCard[];
    mainDeck: DeckCard[];
    sideDeck: DeckCard[];
    battlefield: DeckCard[];
    runes: DeckCard[];
    tokens: DeckCard[];
  } = {
    legend: [],
    mainDeck: [],
    sideDeck: [],
    battlefield: [],
    runes: [],
    tokens: []
  };

  // 1. 传奇：1张
  if (legends.length > 0) {
    const shuffledLegends = shuffleArray(legends);
    const legend = shuffledLegends[0];
    const quantity = Math.min(1, getAvailableQuantity(legend));
    result.legend = [{ card: String(legend._id), quantity, slot: 'legend' }];
    selectedCards.set(String(legend._id), quantity);
  }

  // 2. 战场：3张（可重复，但同一张最多3张）
  const shuffledBattlefields = shuffleArray(battlefields);
  let battlefieldCount = 0;
  for (const card of shuffledBattlefields) {
    if (battlefieldCount >= 3) break;
    const currentUsed = selectedCards.get(String(card._id)) || 0;
    const available = getAvailableQuantity(card) - currentUsed;
    if (available > 0) {
      const maxPossible = Math.min(3 - currentUsed, available, 3 - battlefieldCount);
      const quantity = Math.min(maxPossible, 3 - battlefieldCount);
      if (quantity > 0) {
        result.battlefield.push({ card: String(card._id), quantity, slot: 'battlefield' });
        selectedCards.set(String(card._id), currentUsed + quantity);
        battlefieldCount += quantity;
      }
    }
  }

  // 3. 符文：12张（可重复，但同一张最多3张）
  const shuffledRunes = shuffleArray(runes);
  let runeCount = 0;
  for (const card of shuffledRunes) {
    if (runeCount >= 12) break;
    const currentUsed = selectedCards.get(String(card._id)) || 0;
    const available = getAvailableQuantity(card) - currentUsed;
    if (available > 0) {
      const maxPossible = Math.min(3 - currentUsed, available, 12 - runeCount);
      const quantity = Math.min(maxPossible, 12 - runeCount);
      if (quantity > 0) {
        result.runes.push({ card: String(card._id), quantity, slot: 'runes' });
        selectedCards.set(String(card._id), currentUsed + quantity);
        runeCount += quantity;
      }
    }
  }

  // 4. 主卡组：40张（可重复，但同一张最多3张）
  const shuffledMain = shuffleArray(mainCards);
  let mainCount = 0;
  for (const card of shuffledMain) {
    if (mainCount >= 40) break;
    const currentUsed = selectedCards.get(String(card._id)) || 0;
    const available = getAvailableQuantity(card) - currentUsed;
    if (available > 0) {
      const maxPossible = Math.min(3 - currentUsed, available, 40 - mainCount);
      const quantity = Math.min(maxPossible, 40 - mainCount);
      if (quantity > 0) {
        result.mainDeck.push({ card: String(card._id), quantity, slot: 'mainDeck' });
        selectedCards.set(String(card._id), currentUsed + quantity);
        mainCount += quantity;
      }
    }
  }

  // 5. 备用卡组：8张（可重复，但同一张最多3张，且与主卡组不重复）
  const shuffledSide = shuffleArray(sideCards.filter(c => {
    const used = selectedCards.get(String(c._id)) || 0;
    return used < 3;
  }));
  let sideCount = 0;
  for (const card of shuffledSide) {
    if (sideCount >= 8) break;
    const currentUsed = selectedCards.get(String(card._id)) || 0;
    const available = getAvailableQuantity(card) - currentUsed;
    if (available > 0 && currentUsed < 3) {
      const maxPossible = Math.min(3 - currentUsed, available, 8 - sideCount);
      const quantity = Math.min(maxPossible, 8 - sideCount);
      if (quantity > 0) {
        result.sideDeck.push({ card: String(card._id), quantity, slot: 'sideDeck' });
        selectedCards.set(String(card._id), currentUsed + quantity);
        sideCount += quantity;
      }
    }
  }

  return result;
};

// 符文战场卡组验证
const validateRuneDeck = (
  legend: DeckCard[],
  mainDeck: DeckCard[], 
  sideDeck: DeckCard[], 
  battlefield: DeckCard[], 
  runes: DeckCard[], 
  tokens: DeckCard[],
  inventoryData: InventoryItem[]
): ValidationResult => {
  const result: ValidationResult = {
    isValid: true,
    messages: [],
    warnings: []
  };

  const getCardInfo = (cardId: string) => {
    return inventoryData.find(i => String(i._id) === cardId);
  };

  const allCards = [...legend, ...mainDeck, ...sideDeck, ...battlefield, ...runes, ...tokens];
  
  const cardCounts: Record<string, number> = {};
  allCards.forEach(card => {
    const info = getCardInfo(card.card);
    if (info?.cardProperty !== '符文') {
      cardCounts[card.card] = (cardCounts[card.card] || 0) + card.quantity;
    }
  });

  Object.entries(cardCounts).forEach(([cardId, count]) => {
    if (count > 3) {
      const info = getCardInfo(cardId);
      result.isValid = false;
      result.messages.push(`卡牌 ${info?.itemName || cardId} 数量过多（最多3张，当前${count}张）`);
    }
  });

  // 传奇验证（必须正好1张）
  const legendCount = legend.reduce((sum, c) => sum + c.quantity, 0);
  if (legendCount !== 1) {
    result.isValid = false;
    result.messages.push(`传奇必须正好有1张（当前${legendCount}张）`);
  }

  // 主卡组验证（专属+法术+单位+英雄+装备）
  const mainDeckInfo = mainDeck.map(c => ({ ...c, info: getCardInfo(c.card) }));
  const validMainTypes = ['专属', '法术', '单位', '英雄', '装备'];
  const mainOtherCount = mainDeckInfo.filter(c => 
    c.info?.cardProperty && validMainTypes.includes(c.info.cardProperty)
  ).reduce((sum, c) => sum + c.quantity, 0);
  
  if (mainOtherCount !== 40) {
    result.isValid = false;
    result.messages.push(`主卡组必须正好有40张（当前${mainOtherCount}张）`);
  }

  // 备用卡组验证
  const sideDeckCount = sideDeck.reduce((sum, c) => sum + c.quantity, 0);
  if (sideDeckCount !== 8) {
    result.isValid = false;
    result.messages.push(`备用卡组必须正好有8张（当前${sideDeckCount}张）`);
  }

  const invalidSideTypes = ['指示物', '符文', '传奇'];
  sideDeck.forEach(card => {
    const info = getCardInfo(card.card);
    if (info?.cardProperty && invalidSideTypes.includes(info.cardProperty)) {
      result.isValid = false;
      result.messages.push(`备用卡组不能包含${info.cardProperty}：${info.itemName}`);
    }
  });

  // 战场验证
  const battlefieldCount = battlefield.reduce((sum, c) => sum + c.quantity, 0);
  if (battlefieldCount !== 3) {
    result.isValid = false;
    result.messages.push(`战场必须正好有3张（当前${battlefieldCount}张）`);
  }
  
  // 符文验证
  const runeCount = runes.reduce((sum, c) => sum + c.quantity, 0);
  if (runeCount !== 12) {
    result.isValid = false;
    result.messages.push(`符文必须正好有12张（当前${runeCount}张）`);
  }

  return result;
};

// 符文战场插槽配置
const RUNE_SLOT_CONFIG = {
  legend: {
    name: '传奇',
    icon: Crown,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    borderColor: 'border-yellow-400',
    required: 1,
    hint: '必须正好1张传奇卡',
    cardTypes: ['传奇']
  },
  mainDeck: {
    name: '主卡组',
    icon: Sparkles,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    borderColor: 'border-purple-300',
    required: 40,
    hint: '专属+法术+单位+英雄+装备 共40张',
    cardTypes: ['专属', '法术', '单位', '英雄', '装备']
  },
  sideDeck: {
    name: '备用卡组',
    icon: Shield,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-300',
    required: 8,
    hint: '最多8张',
    cardTypes: ['专属', '法术', '单位', '英雄', '装备']
  },
  battlefield: {
    name: '战场',
    icon: Sword,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-300',
    required: 3,
    hint: '必须正好3张战场卡',
    cardTypes: ['战场']
  },
  runes: {
    name: '符文',
    icon: Gem,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-300',
    required: 12,
    hint: '必须正好12张符文',
    cardTypes: ['符文']
  },
  tokens: {
    name: '指示物',
    icon: BookOpen,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    borderColor: 'border-orange-300',
    required: null,
    hint: '任意数量指示物',
    cardTypes: ['指示物']
  }
};

// 通用游戏插槽配置
const GENERIC_SLOT_CONFIG = {
  mainDeck: {
    name: '主卡组',
    icon: Sparkles,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    borderColor: 'border-purple-300',
    required: null,
    hint: '主卡组卡牌',
    cardTypes: []
  },
  sideDeck: {
    name: '备用卡组',
    icon: Shield,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-300',
    required: null,
    hint: '备用卡组卡牌',
    cardTypes: []
  }
};

// 获取当前游戏的插槽配置
const getSlotConfig = (gameType?: string) => {
  if (gameType === 'rune') {
    return RUNE_SLOT_CONFIG;
  }
  return GENERIC_SLOT_CONFIG;
};

// 获取当前游戏的插槽列表
const getSlotList = (gameType?: string): DeckSlot[] => {
  if (gameType === 'rune') {
    return ['legend', 'mainDeck', 'sideDeck', 'battlefield', 'runes', 'tokens'];
  }
  return ['mainDeck', 'sideDeck'];
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
  'super_rare': '超稀有',
  'ultra_rare': '极稀有',
  'secret_rare': '秘密稀有'
};

// 卡牌类型中文映射
const ITEM_TYPE_MAP: Record<string, string> = {
  'card': '卡牌',
  'cards': '卡牌',
  'booster': '补充包',
  'boosters': '补充包',
  'accessory': '周边',
  'accessories': '周边',
  'pack': '补充包',
  'packs': '补充包'
};

export function DeckCardsEditor({
  legend,
  mainDeck,
  sideDeck,
  battlefield,
  runes,
  tokens,
  onLegendChange,
  onMainDeckChange,
  onSideDeckChange,
  onBattlefieldChange,
  onRunesChange,
  onTokensChange,
  selectedGameType,
  mode = 'building'
}: DeckCardsEditorProps) {
  const [activeSlot, setActiveSlot] = useState<DeckSlot>(selectedGameType === 'rune' ? 'legend' : 'mainDeck');
  const [searchTerm, setSearchTerm] = useState('');
  const [showInventory, setShowInventory] = useState(false);
  const [inventoryPage, setInventoryPage] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const itemsPerPage = 50;

  // 随机生成合法构筑
  const handleGenerateRandomDeck = async () => {
    if (selectedGameType !== 'rune' || isLoading) return;
    
    setIsGenerating(true);
    
    try {
      const generated = generateRandomRuneDeck(inventory, mode);
      
      onLegendChange(generated.legend);
      onMainDeckChange(generated.mainDeck);
      onSideDeckChange(generated.sideDeck);
      onBattlefieldChange(generated.battlefield);
      onRunesChange(generated.runes);
      onTokensChange(generated.tokens);
    } finally {
      setIsGenerating(false);
    }
  };

  // 搜索时重置分页
  useEffect(() => {
    setInventoryPage(1);
  }, [searchTerm]);

  // 当游戏类型变化时，确保 activeSlot 是有效值
  useEffect(() => {
    const validSlots = getSlotList(selectedGameType);
    if (!validSlots.includes(activeSlot)) {
      setActiveSlot(validSlots[0]);
    }
  }, [selectedGameType, activeSlot]);

  // 根据 mode 选择使用个人库存还是全部模板库存
  const { data: inventoryData, isLoading } = useQuery({
    queryKey: ['inventory', mode],
    queryFn: () => mode === 'building' 
      ? inventoryService.getAll({ limit: 2000 }) // 构筑模式：个人库存
      : inventoryService.getAllTemplates({ limit: 2000 }), // 卡组模式：全部模板库存
  });

  const inventory: InventoryItem[] = inventoryData?.data || [];
  const slotConfig = getSlotConfig(selectedGameType);
  const slotList = getSlotList(selectedGameType);

  const getCardsBySlot = (slot: DeckSlot) => {
    switch (slot) {
      case 'legend': return legend;
      case 'mainDeck': return mainDeck;
      case 'sideDeck': return sideDeck;
      case 'battlefield': return battlefield;
      case 'runes': return runes;
      case 'tokens': return tokens;
      default: return [];
    }
  };

  const getChangeFnBySlot = (slot: DeckSlot) => {
    switch (slot) {
      case 'legend': return onLegendChange;
      case 'mainDeck': return onMainDeckChange;
      case 'sideDeck': return onSideDeckChange;
      case 'battlefield': return onBattlefieldChange;
      case 'runes': return onRunesChange;
      case 'tokens': return onTokensChange;
      default: return () => {};
    }
  };

  const filteredInventory = useMemo(() => {
    // 辅助函数：检查游戏类型是否匹配
    const matchesGameType = (item: any, targetGameType: string): boolean => {
      if (!item.gameType) return false;
      if (Array.isArray(item.gameType)) {
        return item.gameType.includes(targetGameType);
      }
      return item.gameType === targetGameType;
    };

    // 辅助函数：检查库存是否有效
    const hasValidQuantity = (item: any): boolean => {
      // 只有在构筑模式下才过滤库存为0的卡牌
      if (mode !== 'building') return true;
      // 在构筑模式下使用 userQuantity（用户实际拥有的数量）
      return (item.userQuantity ?? item.quantity ?? 0) > 0;
    };

    if (selectedGameType !== 'rune') {
      return inventory.filter(item => 
        hasValidQuantity(item) &&
        item.itemName.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (!selectedGameType || matchesGameType(item, selectedGameType))
      );
    }

    const config = (slotConfig[activeSlot as keyof typeof slotConfig] || slotConfig.mainDeck) as { cardTypes: string[] };
    return inventory.filter(item => {
      const matchesSearch = item.itemName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesGame = matchesGameType(item, 'rune');
      const cardTypes = config.cardTypes as string[];
      const matchesType = cardTypes.length === 0 || cardTypes.includes(item.cardProperty || '');
      return hasValidQuantity(item) && matchesSearch && matchesGame && matchesType;
    });
  }, [inventory, searchTerm, selectedGameType, activeSlot, slotConfig, mode]);

  const validationResult = useMemo(() => {
    if (selectedGameType === 'rune' && inventory.length > 0) {
      return validateRuneDeck(legend, mainDeck, sideDeck, battlefield, runes, tokens, inventory);
    }
    return { isValid: true, messages: [], warnings: [] };
  }, [legend, mainDeck, sideDeck, battlefield, runes, tokens, selectedGameType, inventory]);

  const addCardToSlot = (item: InventoryItem) => {
    const cards = getCardsBySlot(activeSlot);
    const changeFn = getChangeFnBySlot(activeSlot);
    const existingCard = cards.find(c => c.card === String(item._id));
    
    if (existingCard) {
      changeFn(cards.map(c => 
        c.card === String(item._id) 
          ? { ...c, quantity: c.quantity + 1 }
          : c
      ));
    } else {
      changeFn([...cards, { card: String(item._id), quantity: 1, slot: activeSlot }]);
    }
    setShowInventory(false);
  };

  const updateCardQuantity = (index: number, delta: number) => {
    const cards = [...getCardsBySlot(activeSlot)];
    const changeFn = getChangeFnBySlot(activeSlot);
    cards[index] = {
      ...cards[index],
      quantity: Math.max(1, cards[index].quantity + delta)
    };
    changeFn(cards);
  };

  const removeCard = (index: number) => {
    const cards = getCardsBySlot(activeSlot);
    const changeFn = getChangeFnBySlot(activeSlot);
    changeFn(cards.filter((_, i) => i !== index));
  };

  const currentSlotCards = getCardsBySlot(activeSlot);
  const currentConfig = slotConfig[activeSlot as keyof typeof slotConfig] || slotConfig.mainDeck;
  const Icon = currentConfig.icon;
  const totalCount = currentSlotCards.reduce((sum, c) => sum + c.quantity, 0);
  const isRuneGame = selectedGameType === 'rune';

  return (
    <div className="space-y-6">
      {/* 符文战场专属标题 */}
      {isRuneGame && (
        <div className="text-center pb-4 border-b">
          <h3 className="text-xl font-bold bg-gradient-to-r from-yellow-600 via-orange-600 to-red-600 bg-clip-text text-transparent">
            ⚔️ 符文战场卡组构成 ⚔️
          </h3>
          <p className="text-sm text-gray-500 mt-1">构建您的完美卡组</p>
          <Button 
            type="button"
            variant="premium" 
            size="sm"
            className="mt-4 gap-2"
            onClick={handleGenerateRandomDeck}
            disabled={isGenerating || isLoading}
          >
            <Shuffle className="w-4 h-4" />
            {isGenerating ? '生成中...' : '随机生成合法构筑'}
          </Button>
        </div>
      )}

      {/* 验证结果显示 */}
      {isRuneGame && (validationResult.messages.length > 0 || validationResult.warnings.length > 0) && (
        <div className="space-y-2">
          {validationResult.messages.length > 0 && (
            <div className="p-4 border border-red-200 bg-red-50 rounded-xl">
              <div className="flex items-center gap-2 text-red-700 mb-3">
                <AlertCircle className="w-5 h-5" />
                <span className="font-semibold">❌ 验证错误</span>
              </div>
              <ul className="text-sm text-red-600 space-y-1">
                {validationResult.messages.map((msg, i) => (
                  <li key={i}>• {msg}</li>
                ))}
              </ul>
            </div>
          )}
          {validationResult.warnings.length > 0 && (
            <div className="p-4 border border-yellow-200 bg-yellow-50 rounded-xl">
              <div className="flex items-center gap-2 text-yellow-700 mb-3">
                <AlertCircle className="w-5 h-5" />
                <span className="font-semibold">⚠️ 建议</span>
              </div>
              <ul className="text-sm text-yellow-600 space-y-1">
                {validationResult.warnings.map((msg, i) => (
                  <li key={i}>• {msg}</li>
                ))}
              </ul>
            </div>
          )}
          {validationResult.isValid && validationResult.messages.length === 0 && (
            <div className="p-4 border border-green-200 bg-green-50 rounded-xl">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="w-5 h-5" />
                <span className="font-semibold">🎉 卡组符合所有规则！</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 插槽选择器 */}
      {isRuneGame ? (
        // 符文战场6列卡片布局
        <div className="grid grid-cols-6 gap-3">
          {slotList.map((slot) => {
            const config = slotConfig[slot as keyof typeof slotConfig] || slotConfig.mainDeck;
            const cards = getCardsBySlot(slot);
            const count = cards.reduce((sum, c) => sum + c.quantity, 0);
            const required = config.required;
            const isActiveSlot = slot === activeSlot;
            const SlotIcon = config.icon;
            const isComplete = required ? count === required : count > 0;
            
            return (
              <button
                type="button"
                key={slot}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveSlot(slot);
                }}
                className={`relative p-3 rounded-xl border-2 transition-all ${
                  isActiveSlot 
                    ? `${config.borderColor} ${config.bgColor} shadow-lg scale-105` 
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <div className={`p-2 rounded-full ${config.bgColor}`}>
                    <SlotIcon className={`w-5 h-5 ${config.color}`} />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-xs">{config.name}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {required ? `${count}/${required}` : count}
                    </p>
                  </div>
                  {isComplete && (
                    <div className="absolute -top-2 -right-2 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
                {required && (
                  <div className="mt-2">
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all ${
                          count === required ? 'bg-green-500' : 
                          count > required ? 'bg-red-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${Math.min((count / required) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        // 通用游戏2列卡片布局
        <div className="grid grid-cols-2 gap-3">
          {slotList.map((slot) => {
            const config = slotConfig[slot as keyof typeof slotConfig] || slotConfig.mainDeck;
            const cards = getCardsBySlot(slot);
            const count = cards.reduce((sum, c) => sum + c.quantity, 0);
            const isActiveSlot = slot === activeSlot;
            const SlotIcon = config.icon;
            const isComplete = count > 0;
            
            return (
              <button
                type="button"
                key={slot}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveSlot(slot);
                }}
                className={`relative p-4 rounded-xl border-2 transition-all ${
                  isActiveSlot 
                    ? `${config.borderColor} ${config.bgColor} shadow-lg scale-105` 
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${config.bgColor}`}>
                    <SlotIcon className={`w-6 h-6 ${config.color}`} />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold">{config.name}</p>
                    <p className="text-sm text-gray-500">{count} 张卡牌</p>
                  </div>
                  {isComplete && (
                    <div className="ml-auto">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* 当前插槽详情 */}
      <div className={`border-2 rounded-xl p-6 ${currentConfig.borderColor} ${currentConfig.bgColor}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${currentConfig.bgColor}`}>
              <Icon className={`w-8 h-8 ${currentConfig.color}`} />
            </div>
            <div>
              <h4 className="text-xl font-bold">{currentConfig.name}</h4>
              <p className="text-sm text-gray-600">{currentConfig.hint}</p>
            </div>
          </div>
          <Button 
            type="button"
            variant="outline" 
            size="lg"
            className="gap-2"
            onClick={(e) => {
              e.stopPropagation();
              setShowInventory(true);
            }}
          >
            <Plus className="w-5 h-5" />
            添加卡牌
          </Button>
        </div>

        {/* 进度条（仅符文战场显示） */}
        {isRuneGame && currentConfig.required && (
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span>进度</span>
              <span className="font-semibold">
                {totalCount} / {currentConfig.required} 张
                {totalCount === currentConfig.required && (
                  <span className="text-green-600 ml-2">✓</span>
                )}
              </span>
            </div>
            <div className="h-3 bg-white rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${
                  totalCount === currentConfig.required ? 'bg-green-500' : 
                  totalCount > currentConfig.required ? 'bg-red-500' : 'bg-blue-500'
                }`}
                style={{ width: `${Math.min((totalCount / currentConfig.required) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* 卡牌列表 */}
        {currentSlotCards.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-lg bg-white/50">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg mb-2">暂无卡牌</p>
            <p className="text-sm text-gray-400">点击上方按钮从库存添加</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
            {currentSlotCards.map((cardItem, index) => {
              const inventoryItem = inventory.find(i => String(i._id) === cardItem.card);
              const cardName = inventoryItem?.itemName || cardItem.card;
              
              return (
                <div 
                  key={`${cardItem.card}-${index}`} 
                  className="flex items-center gap-4 p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-all"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl">🎴</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-lg truncate">{cardName}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {inventoryItem?.rarity && (
                        <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                          {RARITY_MAP[inventoryItem.rarity] || inventoryItem.rarity}
                        </span>
                      )}
                      {inventoryItem?.cardProperty && (
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          inventoryItem.cardProperty === '传奇' ? 'bg-yellow-100 text-yellow-700' :
                          inventoryItem.cardProperty === '符文' ? 'bg-green-100 text-green-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {inventoryItem.cardProperty}
                        </span>
                      )}
                      <span className="text-xs text-gray-400">{inventoryItem ? (ITEM_TYPE_MAP[inventoryItem.itemType] || inventoryItem.itemType) : '未知'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      type="button"
                      variant="outline" 
                      size="icon" 
                      className="h-10 w-10"
                      onClick={(e) => {
                        e.stopPropagation();
                        updateCardQuantity(index, -1);
                      }}
                    >
                      <Minus className="w-5 h-5" />
                    </Button>
                    <div className="w-16 text-center font-bold text-xl">
                      {cardItem.quantity}
                    </div>
                    <Button 
                      type="button"
                      variant="outline" 
                      size="icon" 
                      className="h-10 w-10"
                      onClick={(e) => {
                        e.stopPropagation();
                        updateCardQuantity(index, 1);
                      }}
                    >
                      <Plus className="w-5 h-5" />
                    </Button>
                    <Button 
                      type="button"
                      variant="ghost" 
                      size="icon" 
                      className="h-10 w-10 text-red-500 hover:text-red-400 hover:bg-red-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeCard(index);
                      }}
                    >
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 库存选择面板 */}
      {showInventory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden shadow-2xl">
            <div className="p-6 border-b bg-gradient-to-r from-purple-500 via-pink-500 to-red-500">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/20 rounded-xl">
                    <Package className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-white">
                    <h3 className="text-2xl font-bold">从库存添加卡牌</h3>
                    <p className="text-sm text-white/80">添加到 {currentConfig.name}</p>
                  </div>
                </div>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon"
                  className="text-white hover:bg-white/20"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowInventory(false);
                  }}
                >
                  <X className="w-6 h-6" />
                </Button>
              </div>
              <div className="mt-4 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input 
                  placeholder="搜索卡牌名称..." 
                  className="pl-12 h-12 text-lg bg-white"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-220px)]">
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
                </div>
              ) : filteredInventory.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">没有找到符合条件的卡牌</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    {filteredInventory.slice((inventoryPage - 1) * itemsPerPage, inventoryPage * itemsPerPage).map((item) => (
                      <button
                        key={item._id}
                        onClick={(e) => {
                          e.stopPropagation();
                          addCardToSlot(item);
                        }}
                        className="flex items-center gap-4 p-4 border-2 border-gray-200 rounded-xl hover:border-purple-400 hover:bg-purple-50 transition-all text-left"
                      >
                        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 flex items-center justify-center flex-shrink-0">
                          <span className="text-3xl">🎴</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-lg truncate">{item.itemName}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {item.rarity && (
                              <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                                {RARITY_MAP[item.rarity] || item.rarity}
                              </span>
                            )}
                            {item.cardProperty && (
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                item.cardProperty === '传奇' ? 'bg-yellow-100 text-yellow-700' :
                                item.cardProperty === '符文' ? 'bg-green-100 text-green-700' :
                                item.cardProperty === '战场' ? 'bg-red-100 text-red-700' :
                                item.cardProperty === '指示物' ? 'bg-orange-100 text-orange-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {item.cardProperty}
                              </span>
                            )}
                            <span className="text-xs text-gray-400">{ITEM_TYPE_MAP[item.itemType] || item.itemType}</span>
                          </div>
                          <p className="text-xs text-gray-400 mt-1">库存: {mode === 'building' ? (item.userQuantity ?? item.quantity) : item.quantity}</p>
                        </div>
                        <Plus className="w-6 h-6 text-purple-500" />
                      </button>
                    ))}
                  </div>
                  
                  {/* 分页控制 */}
                  {filteredInventory.length > itemsPerPage && (
                    <div className="flex items-center justify-center gap-4 mt-6">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={inventoryPage === 1}
                        onClick={(e) => {
                          e.stopPropagation();
                          setInventoryPage(prev => Math.max(1, prev - 1));
                        }}
                      >
                        上一页
                      </Button>
                      <span className="text-sm text-gray-500">
                        第 {inventoryPage} / {Math.ceil(filteredInventory.length / itemsPerPage)} 页
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={inventoryPage >= Math.ceil(filteredInventory.length / itemsPerPage)}
                        onClick={(e) => {
                          e.stopPropagation();
                          setInventoryPage(prev => Math.min(Math.ceil(filteredInventory.length / itemsPerPage), prev + 1));
                        }}
                      >
                        下一页
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
