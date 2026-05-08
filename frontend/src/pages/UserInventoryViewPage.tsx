import { useState, useMemo, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { 
  Search, Grid3X3, List, ArrowLeft, Eye, Lock, AlertCircle, CheckCircle,
  User, Package, Coins, Calendar
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import { 
  inventoryViewRequestService, 
  userInventoryService,
  type InventoryViewRequest
} from '@/services/api'
import { InventoryViewRequestDialog } from '@/components/inventory/InventoryViewRequestDialog'

interface FilterState {
  rarity: string[];
  itemType: string[];
  priceMin: string;
  priceMax: string;
  version: string;
  cardProperty: string[];
}

const ITEM_TYPE_MAP: Record<string, string> = {
  'card': '卡牌',
  '卡牌': '卡牌',
  'booster': '补充包',
  '补充包': '补充包',
  'accessory': '周边',
  '周边': '周边',
}

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
  'super_rare': '超级稀有',
  'ultra_rare': '超稀有',
  'secret_rare': '秘稀有',
}

const getRarityDisplay = (rarity: string) => RARITY_MAP[rarity] || rarity
const getItemTypeDisplay = (type: string) => ITEM_TYPE_MAP[type] || type

export function UserInventoryViewPage() {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchTerm, setSearchTerm] = useState('')
  const [showZeroQuantity, setShowZeroQuantity] = useState(false)
  const [requestDialogOpen, setRequestDialogOpen] = useState(false)

  // 检查权限
  const { data: permissionData, isLoading: isLoadingPermission } = useQuery({
    queryKey: ['inventoryViewPermission', userId],
    queryFn: () => userId ? inventoryViewRequestService.getPermission(userId) : Promise.resolve(null),
    enabled: !!userId
  })

  // 获取用户库存
  const { data: inventoryData, isLoading: isLoadingInventory } = useQuery({
    queryKey: ['userInventoryView', userId],
    queryFn: () => userId ? userInventoryService.getUserInventory(userId) : Promise.resolve(null),
    enabled: !!userId && permissionData?.canView
  })

  // 检查当前状态
  const isOwn = permissionData?.isOwn
  const canView = permissionData?.canView
  const currentPermission = permissionData?.permission as InventoryViewRequest | null

  // 筛选搜索
  const filteredItems = useMemo(() => {
    if (!inventoryData?.data) return []
    
    let items = [...inventoryData.data]
    
    // 搜索过滤
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      items = items.filter(item => 
        item.itemName?.toLowerCase().includes(term) ||
        item.itemCode?.toLowerCase().includes(term)
      )
    }
    
    // 数量过滤
    if (!showZeroQuantity) {
      items = items.filter(item => item.userQuantity > 0)
    }
    
    return items
  }, [inventoryData, searchTerm, showZeroQuantity])

  // 渲染无权限状态
  const renderNoPermission = () => (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Lock className="w-16 h-16 text-gray-400 mb-4" />
      <h3 className="text-xl font-semibold mb-2">无查看权限</h3>
      <p className="text-gray-500 mb-6 max-w-md">
        {currentPermission?.status === 'pending' 
          ? '您的申请正在等待对方接受' 
          : currentPermission?.status === 'rejected'
          ? '您的申请已被拒绝，请稍后再试'
          : currentPermission?.status === 'expired'
          ? '权限已过期，请重新申请'
          : '您需要先获得查看权限'
        }
      </p>
      
      {currentPermission && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            {currentPermission.status === 'pending' && <AlertCircle className="w-5 h-5 text-yellow-500" />}
            {currentPermission.status === 'accepted' && <CheckCircle className="w-5 h-5 text-green-500" />}
            {currentPermission.status === 'rejected' && <AlertCircle className="w-5 h-5 text-red-500" />}
            {currentPermission.status === 'expired' && <AlertCircle className="w-5 h-5 text-gray-500" />}
            <span className="font-medium">
              当前状态: {
                currentPermission.status === 'pending' ? '待处理' :
                currentPermission.status === 'accepted' ? '已接受' :
                currentPermission.status === 'rejected' ? '已拒绝' :
                currentPermission.status === 'expired' ? '已过期' :
                currentPermission.status
              }
            </span>
          </div>
          {currentPermission.message && (
            <p className="text-sm text-gray-600">留言: {currentPermission.message}</p>
          )}
          {currentPermission.expiresAt && (
            <p className="text-sm text-gray-600">
              过期时间: {new Date(currentPermission.expiresAt).toLocaleString('zh-CN')}
            </p>
          )}
        </div>
      )}
      
      <Button onClick={() => setRequestDialogOpen(true)}>
        <Eye className="w-4 h-4 mr-2" />
        申请查看权限
      </Button>
    </div>
  )

  // 渲染网格视图
  const renderGridView = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {filteredItems.map((item: any) => (
        <Card key={item._id} className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-medium truncate">{item.itemName}</h4>
                  {item.itemCode && (
                    <p className="text-sm text-gray-500">{item.itemCode}</p>
                  )}
                </div>
                <Badge variant="outline">
                  {item.userQuantity}
                </Badge>
              </div>
              
              <div className="flex flex-wrap gap-1">
                {item.rarity && (
                  <Badge variant="outline" className="text-xs">
                    {getRarityDisplay(item.rarity)}
                  </Badge>
                )}
                {item.itemType && (
                  <Badge variant="outline" className="text-xs">
                    {getItemTypeDisplay(item.itemType)}
                  </Badge>
                )}
              </div>
              
              {item.userValue > 0 && (
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <Coins className="w-4 h-4" />
                  {formatCurrency(item.userValue * item.userQuantity)}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )

  // 渲染列表视图
  const renderListView = () => (
    <div className="space-y-2">
      {filteredItems.map((item: any) => (
        <Card key={item._id}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h4 className="font-medium truncate">{item.itemName}</h4>
                {item.itemCode && (
                  <p className="text-sm text-gray-500">{item.itemCode}</p>
                )}
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex flex-wrap gap-1">
                  {item.rarity && (
                    <Badge variant="outline" className="text-xs">
                      {getRarityDisplay(item.rarity)}
                    </Badge>
                  )}
                  {item.itemType && (
                    <Badge variant="outline" className="text-xs">
                      {getItemTypeDisplay(item.itemType)}
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center gap-2 text-right">
                  <Badge variant="outline">
                    {item.userQuantity}
                  </Badge>
                  {item.userValue > 0 && (
                    <span className="text-sm text-gray-600">
                      {formatCurrency(item.userValue * item.userQuantity)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )

  // 渲染加载状态
  const renderLoading = () => (
    <div className="flex items-center justify-center py-16">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-gray-500">加载中...</p>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* 头部导航 */}
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            {isOwn ? '我的库存' : 
             inventoryData?.owner ? `${inventoryData.owner.username}的库存` : 
             '用户库存'}
          </h1>
          {!isOwn && canView && (
            <p className="text-gray-500">您有查看权限</p>
          )}
        </div>
      </div>

      {/* 权限检查加载中 */}
      {isLoadingPermission && renderLoading()}

      {/* 无权限状态 */}
      {!isLoadingPermission && !isOwn && !canView && renderNoPermission()}

      {/* 有权限时的内容 */}
      {(isOwn || canView) && !isLoadingPermission && (
        <>
          {/* 统计卡片 */}
          {inventoryData?.stats && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Package className="w-8 h-8 text-blue-500" />
                    <div>
                      <p className="text-sm text-gray-500">物品种类</p>
                      <p className="text-2xl font-bold">{inventoryData.stats.totalItems}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <User className="w-8 h-8 text-green-500" />
                    <div>
                      <p className="text-sm text-gray-500">物品总数</p>
                      <p className="text-2xl font-bold">{inventoryData.stats.totalQuantity}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Coins className="w-8 h-8 text-yellow-500" />
                    <div>
                      <p className="text-sm text-gray-500">总价值</p>
                      <p className="text-2xl font-bold">{formatCurrency(inventoryData.stats.totalValue)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 权限过期提醒 */}
          {!isOwn && currentPermission?.expiresAt && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="p-4 flex items-center gap-3">
                <Calendar className="w-5 h-5 text-yellow-600" />
                <p className="text-yellow-800">
                  权限将在 {new Date(currentPermission.expiresAt).toLocaleString('zh-CN')} 过期
                </p>
              </CardContent>
            </Card>
          )}

          {/* 工具栏 */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="搜索物品..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className={viewMode === 'grid' ? 'bg-gray-100' : ''}
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className={viewMode === 'list' ? 'bg-gray-100' : ''}
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <Button
              variant="outline"
              onClick={() => setShowZeroQuantity(!showZeroQuantity)}
            >
              {showZeroQuantity ? '隐藏无库存' : '显示全部'}
            </Button>
          </div>

          {/* 库存加载中 */}
          {isLoadingInventory && renderLoading()}

          {/* 物品列表 */}
          {!isLoadingInventory && (
            <div>
              {filteredItems.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>{searchTerm ? '未找到匹配的物品' : '暂无库存物品'}</p>
                </div>
              ) : (
                <div className="mb-4 text-sm text-gray-500">
                  共 {filteredItems.length} 个物品
                </div>
              )}
              
              {viewMode === 'grid' ? renderGridView() : renderListView()}
            </div>
          )}
        </>
      )}

      {/* 申请对话框 */}
      <InventoryViewRequestDialog
        open={requestDialogOpen}
        onOpenChange={setRequestDialogOpen}
        userId={userId}
        onSuccess={() => {
          // 重新获取权限数据
        }}
      />
    </div>
  )
}
