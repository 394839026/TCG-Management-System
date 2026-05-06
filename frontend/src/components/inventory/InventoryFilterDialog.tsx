import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Filter, X } from 'lucide-react';

interface FilterState {
  rarity: string[];
  itemType: string[];
  priceMin: string;
  priceMax: string;
  version: string;
  cardProperty: string[];
}

interface InventoryFilterDialogProps {
  onFilter: (filters: FilterState) => void;
  currentFilters: FilterState;
  selectedGame?: string;
}

// 符文战场的稀有度
const runeRarityOptions = [
  { value: 'N', label: '普通' },
  { value: 'N_FOIL', label: '普通（闪）' },
  { value: 'U', label: '不凡' },
  { value: 'U_FOIL', label: '不凡（闪）' },
  { value: 'R', label: '稀有' },
  { value: 'E', label: '史诗' },
  { value: 'AA', label: '异画' },
  { value: 'AA_SIGN', label: '异画（签字）' },
  { value: 'AA_ULTIMATE', label: '异画（终极超编）' },
];

// 通用的英文稀有度（数码宝贝、宝可梦等）
const universalRarityOptions = [
  { value: 'common', label: '普通' },
  { value: 'uncommon', label: '不凡' },
  { value: 'rare', label: '稀有' },
  { value: 'super_rare', label: '超稀有' },
  { value: 'ultra_rare', label: '极稀有' },
  { value: 'secret_rare', label: '秘稀有' },
];

// 其他稀有度
const otherRarityOptions = [
  { value: 'other', label: '其他' },
];
// 符文战场的版本选项
const versionOptions = [
  { value: 'OGN', label: 'OGN' },
  { value: 'SFD', label: 'SFD' },
  { value: 'UNL', label: 'UNL' },
  { value: 'P', label: 'P' },
];

const typeOptions = [
  { value: 'card', label: '卡牌' },
  { value: 'booster', label: '补充包' },
  { value: 'accessory', label: '周边' },
];

const cardPropertyOptions = [
  { value: '传奇', label: '传奇' },
  { value: '英雄', label: '英雄' },
  { value: '专属', label: '专属' },
  { value: '单位', label: '单位' },
  { value: '装备', label: '装备' },
  { value: '法术', label: '法术' },
  { value: '战场', label: '战场' },
  { value: '指示物', label: '指示物' },
  { value: '符文', label: '符文' },
];

