import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Filter, X } from 'lucide-react';

interface FilterState {
  rarity: string[];
  itemType: string[];
  condition: string[];
  priceMin: string;
  priceMax: string;
}

interface InventoryFilterDialogProps {
  onFilter: (filters: FilterState) => void;
  currentFilters: FilterState;
}

const rarityOptions = ['UR', 'SR', 'R', 'N'];
const typeOptions = ['怪兽卡', '魔法卡', '陷阱卡', '额外卡组'];
const conditionOptions = ['全新', '近乎全新', '良好', '一般'];

export function InventoryFilterDialog({ onFilter, currentFilters }: InventoryFilterDialogProps) {
  const [filters, setFilters] = useState<FilterState>(currentFilters);

  const toggleOption = (category: keyof FilterState, value: string) => {
    setFilters(prev => ({
      ...prev,
      [category]: prev[category as keyof FilterState]?.includes(value)
        ? prev[category as keyof FilterState]?.filter(v => v !== value) || []
        : [...(prev[category as keyof FilterState] || []), value]
    }));
  };

  const handleReset = () => {
    setFilters({
      rarity: [],
      itemType: [],
      condition: [],
      priceMin: '',
      priceMax: '',
    });
    onFilter({
      rarity: [],
      itemType: [],
      condition: [],
      priceMin: '',
      priceMax: '',
    });
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
          <DialogTitle className="flex items-center justify-between">
            <span>高级筛选</span>
            <Button variant="ghost" size="icon" onClick={handleReset}>
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 稀有度 */}
          <div>
            <h4 className="font-medium mb-3">稀有度</h4>
            <div className="flex flex-wrap gap-2">
              {rarityOptions.map((rarity) => (
                <label
                  key={rarity}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                    filters.rarity.includes(rarity)
                      ? 'bg-primary text-white'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  <Checkbox
                    checked={filters.rarity.includes(rarity)}
                    onCheckedChange={() => toggleOption('rarity', rarity)}
                    className="sr-only"
                  />
                  {rarity}
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
                  key={type}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                    filters.itemType.includes(type)
                      ? 'bg-primary text-white'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  <Checkbox
                    checked={filters.itemType.includes(type)}
                    onCheckedChange={() => toggleOption('itemType', type)}
                    className="sr-only"
                  />
                  {type}
                </label>
              ))}
            </div>
          </div>

          {/* 品相 */}
          <div>
            <h4 className="font-medium mb-3">品相</h4>
            <div className="flex flex-wrap gap-2">
              {conditionOptions.map((condition) => (
                <label
                  key={condition}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                    filters.condition.includes(condition)
                      ? 'bg-primary text-white'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  <Checkbox
                    checked={filters.condition.includes(condition)}
                    onCheckedChange={() => toggleOption('condition', condition)}
                    className="sr-only"
                  />
                  {condition}
                </label>
              ))}
            </div>
          </div>

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
