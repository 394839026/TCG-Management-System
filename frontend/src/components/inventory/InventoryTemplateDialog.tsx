import { useState, useEffect, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { inventoryService, InventoryItem } from '@/services/inventory'
import { toast } from 'sonner'
import { Image, Trash2, Upload, Link } from 'lucide-react'

interface InventoryTemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item?: InventoryItem | null
}

const GAME_TYPES = [
  { id: 'rune', name: '符文战场', color: 'bg-red-600' },
  { id: 'shadowverse-evolve', name: '影之诗进化对决', color: 'bg-purple-600' },
]

const ITEM_TYPES = [
  { id: 'card', name: '卡牌' },
  { id: 'booster', name: '补充包' },
  { id: 'accessory', name: '周边' },
]

const RUNE_VERSIONS = [
  { id: 'OGN', name: 'OGN' },
  { id: 'SFD', name: 'SFD' },
  { id: 'UNL', name: 'UNL' },
  { id: 'P', name: 'P' },
]

const RUNE_RARITIES = [
  { id: 'N', name: '普通' },
  { id: 'N_FOIL', name: '普通（闪）' },
  { id: 'U', name: '不凡' },
  { id: 'U_FOIL', name: '不凡（闪）' },
  { id: 'R', name: '稀有' },
  { id: 'E', name: '史诗' },
  { id: 'AA', name: '异画' },
  { id: 'AA_SIGN', name: '异画（签字）' },
  { id: 'AA_ULTIMATE', name: '异画（终极超编）' },
]

const CARD_PROPERTIES = [
  { id: '无', name: '无' },
  { id: '传奇', name: '传奇' },
  { id: '英雄', name: '英雄' },
  { id: '专属', name: '专属' },
  { id: '单位', name: '单位' },
  { id: '装备', name: '装备' },
  { id: '法术', name: '法术' },
  { id: '战场', name: '战场' },
  { id: '指示物', name: '指示物' },
  { id: '符文', name: '符文' },
]

