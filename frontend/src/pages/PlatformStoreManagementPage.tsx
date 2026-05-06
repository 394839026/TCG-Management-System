import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { platformStoreService, PlatformStoreItem } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { ShoppingCart, Plus, Edit, Trash2, Package, Star, Coins, Shield, Sparkles, Gift, Timer } from 'lucide-react'

// 工具函数：日期格式化
const formatDate = (dateString?: string) => {
  if (!dateString) return null
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 获取商品类型对应的图标
const getItemIcon = (itemType: string) => {
  switch (itemType) {
    case 'inventory_item': return Package
    case 'points': return Sparkles
    case 'exp': return Star
    case 'badge': return Shield
    case 'title': return Gift
    default: return Package
  }
}

// 获取支付方式对应的图标
const getCurrencyIcon = (currencyType: string) => {
  switch (currencyType) {
    case 'points': return Star
    case 'coins': return Coins
    default: return Star
  }
}

// 获取商品类型对应的文本
const getItemTypeText = (itemType: string) => {
  switch (itemType) {
    case 'inventory_item': return '物品'
    case 'points': return '积分'
    case 'exp': return '经验'
    case 'badge': return '徽章'
    case 'title': return '称号'
    default: return '其他'
  }
}

// 获取支付方式对应的文本
const getCurrencyText = (currencyType: string) => {
  switch (currencyType) {
    case 'points': return '积分'
    case 'coins': return '金币'
    default: return '积分'
  }
}

export function PlatformStoreManagementPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [selectedItem, setSelectedItem] = useState<PlatformStoreItem | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editFormData, setEditFormData] = useState<Partial<PlatformStoreItem>>({})
  const [createFormData, setCreateFormData] = useState<Partial<PlatformStoreItem>>({})

  // 获取所有商品
  const { data: storeItemsData, isLoading } = useQuery({
    queryKey: ['platformStoreAdminItems'],
    queryFn: platformStoreService.getAllStoreItemsAdmin,
  })

  // 创建商品
  const createMutation = useMutation({
    mutationFn: (data: Partial<PlatformStoreItem>) =>
      platformStoreService.createStoreItem(data),
    onSuccess: () => {
      toast.success('创建成功！')
      setShowCreateDialog(false)
      setCreateFormData({})
      queryClient.invalidateQueries({ queryKey: ['platformStoreAdminItems'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || '创建失败')
    },
  })

  // 更新商品
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PlatformStoreItem> }) =>
      platformStoreService.updateStoreItem(id, data),
    onSuccess: () => {
      toast.success('更新成功！')
      setShowEditDialog(false)
      setEditFormData({})
      queryClient.invalidateQueries({ queryKey: ['platformStoreAdminItems'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || '更新失败')
    },
  })

  // 删除商品
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      platformStoreService.deleteStoreItem(id),
    onSuccess: () => {
      toast.success('删除成功！')
      queryClient.invalidateQueries({ queryKey: ['platformStoreAdminItems'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || '删除失败')
    },
  })

  // 处理创建
  const handleCreate = () => {
    createMutation.mutate({
      ...createFormData,
      isActive: true,
      stock: createFormData.stock || -1,
      limitPerUser: createFormData.limitPerUser || -1,
      sortOrder: createFormData.sortOrder || 0,
    })
  }

  // 处理更新
  const handleUpdate = () => {
    if (selectedItem) {
      updateMutation.mutate({ id: selectedItem._id, data: editFormData })
    }
  }

  // 处理删除
  const handleDelete = (id: string) => {
    if (window.confirm('确定要删除这个商品吗？')) {
      deleteMutation.mutate(id)
    }
  }

  // 显示编辑对话框
  const handleShowEdit = (item: PlatformStoreItem) => {
    setSelectedItem(item)
    setEditFormData(item)
    setShowEditDialog(true)
  }

  const storeItems: PlatformStoreItem[] = storeItemsData?.data || []

  // 统计信息
  const stats = {
    total: storeItems.length,
    active: storeItems.filter(i => i.isActive).length,
    outOfStock: storeItems.filter(i => i.stock > 0 && i.redeemedCount >= i.stock).length,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ShoppingCart className="w-8 h-8 text-primary" />
            智库兑换窗口管理
          </h1>
          <p className="text-muted-foreground mt-1">
            管理智库兑换窗口的所有商品
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          添加商品
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">商品总数</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">上架中</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{stats.active}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">已售罄</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">{stats.outOfStock}</p>
          </CardContent>
        </Card>
      </div>

      {/* 商品列表 */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : storeItems.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">暂无商品</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {storeItems.map((item) => {
            const Icon = getItemIcon(item.itemType)
            const CurrencyIcon = getCurrencyIcon(item.currencyType)
            return (
              <Card key={item._id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Icon className="w-5 h-5 text-primary" />
                        <CardTitle className="text-lg">{item.itemName}</CardTitle>
                        {!item.isActive && (
                          <Badge variant="outline" className="text-red-500 border-red-200">
                            已下架
                          </Badge>
                        )}
                        {item.stock > 0 && item.redeemedCount >= item.stock && (
                          <Badge variant="outline" className="text-orange-500 border-orange-200">
                            已售罄
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="mt-1">
                        {getItemTypeText(item.itemType)} | {item.price} {getCurrencyText(item.currencyType)}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleShowEdit(item)}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        编辑
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(item._id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        删除
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {item.description && (
                  <CardContent className="pb-2">
                    <p className="text-muted-foreground text-sm">{item.description}</p>
                  </CardContent>
                )}
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">库存:</span>
                      <span className="ml-1 font-medium">
                        {item.stock === -1 ? '无限' : `${item.redeemedCount}/${item.stock}`}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">兑换获得:</span>
                      <span className="ml-1 font-medium">×{item.itemQuantity}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">已兑换:</span>
                      <span className="ml-1 font-medium">{item.redeemedCount} 次</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">排序:</span>
                      <span className="ml-1 font-medium">{item.sortOrder}</span>
                    </div>
                    {item.limitPerUser > 0 && (
                      <div>
                        <span className="text-muted-foreground">限购:</span>
                        <span className="ml-1 font-medium">每人 {item.limitPerUser}</span>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mt-2">
                    {item.validFrom && (
                      <div>
                        <span className="text-muted-foreground">开始:</span>
                        <span className="ml-1 font-medium">{formatDate(item.validFrom)}</span>
                      </div>
                    )}
                    {item.validUntil && (
                      <div>
                        <span className="text-muted-foreground">结束:</span>
                        <span className="ml-1 font-medium">{formatDate(item.validUntil)}</span>
                      </div>
                    )}
                    {item.tags?.length > 0 && (
                      <div>
                        <span className="text-muted-foreground">标签:</span>
                        <span className="ml-1">{item.tags.join(', ')}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* 创建商品对话框 */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>添加商品</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="createName">商品名称 *</Label>
              <Input
                id="createName"
                value={createFormData.itemName || ''}
                onChange={(e) => setCreateFormData({ ...createFormData, itemName: e.target.value })}
                placeholder="输入商品名称"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="createDescription">描述</Label>
              <Textarea
                id="createDescription"
                value={createFormData.description || ''}
                onChange={(e) => setCreateFormData({ ...createFormData, description: e.target.value })}
                placeholder="商品描述"
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="createImage">图片 URL</Label>
              <Input
                id="createImage"
                value={createFormData.image || ''}
                onChange={(e) => setCreateFormData({ ...createFormData, image: e.target.value })}
                placeholder="图片链接"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="createType">商品类型</Label>
                <Select
                  value={createFormData.itemType || 'inventory_item'}
                  onValueChange={(value) => setCreateFormData({ ...createFormData, itemType: value as any })}
                >
                  <SelectTrigger id="createType">
                    <SelectValue placeholder="选择类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inventory_item">物品</SelectItem>
                    <SelectItem value="points">积分</SelectItem>
                    <SelectItem value="exp">经验</SelectItem>
                    <SelectItem value="badge">徽章</SelectItem>
                    <SelectItem value="title">称号</SelectItem>
                    <SelectItem value="other">其他</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="createCurrency">支付方式</Label>
                <Select
                  value={createFormData.currencyType || 'points'}
                  onValueChange={(value) => setCreateFormData({ ...createFormData, currencyType: value as any })}
                >
                  <SelectTrigger id="createCurrency">
                    <SelectValue placeholder="选择支付方式" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="points">积分</SelectItem>
                    <SelectItem value="coins">金币</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="createPrice">价格 *</Label>
                <Input
                  id="createPrice"
                  type="number"
                  min="0"
                  value={createFormData.price || ''}
                  onChange={(e) => setCreateFormData({ ...createFormData, price: Number(e.target.value) })}
                  placeholder="价格"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="createStock">库存 (-1为无限)</Label>
                <Input
                  id="createStock"
                  type="number"
                  min="-1"
                  value={createFormData.stock || ''}
                  onChange={(e) => setCreateFormData({ ...createFormData, stock: Number(e.target.value) })}
                  placeholder="库存"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="createItemQuantity">兑换获得的数量</Label>
                <Input
                  id="createItemQuantity"
                  type="number"
                  min="1"
                  value={createFormData.itemQuantity || 1}
                  onChange={(e) => setCreateFormData({ ...createFormData, itemQuantity: Number(e.target.value) })}
                  placeholder="1"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="createLimit">每人限购 (-1为不限)</Label>
                <Input
                  id="createLimit"
                  type="number"
                  min="-1"
                  value={createFormData.limitPerUser || ''}
                  onChange={(e) => setCreateFormData({ ...createFormData, limitPerUser: Number(e.target.value) })}
                  placeholder="限购数量"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="createSort">排序权重</Label>
                <Input
                  id="createSort"
                  type="number"
                  min="0"
                  value={createFormData.sortOrder || ''}
                  onChange={(e) => setCreateFormData({ ...createFormData, sortOrder: Number(e.target.value) })}
                  placeholder="排序权重"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="createValidFrom">有效期开始</Label>
                <Input
                  id="createValidFrom"
                  type="datetime-local"
                  value={createFormData.validFrom?.slice(0, 16) || ''}
                  onChange={(e) => setCreateFormData({ ...createFormData, validFrom: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="createValidUntil">有效期结束</Label>
                <Input
                  id="createValidUntil"
                  type="datetime-local"
                  value={createFormData.validUntil?.slice(0, 16) || ''}
                  onChange={(e) => setCreateFormData({ ...createFormData, validUntil: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="createTags">标签 (逗号分隔)</Label>
              <Input
                id="createTags"
                value={createFormData.tags?.join(', ') || ''}
                onChange={(e) => setCreateFormData({ ...createFormData, tags: e.target.value.split(/[,，]\s*/).filter(Boolean) })}
                placeholder="标签1, 标签2, 标签3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              取消
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!createFormData.itemName || !createFormData.price || createMutation.isPending}
            >
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑商品对话框 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedItem && (
            <>
              <DialogHeader>
                <DialogTitle>编辑商品</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="editName">商品名称 *</Label>
                  <Input
                    id="editName"
                    value={editFormData.itemName || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, itemName: e.target.value })}
                    placeholder="输入商品名称"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="editDescription">描述</Label>
                  <Textarea
                    id="editDescription"
                    value={editFormData.description || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                    placeholder="商品描述"
                    rows={3}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="editImage">图片 URL</Label>
                  <Input
                    id="editImage"
                    value={editFormData.image || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, image: e.target.value })}
                    placeholder="图片链接"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="editType">商品类型</Label>
                    <Select
                      value={editFormData.itemType || 'inventory_item'}
                      onValueChange={(value) => setEditFormData({ ...editFormData, itemType: value as any })}
                    >
                      <SelectTrigger id="editType">
                        <SelectValue placeholder="选择类型" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="inventory_item">物品</SelectItem>
                        <SelectItem value="points">积分</SelectItem>
                        <SelectItem value="exp">经验</SelectItem>
                        <SelectItem value="badge">徽章</SelectItem>
                        <SelectItem value="title">称号</SelectItem>
                        <SelectItem value="other">其他</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="editCurrency">支付方式</Label>
                    <Select
                      value={editFormData.currencyType || 'points'}
                      onValueChange={(value) => setEditFormData({ ...editFormData, currencyType: value as any })}
                    >
                      <SelectTrigger id="editCurrency">
                        <SelectValue placeholder="选择支付方式" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="points">积分</SelectItem>
                        <SelectItem value="coins">金币</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="editPrice">价格 *</Label>
                    <Input
                      id="editPrice"
                      type="number"
                      min="0"
                      value={editFormData.price || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, price: Number(e.target.value) })}
                      placeholder="价格"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="editStock">库存 (-1为无限)</Label>
                    <Input
                      id="editStock"
                      type="number"
                      min="-1"
                      value={editFormData.stock || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, stock: Number(e.target.value) })}
                      placeholder="库存"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="editItemQuantity">兑换获得的数量</Label>
                    <Input
                      id="editItemQuantity"
                      type="number"
                      min="1"
                      value={editFormData.itemQuantity || 1}
                      onChange={(e) => setEditFormData({ ...editFormData, itemQuantity: Number(e.target.value) })}
                      placeholder="1"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="editLimit">每人限购 (-1为不限)</Label>
                    <Input
                      id="editLimit"
                      type="number"
                      min="-1"
                      value={editFormData.limitPerUser || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, limitPerUser: Number(e.target.value) })}
                      placeholder="限购数量"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="editSort">排序权重</Label>
                    <Input
                      id="editSort"
                      type="number"
                      min="0"
                      value={editFormData.sortOrder || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, sortOrder: Number(e.target.value) })}
                      placeholder="排序权重"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="editValidFrom">有效期开始</Label>
                    <Input
                      id="editValidFrom"
                      type="datetime-local"
                      value={editFormData.validFrom?.slice(0, 16) || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, validFrom: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="editValidUntil">有效期结束</Label>
                    <Input
                      id="editValidUntil"
                      type="datetime-local"
                      value={editFormData.validUntil?.slice(0, 16) || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, validUntil: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="editTags">标签 (逗号分隔)</Label>
                  <Input
                    id="editTags"
                    value={editFormData.tags?.join(', ') || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, tags: e.target.value.split(/[,，]\s*/).filter(Boolean) })}
                    placeholder="标签1, 标签2, 标签3"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="editActive"
                    checked={editFormData.isActive ?? true}
                    onCheckedChange={(checked) => setEditFormData({ ...editFormData, isActive: checked })}
                  />
                  <Label htmlFor="editActive">上架状态</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                  取消
                </Button>
                <Button
                  onClick={handleUpdate}
                  disabled={!editFormData.itemName || !editFormData.price || updateMutation.isPending}
                >
                  更新
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