export function InventoryFilterDialog({ onFilter, currentFilters, selectedGame }: InventoryFilterDialogProps) {
  const [filters, setFilters] = useState<FilterState>(currentFilters);

  // 当选择的游戏改变时，清除不相关的筛选
  useEffect(() => {
    setFilters(prev => {
      // 如果选择的是全部游戏，清除所有筛选条件
      if (!selectedGame) {
        return {
          rarity: [],
          itemType: [],
          priceMin: '',
          priceMax: '',
          version: '',
          cardProperty: [],
        };
      }
      
      // 获取当前游戏的有效稀有度
      const validRarities = getRarityOptionsForGame(selectedGame);
      // 过滤掉不在有效列表中的稀有度
      const filteredRarities = prev.rarity.filter(r => validRarities.includes(r));
      
      return {
        ...prev,
        rarity: filteredRarities,
      };
    });
  }, [selectedGame]);

  // 根据选择的游戏获取对应的稀有度值列表
  const getRarityOptionsForGame = (game?: string) => {
    if (game === 'rune') {
      return runeRarityOptions.map(r => r.value).concat(otherRarityOptions.map(r => r.value));
    } else if (game === 'shadowverse-evolve') {
      return universalRarityOptions.map(r => r.value).concat(otherRarityOptions.map(r => r.value));
    } else {
      return [...runeRarityOptions, ...universalRarityOptions, ...otherRarityOptions].map(r => r.value);
    }
  };

  // 根据选择的游戏获取对应的稀有度选项
  const getRarityOptions = () => {
    if (selectedGame === 'rune') {
      return [...runeRarityOptions, ...otherRarityOptions];
    } else if (selectedGame === 'shadowverse-evolve') {
      return [...universalRarityOptions, ...otherRarityOptions];
    } else {
      // 没有选择游戏时显示所有选项
      return [...runeRarityOptions, ...universalRarityOptions, ...otherRarityOptions];
    }
  };

  const toggleOption = (category: 'rarity' | 'itemType' | 'cardProperty', value: string) => {
    setFilters(prev => ({
      ...prev,
      [category]: prev[category].includes(value)
        ? prev[category].filter((v: string) => v !== value)
        : [...prev[category], value]
    }));
  };

  const handleReset = () => {
    const emptyFilters = {
      rarity: [],
      itemType: [],
      priceMin: '',
      priceMax: '',
      version: '',
      cardProperty: [],
    };
    setFilters(emptyFilters);
    onFilter(emptyFilters);
  };

  const handleApply = () => {
    onFilter(filters);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Filter className="w-4 h-4 mr-2" />
          筛选
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>高级筛选</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 稀有度 */}
          <div>
            <h4 className="font-medium mb-3">稀有度 {selectedGame && `- ${selectedGame === 'rune' ? '符文战场' : '影之诗进化对决'}`}</h4>
            <div className="flex flex-wrap gap-2">
              {getRarityOptions().map((rarity) => (
                <label
                  key={rarity.value}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                    filters.rarity.includes(rarity.value)
                      ? 'bg-primary text-white'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  <Checkbox
                    checked={filters.rarity.includes(rarity.value)}
                    onChange={() => toggleOption('rarity', rarity.value)}
                    className="sr-only"
                  />
                  {rarity.label}
                </label>
              ))}
            </div>
          </div>

          {/* 卡牌类型 */}
          <div>
            <h4 className="font-medium mb-3">卡牌类型</h4>
            <div className="flex flex-wrap gap-2">
              {typeOptions.map((type) => (
                <label
                  key={type.value}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                    filters.itemType.includes(type.value)
                      ? 'bg-primary text-white'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  <Checkbox
                    checked={filters.itemType.includes(type.value)}
                    onChange={() => toggleOption('itemType', type.value)}
                    className="sr-only"
                  />
                  {type.label}
                </label>
              ))}
            </div>
          </div>

          {/* 版本筛选（仅符文战场） */}
          {selectedGame === 'rune' && (
            <div>
              <h4 className="font-medium mb-3">版本</h4>
              <div className="flex flex-wrap gap-2">
                <label
                  key="all"
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                    !filters.version
                      ? 'bg-primary text-white'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  <Checkbox
                    checked={!filters.version}
                    onChange={() => setFilters(prev => ({ ...prev, version: '' }))}
                    className="sr-only"
                  />
                  全部版本
                </label>
                {versionOptions.map((version) => (
                  <label
                    key={version.value}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                      filters.version === version.value
                        ? 'bg-primary text-white'
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    <Checkbox
                      checked={filters.version === version.value}
                      onChange={() => setFilters(prev => ({ ...prev, version: filters.version === version.value ? '' : version.value }))}
                      className="sr-only"
                    />
                    {version.label}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* 卡牌属性筛选（仅符文战场） */}
          {selectedGame === 'rune' && (
            <div>
              <h4 className="font-medium mb-3">卡牌属性</h4>
              <div className="flex flex-wrap gap-2">
                {cardPropertyOptions.map((property) => (
                  <label
                    key={property.value}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                      filters.cardProperty.includes(property.value)
                        ? 'bg-primary text-white'
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    <Checkbox
                      checked={filters.cardProperty.includes(property.value)}
                      onChange={() => toggleOption('cardProperty', property.value)}
                      className="sr-only"
                    />
                    {property.label}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* 价格范围 */}
          <div>
            <h4 className="font-medium mb-3">价格范围</h4>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">最低价格</label>
                <Input
                  type="number"
                  placeholder="¥0"
                  value={filters.priceMin}
                  onChange={(e) => setFilters(prev => ({ ...prev, priceMin: e.target.value }))}
                />
              </div>
              <span className="text-muted-foreground">—</span>
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">最高价格</label>
                <Input
                  type="number"
                  placeholder="¥99999"
                  value={filters.priceMax}
                  onChange={(e) => setFilters(prev => ({ ...prev, priceMax: e.target.value }))}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={handleReset}>
            重置
          </Button>
          <Button className="flex-1" onClick={handleApply}>
            应用筛选
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