export function InventoryTemplateDialog({ open, onOpenChange, item }: InventoryTemplateDialogProps) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    itemName: '',
    gameType: '',
    itemType: '',
    rarity: '',
    condition: '',
    description: '',
    cardProperty: '无',
    runeCardInfo: {
      version: 'OGN',
      cardNumber: '',
    },
  })
  const [currentImage, setCurrentImage] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [imageUrlInput, setImageUrlInput] = useState('')
  const [addingImageUrl, setAddingImageUrl] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open && item) {
      const gameTypeValue = Array.isArray(item.gameType) ? item.gameType[0] : (item.gameType || '')
      setFormData({
        itemName: item.itemName || item.name || '',
        gameType: gameTypeValue,
        itemType: item.itemType || '',
        rarity: item.rarity || '',
        condition: item.condition || '',
        description: item.description || '',
        cardProperty: item.cardProperty || '无',
        runeCardInfo: item.runeCardInfo || {
          version: 'OGN',
          cardNumber: '',
        },
      })
      if (item.images && item.images.length > 0) {
        setCurrentImage(item.images[0])
      } else {
        setCurrentImage(null)
      }
    } else if (open && !item) {
      setFormData({
        itemName: '',
        gameType: '',
        itemType: '',
        rarity: '',
        condition: '',
        description: '',
        cardProperty: '无',
        runeCardInfo: {
          version: 'OGN',
          cardNumber: '',
        },
      })
      setCurrentImage(null)
    }
  }, [item, open])

  const createMutation = useMutation({
    mutationFn: (data: Partial<InventoryItem>) => inventoryService.createTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-templates'] })
      queryClient.invalidateQueries({ queryKey: ['inventoryStats'] })
      toast.success('模板创建成功')
      onOpenChange(false)
    },
    onError: (error: any) => {
      const message = error?.response?.data?.errors?.[0]?.msg || '创建失败'
      toast.error(message)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InventoryItem> }) =>
      inventoryService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-templates'] })
      queryClient.invalidateQueries({ queryKey: ['inventoryStats'] })
      toast.success('模板更新成功')
      onOpenChange(false)
    },
    onError: (error: any) => {
      const message = error?.response?.data?.errors?.[0]?.msg || '更新失败'
      toast.error(message)
    },
  })

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !item?.id) return

    setUploadingImage(true)
    try {
      const result = await inventoryService.uploadImage(String(item.id), file)
      setCurrentImage(result.data.images?.[0] || null)
      queryClient.invalidateQueries({ queryKey: ['inventory-templates'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      toast.success('图片上传成功')
    } catch (error: any) {
      const message = error?.response?.data?.message || '图片上传失败'
      toast.error(message)
    } finally {
      setUploadingImage(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleImageUrlSubmit = async () => {
    if (!imageUrlInput.trim()) {
      toast.error('请输入图片URL')
      return
    }

    if (!item?.id) {
      setCurrentImage(imageUrlInput.trim())
      setImageUrlInput('')
      toast.success('图片URL已设置')
      return
    }

    setAddingImageUrl(true)
    try {
      const result = await inventoryService.addImageByUrl(String(item.id), imageUrlInput.trim())
      setCurrentImage(result.data.images?.[0] || null)
      setImageUrlInput('')
      queryClient.invalidateQueries({ queryKey: ['inventory-templates'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      toast.success('图片添加成功')
    } catch (error: any) {
      const message = error?.response?.data?.message || '图片添加失败'
      toast.error(message)
    } finally {
      setAddingImageUrl(false)
    }
  }

  const handleImageDelete = async () => {
    if (!item?.id || !currentImage) {
      setCurrentImage(null)
      return
    }

    try {
      await inventoryService.deleteImage(String(item.id))
      setCurrentImage(null)
      queryClient.invalidateQueries({ queryKey: ['inventory-templates'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      toast.success('图片已删除')
    } catch (error: any) {
      const message = error?.response?.data?.message || '删除失败'
      toast.error(message)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const submitData: Partial<InventoryItem> = {
      ...formData,
      condition: formData.condition.toLowerCase().replace(' ', '_'),
      runeCardInfo: formData.gameType === 'rune' && formData.itemType === 'card' 
        ? { ...formData.runeCardInfo, version: formData.runeCardInfo.version as any } 
        : undefined,
      cardProperty: formData.gameType === 'rune' && formData.itemType === 'card' 
        ? (formData.cardProperty === '无' ? null : formData.cardProperty)
        : undefined,
      images: !item?.id && currentImage ? [currentImage] : undefined,
    }

    if (formData.gameType !== 'rune') {
      delete submitData.runeCardInfo
      delete submitData.cardProperty
    }

    if (item?.id) {
      updateMutation.mutate({ id: String(item.id), data: submitData })
    } else {
      createMutation.mutate(submitData)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending
  const isRuneCard = formData.gameType === 'rune' && formData.itemType === 'card'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{item ? '编辑模板' : '添加模板'}</DialogTitle>
            <DialogDescription>
              {item ? '修改物品模板信息（不含价格和数量）' : '添加新的物品模板到库存'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="itemName">物品名称</Label>
              <Input
                id="itemName"
                value={formData.itemName}
                onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                placeholder="输入物品名称"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="gameType">游戏类型</Label>
              <div className="flex flex-wrap gap-2">
                {GAME_TYPES.map((game) => (
                  <Button
                    key={game.id}
                    type="button"
                    variant={formData.gameType === game.id ? 'default' : 'outline'}
                    className={`${formData.gameType === game.id ? `${game.color} text-white hover:opacity-90` : ''}`}
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        gameType: prev.gameType === game.id ? '' : game.id,
                        itemType: ''
                      }))
                    }}
                  >
                    {game.name}
                  </Button>
                ))}
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="itemType">物品类型</Label>
              <div className="flex flex-wrap gap-2">
                {ITEM_TYPES.map((type) => (
                  <Button
                    key={type.id}
                    type="button"
                    variant={formData.itemType === type.id ? 'default' : 'outline'}
                    onClick={() => setFormData(prev => ({ ...prev, itemType: type.id }))}
                  >
                    {type.name}
                  </Button>
                ))}
              </div>
            </div>

            {isRuneCard && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="cardNumber">卡牌编号</Label>
                    <Input
                      id="cardNumber"
                      value={formData.runeCardInfo.cardNumber}
                      onChange={(e) => setFormData({
                        ...formData,
                        runeCardInfo: { ...formData.runeCardInfo, cardNumber: e.target.value }
                      })}
                      placeholder="如：001、SR-001"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="version">版本</Label>
                    <Select
                      value={formData.runeCardInfo.version}
                      onValueChange={(value) => setFormData({
                        ...formData,
                        runeCardInfo: { ...formData.runeCardInfo, version: value }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择版本" />
                      </SelectTrigger>
                      <SelectContent>
                        {RUNE_VERSIONS.map((version) => (
                          <SelectItem key={version.id} value={version.id}>
                            {version.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="rarity">稀有度</Label>
                  <Select
                    value={formData.rarity}
                    onValueChange={(value) => setFormData({ ...formData, rarity: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择稀有度" />
                    </SelectTrigger>
                    <SelectContent>
                      {RUNE_RARITIES.map((rarity) => (
                        <SelectItem key={rarity.id} value={rarity.id}>
                          {rarity.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cardProperty">卡牌属性</Label>
                  <Select
                    value={formData.cardProperty}
                    onValueChange={(value) => setFormData({ ...formData, cardProperty: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择卡牌属性" />
                    </SelectTrigger>
                    <SelectContent>
                      {CARD_PROPERTIES.map((property) => (
                        <SelectItem key={property.id} value={property.id}>
                          {property.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {formData.itemType === 'card' && !isRuneCard && (
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="rarity">稀有度</Label>
                  <Select value={formData.rarity} onValueChange={(value) => setFormData({ ...formData, rarity: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择稀有度" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="common">普通 (N)</SelectItem>
                      <SelectItem value="uncommon">非普通 (R)</SelectItem>
                      <SelectItem value="rare">稀有 (SR)</SelectItem>
                      <SelectItem value="super_rare">超稀有 (HR)</SelectItem>
                      <SelectItem value="ultra_rare">极稀有 (UR)</SelectItem>
                      <SelectItem value="secret_rare">秘密稀有 (SEC)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="condition">品相</Label>
                  <Select value={formData.condition} onValueChange={(value) => setFormData({ ...formData, condition: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择品相" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mint">Mint (完美)</SelectItem>
                      <SelectItem value="near_mint">Near Mint (近完美)</SelectItem>
                      <SelectItem value="excellent">Excellent (优秀)</SelectItem>
                      <SelectItem value="good">Good (良好)</SelectItem>
                      <SelectItem value="fair">Fair (一般)</SelectItem>
                      <SelectItem value="poor">Poor (不良)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="description">描述</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="物品描述（可选）"
                rows={3}
              />
            </div>

            <div className="grid gap-2">
              <Label>卡牌图片</Label>
              <div className="border border-dashed rounded-lg p-4">
                {currentImage ? (
                  <div className="relative mb-4">
                    <img
                      src={currentImage}
                      alt={item?.itemName || ''}
                      className="max-h-40 mx-auto rounded-lg object-contain"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute top-2 right-2 bg-white"
                      onClick={handleImageDelete}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground mb-4">
                    <Image className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>暂无图片</p>
                  </div>
                )}

                <Tabs defaultValue="upload" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="upload">
                      <Upload className="w-4 h-4 mr-2" />
                      上传图片
                    </TabsTrigger>
                    <TabsTrigger value="url">
                      <Link className="w-4 h-4 mr-2" />
                      图床链接
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="upload" className="mt-4">
                    {item?.id ? (
                      <div className="text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingImage}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          {uploadingImage ? '上传中...' : '选择文件上传'}
                        </Button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/gif,image/webp"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center">请先创建模板，然后再上传图片</p>
                    )}
                  </TabsContent>

                  <TabsContent value="url" className="mt-4 space-y-3">
                    <div className="flex gap-2">
                      <Input
                        type="url"
                        placeholder="输入图片URL (https://...)"
                        value={imageUrlInput}
                        onChange={(e) => setImageUrlInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleImageUrlSubmit()
                          }
                        }}
                      />
                      <Button
                        variant="outline"
                        onClick={handleImageUrlSubmit}
                        disabled={addingImageUrl || !imageUrlInput.trim()}
                      >
                        {addingImageUrl ? '添加中...' : '添加'}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      支持任意公共图床链接，如：Imgur、Postimages 等
                    </p>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              取消
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? '保存中...' : item ? '更新' : '创建'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
