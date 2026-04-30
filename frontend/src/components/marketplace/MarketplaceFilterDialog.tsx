import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Filter, X } from 'lucide-react';

interface FilterState {
  types: ('sell' | 'buy' | 'trade')[];
  priceMin: string;
  priceMax: string;
}

interface MarketplaceFilterDialogProps {
  onFilter: (filters: FilterState) => void;
  currentFilters: FilterState;
}

const typeOptions = [
  { value: 'sell' as const, label: '出售' },
  { value: 'buy' as const, label: '求购' },
  { value: 'trade' as const, label: '交换' },
];

export function MarketplaceFilterDialog({ onFilter, currentFilters }: MarketplaceFilterDialogProps) {
  const [filters, setFilters] = useState<FilterState>(currentFilters);
  const [open, setOpen] = useState(false);

  // 当外部筛选条件变化时更新内部状态
  useEffect(() => {
    setFilters(currentFilters);
  }, [currentFilters]);

  const toggleType = (type: 'sell' | 'buy' | 'trade') => {
    setFilters(prev => ({
      ...prev,
      types: prev.types.includes(type)
        ? prev.types.filter(t => t !== type)
        : [...prev.types, type]
    }));
  };

  const handleReset = () => {
    const emptyFilters = {
      types: [],
      priceMin: '',
      priceMax: '',
    };
    setFilters(emptyFilters);
    onFilter(emptyFilters);
    setOpen(false);
  };

  const handleApply = () => {
    onFilter(filters);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
          {/* 交易类型 */}
          <div>
            <h4 className="font-medium mb-3">交易类型</h4>
            <div className="flex flex-wrap gap-2">
              {typeOptions.map((type) => (
                <label
                  key={type.value}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-colors ${
                    filters.types.includes(type.value)
                      ? 'bg-primary text-white'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  <Checkbox
                    checked={filters.types.includes(type.value)}
                    onChange={() => toggleType(type.value)}
                    className="sr-only"
                  />
                  {type.label}
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
