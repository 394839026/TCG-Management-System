import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { shopService, Shop, ShopType } from '@/services/api'
import { toast } from 'sonner'

const getShopTypeLabel = (type: ShopType) => {
  const labels = {
    physical: '真实店铺',
    online: '线上店铺',
    virtual: '虚拟店铺'
  }
  return labels[type]
}

const getShopTypeDescription = (type: ShopType) => {
  const descriptions = {
    physical: '有实体地址和营业时间的真实店铺',
    online: '线上店铺，不需要地址和营业时间',
    virtual: '虚拟店铺，有特殊用途'
  }
  return descriptions[type]
}

interface ShopFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  shop?: Shop | null
}

export function ShopFormDialog({ open, onOpenChange, shop }: ShopFormDialogProps) {
  const queryClient = useQueryClient()
  const [shopType, setShopType] = useState<ShopType>('physical')
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    logo: '',
    coverImage: '',
    location: {
      address: '',
      city: '',
      province: '',
      postalCode: ''
    },
    contactInfo: {
      phone: '',
      email: '',
      website: '',
      socialMedia: {
        wechat: '',
        qq: ''
      }
    },
    businessHours: {
      openTime: '09:00',
      closeTime: '21:00',
      workdays: [] as string[]
    }
  })

  useEffect(() => {
    if (shop) {
      setShopType(shop.type || 'physical')
      setFormData({
        name: shop.name || '',
        description: shop.description || '',
        logo: shop.logo || '',
        coverImage: shop.coverImage || '',
        location: {
          address: shop.location?.address || '',
          city: shop.location?.city || '',
          province: shop.location?.province || '',
          postalCode: shop.location?.postalCode || ''
        },
        contactInfo: {
          phone: shop.contactInfo?.phone || '',
          email: shop.contactInfo?.email || '',
          website: shop.contactInfo?.website || '',
          socialMedia: {
            wechat: shop.contactInfo?.socialMedia?.wechat || '',
            qq: shop.contactInfo?.socialMedia?.qq || ''
          }
        },
        businessHours: {
          openTime: shop.businessHours?.openTime || '09:00',
          closeTime: shop.businessHours?.closeTime || '21:00',
          workdays: shop.businessHours?.workdays || []
        }
      })
    } else {
      setShopType('physical')
      setFormData({
        name: '',
        description: '',
        logo: '',
        coverImage: '',
        location: {
          address: '',
          city: '',
          province: '',
          postalCode: ''
        },
        contactInfo: {
          phone: '',
          email: '',
          website: '',
          socialMedia: {
            wechat: '',
            qq: ''
          }
        },
        businessHours: {
          openTime: '09:00',
          closeTime: '21:00',
          workdays: []
        }
      })
    }
  }, [shop, open])

  const createMutation = useMutation({
    mutationFn: (data: any) => shopService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shops'] })
      toast.success('店铺创建成功')
      onOpenChange(false)
    },
    onError: () => {
      toast.error('创建失败')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => shopService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shops'] })
      toast.success('店铺更新成功')
      onOpenChange(false)
    },
    onError: () => {
      toast.error('更新失败')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const submitData = {
      ...formData,
      type: shopType
    }
    if (shop?._id) {
      updateMutation.mutate({ id: shop._id, data: submitData })
    } else {
      createMutation.mutate(submitData)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{shop ? '编辑店铺' : '创建店铺'}</DialogTitle>
            <DialogDescription>
              {shop ? '修改店铺信息' : '创建新的卡牌店铺'}
            </DialogDescription>
          </DialogHeader>
          
          {/* 店铺类型选择 */}
          <div className="grid gap-4 mt-4">
            <div className="grid gap-2">
              <Label htmlFor="shop-type">店铺类型</Label>
              <Select value={shopType} onValueChange={(val) => setShopType(val as ShopType)}>
                <SelectTrigger id="shop-type">
                  <SelectValue placeholder="选择店铺类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="physical">真实店铺</SelectItem>
                  <SelectItem value="online">线上店铺</SelectItem>
                  <SelectItem value="virtual">虚拟店铺</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {getShopTypeDescription(shopType)}
              </p>
            </div>
          </div>
          
          <Tabs defaultValue="basic" className="mt-4">
            <TabsList className={`grid ${shopType === 'physical' ? 'grid-cols-3' : shopType === 'online' ? 'grid-cols-1' : 'grid-cols-2'}`}>
              <TabsTrigger value="basic">基本信息</TabsTrigger>
              {shopType !== 'online' && <TabsTrigger value="contact">联系信息</TabsTrigger>}
              {shopType === 'physical' && <TabsTrigger value="hours">营业时间</TabsTrigger>}
            </TabsList>
            
            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid gap-2">
                <Label htmlFor="name">店铺名称 *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="输入店铺名称"
                  required
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="description">描述</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="店铺描述"
                  rows={3}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="logo">Logo URL</Label>
                <Input
                  id="logo"
                  value={formData.logo}
                  onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
                  placeholder="Logo URL (可选)"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="coverImage">封面图 URL</Label>
                <Input
                  id="coverImage"
                  value={formData.coverImage}
                  onChange={(e) => setFormData({ ...formData, coverImage: e.target.value })}
                  placeholder="封面图 URL (可选)"
                />
              </div>
              
              {/* 地址信息只在真实店铺和虚拟店铺显示 */}
              {shopType !== 'online' && (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="address">地址</Label>
                    <Input
                      id="address"
                      value={formData.location.address}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        location: { ...formData.location, address: e.target.value } 
                      })}
                      placeholder="详细地址"
                    />
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <div className="grid gap-2">
                      <Label htmlFor="city">城市</Label>
                      <Input
                        id="city"
                        value={formData.location.city}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          location: { ...formData.location, city: e.target.value } 
                        })}
                        placeholder="城市"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="province">省份</Label>
                      <Input
                        id="province"
                        value={formData.location.province}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          location: { ...formData.location, province: e.target.value } 
                        })}
                        placeholder="省份"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="postalCode">邮编</Label>
                      <Input
                        id="postalCode"
                        value={formData.location.postalCode}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          location: { ...formData.location, postalCode: e.target.value } 
                        })}
                        placeholder="邮编"
                      />
                    </div>
                  </div>
                </>
              )}
            </TabsContent>
            
            <TabsContent value="contact" className="space-y-4 mt-4">
              <div className="grid gap-2">
                <Label htmlFor="phone">电话</Label>
                <Input
                  id="phone"
                  value={formData.contactInfo.phone}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    contactInfo: { ...formData.contactInfo, phone: e.target.value } 
                  })}
                  placeholder="联系电话"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="email">邮箱</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.contactInfo.email}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    contactInfo: { ...formData.contactInfo, email: e.target.value } 
                  })}
                  placeholder="邮箱地址"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="website">网站</Label>
                <Input
                  id="website"
                  value={formData.contactInfo.website}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    contactInfo: { ...formData.contactInfo, website: e.target.value } 
                  })}
                  placeholder="网站地址"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="wechat">微信</Label>
                <Input
                  id="wechat"
                  value={formData.contactInfo.socialMedia.wechat}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    contactInfo: { 
                      ...formData.contactInfo, 
                      socialMedia: { ...formData.contactInfo.socialMedia, wechat: e.target.value } 
                    } 
                  })}
                  placeholder="微信号"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="qq">QQ</Label>
                <Input
                  id="qq"
                  value={formData.contactInfo.socialMedia.qq}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    contactInfo: { 
                      ...formData.contactInfo, 
                      socialMedia: { ...formData.contactInfo.socialMedia, qq: e.target.value } 
                    } 
                  })}
                  placeholder="QQ号"
                />
              </div>
            </TabsContent>
            
            <TabsContent value="hours" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="openTime">开门时间</Label>
                  <Input
                    id="openTime"
                    value={formData.businessHours.openTime}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      businessHours: { ...formData.businessHours, openTime: e.target.value } 
                    })}
                    placeholder="例如: 09:00"
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="closeTime">关门时间</Label>
                  <Input
                    id="closeTime"
                    value={formData.businessHours.closeTime}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      businessHours: { ...formData.businessHours, closeTime: e.target.value } 
                    })}
                    placeholder="例如: 21:00"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
          
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              取消
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? '保存中...' : shop ? '更新' : '创建'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
