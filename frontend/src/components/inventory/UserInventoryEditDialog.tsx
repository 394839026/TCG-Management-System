import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { inventoryService, InventoryItem } from '@/services/inventory';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { formatCurrency } from '@/lib/utils';

interface UserInventoryEditDialogProps {
  open: boolean;
  onClose: () => void;
  item: InventoryItem;
}

export function UserInventoryEditDialog({ open, onClose, item }: UserInventoryEditDialogProps) {
  const [quantity, setQuantity] = useState(0);
  const [value, setValue] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open && item) {
      setQuantity(item.userQuantity ?? item.quantity ?? 0);
      setValue(item.userValue ?? item.value ?? 0);
    }
  }, [open, item]);

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const itemId = item._id?.toString() || String(item.id);
      await inventoryService.updateUserInventory(itemId, { quantity, value });
      toast.success('更新成功');
      queryClient.invalidateQueries({ queryKey: ['inventory'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['inventoryStats'] });
      onClose();
    } catch (error: any) {
      const message = error?.response?.data?.message || '更新失败';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setQuantity(item.userQuantity ?? item.quantity);
    setValue(item.userValue ?? item.value);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>编辑库存</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="font-medium">{item.itemName || item.name}</div>
            {item.runeCardInfo?.cardNumber && (
              <div className="text-sm text-muted-foreground">编号: {item.runeCardInfo.cardNumber}</div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">数量</Label>
            <Input
              id="quantity"
              type="number"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="value">单价 ({formatCurrency(1)})</Label>
            <Input
              id="value"
              type="number"
              min="0"
              step="0.01"
              value={value}
              onChange={(e) => setValue(Math.max(0, parseFloat(e.target.value) || 0))}
              className="w-full"
            />
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={handleClose}>
              取消
            </Button>
            <Button className="flex-1" onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? '保存中...' : '保存'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}