import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { gachaProbabilityService, GachaProbabilityConfig, RarityProbability } from '@/services/api'
import { Settings, Plus, Edit, Trash2, CheckCircle2, RefreshCw, Play, TestTube2, Dices, Save, X } from 'lucide-react'

// 默认的稀有度配置
const DEFAULT_RARITIES: RarityProbability[] = [
  { rarityId: 'N', rarityName: '普通', probability: 0.5, color: 'text-gray-600', bgColor: 'bg-gray-100', borderColor: 'border-gray-300', glowColor: '' },
  { rarityId: 'N_FOIL', rarityName: '普通（闪）', probability: 0.05, color: 'text-gray-600', bgColor: 'bg-gray-100', borderColor: 'border-gray-300', glowColor: 'shadow-gray-400/50' },
  { rarityId: 'U', rarityName: '不凡', probability: 0.25, color: 'text-blue-600', bgColor: 'bg-blue-100', borderColor: 'border-blue-400', glowColor: '' },
  { rarityId: 'U_FOIL', rarityName: '不凡（闪）', probability: 0.03, color: 'text-blue-600', bgColor: 'bg-blue-100', borderColor: 'border-blue-400', glowColor: 'shadow-blue-400/50' },
  { rarityId: 'R', rarityName: '稀有', probability: 0.1, color: 'text-purple-600', bgColor: 'bg-purple-100', borderColor: 'border-purple-400', glowColor: 'shadow-purple-400/30' },
  { rarityId: 'E', rarityName: '史诗', probability: 0.05, color: 'text-yellow-600', bgColor: 'bg-yellow-100', borderColor: 'border-yellow-400', glowColor: 'shadow-yellow-400/40' },
  { rarityId: 'AA', rarityName: '异画', probability: 0.015, color: 'text-red-600', bgColor: 'bg-red-100', borderColor: 'border-red-400', glowColor: 'shadow-red-400/50' },
  { rarityId: 'AA_SIGN', rarityName: '异画（签字）', probability: 0.003, color: 'text-red-600', bgColor: 'bg-red-100', borderColor: 'border-red-400', glowColor: 'shadow-red-500/60' },
  { rarityId: 'AA_ULTIMATE', rarityName: '异画（终极超编）', probability: 0.002, color: 'text-red-600', bgColor: 'bg-red-100', borderColor: 'border-red-400', glowColor: 'shadow-red-500/70' },
];

// 默认配置对象
const DEFAULT_CONFIG: GachaProbabilityConfig = {
  _id: 'default',
  name: '默认配置',
  description: '系统默认抽卡概率配置',
  rarities: DEFAULT_RARITIES,
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// 测试结果类型
interface TestResult {
  rarityId: string
  rarityName: string
  count: number
  percentage: number
  expectedPercentage: number
  difference: number
}

export function GachaProbabilityManager() {
  const queryClient = useQueryClient()
  
  const [selectedConfig, setSelectedConfig] = useState<GachaProbabilityConfig | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isSimulateDialogOpen, setIsSimulateDialogOpen] = useState(false)
  const [editFormData, setEditFormData] = useState<Partial<GachaProbabilityConfig>>({})
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [testDrawCount, setTestDrawCount] = useState(1000)
  const [isSimulating, setIsSimulating] = useState(false)

  // 获取所有配置
  const { data: configsData, isLoading: isLoadingConfigs } = useQuery({
    queryKey: ['gachaProbabilityConfigs'],
    queryFn: gachaProbabilityService.getAllConfigs,
  })

  // 获取当前激活的配置
  const { data: activeConfigData, isLoading: isLoadingActive } = useQuery({
    queryKey: ['gachaActiveConfig'],
    queryFn: gachaProbabilityService.getActiveConfig,
  })

  const configs = configsData?.data || []
  const activeConfig = activeConfigData?.data

  // 创建配置
  const createMutation = useMutation({
    mutationFn: (data: Partial<GachaProbabilityConfig>) => {
      console.log('createMutation 开始执行', data)
      return gachaProbabilityService.createConfig(data)
    },
    onSuccess: (data) => {
      console.log('createMutation 成功', data)
      // 先保存是否是编辑对话框的状态
      const wasEditDialog = isEditDialogOpen
      
      queryClient.invalidateQueries({ queryKey: ['gachaProbabilityConfigs'] })
      setIsCreateDialogOpen(false)
      setIsEditDialogOpen(false)
      toast.success('创建成功', { description: '概率配置已创建' })
      
      // 如果是从编辑对话框创建的（不管是默认配置还是其他），自动激活新配置
      if (wasEditDialog && data?.data?._id) {
        setTimeout(() => {
          activateMutation.mutate(data.data._id)
        }, 500)
      }
    },
    onError: (error) => {
      console.error('createMutation 失败', error)
      toast.error('创建失败', { 
        description: error instanceof Error ? error.message : '请重试' 
      })
    },
  })

  // 更新配置
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<GachaProbabilityConfig> }) => {
      console.log('updateMutation 开始执行', { id, data })
      return gachaProbabilityService.updateConfig(id, data)
    },
    onSuccess: (data) => {
      console.log('updateMutation 成功', data)
      queryClient.invalidateQueries({ queryKey: ['gachaProbabilityConfigs'] })
      queryClient.invalidateQueries({ queryKey: ['gachaActiveConfig'] })
      setIsEditDialogOpen(false)
      toast.success('更新成功', { description: '概率配置已更新' })
    },
    onError: (error) => {
      console.error('updateMutation 失败', error)
      toast.error('更新失败', { 
        description: error instanceof Error ? error.message : '请重试' 
      })
    },
  })

  // 删除配置
  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      console.log('deleteMutation 开始执行', id)
      return gachaProbabilityService.deleteConfig(id)
    },
    onSuccess: () => {
      console.log('deleteMutation 成功')
      queryClient.invalidateQueries({ queryKey: ['gachaProbabilityConfigs'] })
      toast.success('删除成功', { description: '概率配置已删除' })
    },
    onError: (error) => {
      console.error('deleteMutation 失败', error)
      toast.error('删除失败', { 
        description: error instanceof Error ? error.message : '请重试' 
      })
    },
  })

  // 激活配置
  const activateMutation = useMutation({
    mutationFn: (id: string) => {
      console.log('activateMutation 开始执行', id)
      return gachaProbabilityService.activateConfig(id)
    },
    onSuccess: () => {
      console.log('activateMutation 成功')
      queryClient.invalidateQueries({ queryKey: ['gachaProbabilityConfigs'] })
      queryClient.invalidateQueries({ queryKey: ['gachaActiveConfig'] })
      toast.success('激活成功', { description: '概率配置已激活' })
    },
    onError: (error) => {
      console.error('activateMutation 失败', error)
      toast.error('激活失败', { 
        description: error instanceof Error ? error.message : '请重试' 
      })
    },
  })

  // 计算概率总和
  const calculateTotalProbability = (rarities: RarityProbability[]) => {
    return rarities.reduce((sum, r) => sum + r.probability, 0)
  }

  // 归一化概率
  const normalizeProbabilities = (rarities: RarityProbability[]) => {
    const total = calculateTotalProbability(rarities)
    if (total === 0) return rarities
    return rarities.map(r => ({
      ...r,
      probability: r.probability / total
    }))
  }

  // 模拟抽卡
  const simulateGacha = () => {
    if (!selectedConfig) return
    
    setIsSimulating(true)
    setTestResults([])
    
    const rarities = normalizeProbabilities(selectedConfig.rarities)
    const results: Record<string, number> = {}
    
    rarities.forEach(r => {
      results[r.rarityId] = 0
    })
    
    for (let i = 0; i < testDrawCount; i++) {
      const random = Math.random()
      let cumulative = 0
      
      for (const rarity of rarities) {
        cumulative += rarity.probability
        if (random <= cumulative) {
          results[rarity.rarityId]++
          break
        }
      }
    }
    
    const testResults: TestResult[] = rarities.map(rarity => {
      const count = results[rarity.rarityId] || 0
      const percentage = (count / testDrawCount) * 100
      const expectedPercentage = rarity.probability * 100
      
      return {
        rarityId: rarity.rarityId,
        rarityName: rarity.rarityName,
        count,
        percentage,
        expectedPercentage,
        difference: percentage - expectedPercentage,
      }
    })
    
    setTestResults(testResults)
    setIsSimulating(false)
  }

  // 处理创建配置
  const handleCreateConfig = () => {
    if (!editFormData.name || !editFormData.rarities) {
      toast.error('请填写完整信息')
      return
    }
    
    createMutation.mutate(editFormData)
  }

  // 处理更新配置
  const handleUpdateConfig = () => {
    console.log('handleUpdateConfig 被调用', { selectedConfig, editFormData, isEditDialogOpen })
    
    // 使用更安全的方式，即使 selectedConfig 为 null 也能工作
    const isEditingDefault = !selectedConfig || selectedConfig._id === 'default'
    
    if (!editFormData.name || !editFormData.rarities || editFormData.rarities.length === 0) {
      toast.error('请填写完整信息，至少需要一个稀有度')
      return
    }
    
    if (isEditingDefault) {
      // 编辑默认配置，创建新配置
      handleCreateConfigFromEdit()
    } else {
      // 编辑现有配置 - 确保只传递需要的字段
      const updateData = {
        name: editFormData.name,
        description: editFormData.description,
        rarities: editFormData.rarities,
      }
      console.log('准备更新配置', { id: selectedConfig._id, updateData })
      updateMutation.mutate({ id: selectedConfig._id, data: updateData })
    }
  }

  // 从编辑对话框创建新配置（编辑默认配置时使用）
  const handleCreateConfigFromEdit = () => {
    console.log('handleCreateConfigFromEdit 被调用', { editFormData })
    
    if (!editFormData.name || !editFormData.rarities || editFormData.rarities.length === 0) {
      toast.error('请填写完整信息，至少需要一个稀有度')
      return
    }
    
    // 确保我们创建的是一个新配置
    const newConfigData = {
      ...editFormData,
      _id: undefined, // 移除 _id 以确保创建新配置
    }
    
    createMutation.mutate(newConfigData)
  }

  // 打开编辑对话框
  const openEditDialog = (config: GachaProbabilityConfig) => {
    setSelectedConfig(config)
    setEditFormData({ ...config })
    setIsEditDialogOpen(true)
  }

  // 打开编辑激活配置的对话框
  const openEditActiveConfig = () => {
    let configToEdit: GachaProbabilityConfig
    if (activeConfig && activeConfig._id) {
      configToEdit = activeConfig
    } else {
      configToEdit = DEFAULT_CONFIG
    }
    console.log('openEditActiveConfig 打开编辑对话框', configToEdit)
    setSelectedConfig(configToEdit)
    setEditFormData({ ...configToEdit })
    setIsEditDialogOpen(true)
  }

  // 打开创建对话框
  const openCreateDialog = () => {
    setEditFormData({
      name: '新配置',
      description: '',
      rarities: [...DEFAULT_RARITIES],
    })
    setIsCreateDialogOpen(true)
  }

  // 打开模拟对话框
  const openSimulateDialog = (config: GachaProbabilityConfig) => {
    setSelectedConfig(config)
    setTestDrawCount(1000)
    setTestResults([])
    setIsSimulateDialogOpen(true)
  }

  // 更新稀有度概率
  const updateRarityProbability = (index: number, field: keyof RarityProbability, value: any) => {
    const newRarities = [...(editFormData.rarities || [])]
    newRarities[index] = { ...newRarities[index], [field]: value }
    setEditFormData({ ...editFormData, rarities: newRarities })
  }

  // 添加新稀有度
  const addNewRarity = () => {
    const newRarities = [...(editFormData.rarities || [])]
    newRarities.push({
      rarityId: `new_${Date.now()}`,
      rarityName: '新稀有度',
      probability: 0,
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
      borderColor: 'border-gray-300',
      glowColor: '',
    })
    setEditFormData({ ...editFormData, rarities: newRarities })
  }

  // 删除稀有度
  const removeRarity = (index: number) => {
    const newRarities = [...(editFormData.rarities || [])]
    newRarities.splice(index, 1)
    setEditFormData({ ...editFormData, rarities: newRarities })
  }

  const totalProbability = editFormData.rarities ? calculateTotalProbability(editFormData.rarities) : 0

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="w-8 h-8 text-purple-500" />
            抽卡概率管理
          </h1>
          <p className="text-gray-500 mt-1">管理和配置抽卡系统的稀有度概率</p>
        </div>
        <Button onClick={openCreateDialog} className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
          <Plus className="w-4 h-4 mr-2" />
          创建配置
        </Button>
      </div>

      {/* 当前激活配置 */}
      <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                当前激活配置
              </CardTitle>
              <CardDescription>
                {isLoadingActive ? '加载中...' : activeConfig?.name || '使用默认配置'}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => openSimulateDialog(activeConfig || DEFAULT_CONFIG)}>
                <TestTube2 className="w-4 h-4 mr-1" />
                模拟
              </Button>
              <Button variant="outline" size="sm" onClick={() => openEditActiveConfig()}>
                <Edit className="w-4 h-4 mr-1" />
                编辑
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {activeConfig?.description && (
            <p className="text-gray-600 mb-4">{activeConfig.description}</p>
          )}
          {activeConfig?.rarities && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {activeConfig.rarities.map((rarity, index) => (
                <div key={index} className={`p-3 rounded-lg border text-center ${rarity.borderColor} ${rarity.bgColor}`}>
                  <p className={`font-bold text-sm ${rarity.color}`}>{rarity.rarityName}</p>
                  <p className="text-lg font-black">{(rarity.probability * 100).toFixed(2)}%</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 配置列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Dices className="w-5 h-5 text-purple-500" />
            概率配置列表
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingConfigs ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-purple-500" />
            </div>
          ) : configs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>暂无配置，点击上方按钮创建新配置</p>
            </div>
          ) : (
            <div className="space-y-4">
              {configs.map((config: GachaProbabilityConfig) => (
                <div key={config._id} className={`p-4 rounded-lg border transition-all ${config.isActive ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-300'}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-bold text-lg">{config.name}</h3>
                        {config.isActive && (
                          <Badge className="bg-green-500">激活中</Badge>
                        )}
                      </div>
                      {config.description && (
                        <p className="text-gray-600 text-sm mb-3">{config.description}</p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {config.rarities.slice(0, 4).map((rarity, index) => (
                          <Badge key={index} variant="outline" className={`${rarity.bgColor} ${rarity.borderColor}`}>
                            <span className={rarity.color}>{rarity.rarityName}: {(rarity.probability * 100).toFixed(1)}%</span>
                          </Badge>
                        ))}
                        {config.rarities.length > 4 && (
                          <Badge variant="outline">+{config.rarities.length - 4} 更多</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 ml-4">
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(config)}>
                        <Edit className="w-4 h-4 mr-1" />
                        编辑
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openSimulateDialog(config)}>
                        <TestTube2 className="w-4 h-4 mr-1" />
                        模拟
                      </Button>
                      {!config.isActive && (
                        <Button 
                          size="sm" 
                          className="bg-green-500 hover:bg-green-600"
                          onClick={() => config._id && activateMutation.mutate(config._id)}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          激活
                        </Button>
                      )}
                      {!config.isActive && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-red-500 border-red-200 hover:bg-red-50"
                          onClick={() => {
                            if (config._id && confirm('确定要删除这个配置吗？')) {
                              deleteMutation.mutate(config._id)
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          删除
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 创建配置对话框 */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>创建新的概率配置</DialogTitle>
            <DialogDescription>配置新的抽卡稀有度概率</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>配置名称</Label>
                <Input 
                  value={editFormData.name || ''} 
                  onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
                  placeholder="输入配置名称"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label>概率总和</Label>
                <Badge className={totalProbability > 0.95 && totalProbability < 1.05 ? 'bg-green-500' : 'bg-yellow-500'}>
                  {(totalProbability * 100).toFixed(2)}%
                </Badge>
              </div>
            </div>
            
            <div>
              <Label>配置描述</Label>
              <Textarea 
                value={editFormData.description || ''} 
                onChange={e => setEditFormData({ ...editFormData, description: e.target.value })}
                placeholder="输入配置描述（可选）"
                rows={2}
              />
            </div>

            <Separator />
            
            <div className="flex items-center justify-between">
              <h3 className="font-bold">稀有度配置</h3>
              <Button variant="outline" size="sm" onClick={addNewRarity}>
                <Plus className="w-4 h-4 mr-1" />
                添加稀有度
              </Button>
            </div>

            <div className="space-y-3">
              {editFormData.rarities?.map((rarity, index) => (
                <div key={index} className="p-4 rounded-lg border bg-gray-50">
                  <div className="grid grid-cols-1 md:grid-cols-10 gap-3 items-end">
                    <div className="md:col-span-2">
                      <Label>ID</Label>
                      <Input 
                        value={rarity.rarityId} 
                        onChange={e => updateRarityProbability(index, 'rarityId', e.target.value)}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label>名称</Label>
                      <Input 
                        value={rarity.rarityName} 
                        onChange={e => updateRarityProbability(index, 'rarityName', e.target.value)}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label>概率 (%)</Label>
                      <Input 
                        type="number" 
                        step="0.001"
                        value={(rarity.probability * 100)} 
                        onChange={e => updateRarityProbability(index, 'probability', parseFloat(e.target.value) / 100)}
                      />
                    </div>
                    <div className="md:col-span-3">
                      <Label>颜色</Label>
                      <Input 
                        value={rarity.color} 
                        onChange={e => updateRarityProbability(index, 'color', e.target.value)}
                      />
                    </div>
                    <div className="md:col-span-1">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-red-500 border-red-200"
                        onClick={() => removeRarity(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              取消
            </Button>
            <Button 
              onClick={handleCreateConfig}
              disabled={createMutation.isPending}
              className="bg-gradient-to-r from-purple-500 to-pink-500"
            >
              <Save className="w-4 h-4 mr-2" />
              {createMutation.isPending ? '创建中...' : '创建配置'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑配置对话框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {!selectedConfig || selectedConfig._id === 'default' ? '编辑默认配置（将创建新配置）' : '编辑概率配置'}
            </DialogTitle>
            <DialogDescription>
              {!selectedConfig || selectedConfig._id === 'default' 
                ? '编辑默认配置后会创建一个新的配置，你可以选择激活它' 
                : '修改抽卡概率配置'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>配置名称</Label>
                <Input 
                  value={editFormData.name || ''} 
                  onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
                  placeholder="输入配置名称"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label>概率总和</Label>
                <Badge className={totalProbability > 0.95 && totalProbability < 1.05 ? 'bg-green-500' : 'bg-yellow-500'}>
                  {(totalProbability * 100).toFixed(2)}%
                </Badge>
              </div>
            </div>
            
            <div>
              <Label>配置描述</Label>
              <Textarea 
                value={editFormData.description || ''} 
                onChange={e => setEditFormData({ ...editFormData, description: e.target.value })}
                placeholder="输入配置描述（可选）"
                rows={2}
              />
            </div>

            <Separator />
            
            <div className="flex items-center justify-between">
              <h3 className="font-bold">稀有度配置</h3>
              <Button variant="outline" size="sm" onClick={addNewRarity}>
                <Plus className="w-4 h-4 mr-1" />
                添加稀有度
              </Button>
            </div>

            <div className="space-y-3">
              {editFormData.rarities?.map((rarity, index) => (
                <div key={index} className="p-4 rounded-lg border bg-gray-50">
                  <div className="grid grid-cols-1 md:grid-cols-10 gap-3 items-end">
                    <div className="md:col-span-2">
                      <Label>ID</Label>
                      <Input 
                        value={rarity.rarityId} 
                        onChange={e => updateRarityProbability(index, 'rarityId', e.target.value)}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label>名称</Label>
                      <Input 
                        value={rarity.rarityName} 
                        onChange={e => updateRarityProbability(index, 'rarityName', e.target.value)}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label>概率 (%)</Label>
                      <Input 
                        type="number" 
                        step="0.001"
                        value={(rarity.probability * 100)} 
                        onChange={e => updateRarityProbability(index, 'probability', parseFloat(e.target.value) / 100)}
                      />
                    </div>
                    <div className="md:col-span-3">
                      <Label>颜色</Label>
                      <Input 
                        value={rarity.color} 
                        onChange={e => updateRarityProbability(index, 'color', e.target.value)}
                      />
                    </div>
                    <div className="md:col-span-1">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-red-500 border-red-200"
                        onClick={() => removeRarity(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              取消
            </Button>
            <Button 
              onClick={handleUpdateConfig}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-gradient-to-r from-purple-500 to-pink-500"
            >
              <Save className="w-4 h-4 mr-2" />
              {!selectedConfig || selectedConfig._id === 'default' 
                ? (createMutation.isPending ? '创建中...' : '创建新配置') 
                : (updateMutation.isPending ? '更新中...' : '保存更改')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 模拟抽卡对话框 */}
      <Dialog open={isSimulateDialogOpen} onOpenChange={setIsSimulateDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TestTube2 className="w-5 h-5 text-purple-500" />
              模拟抽卡测试
            </DialogTitle>
            <DialogDescription>测试当前配置的概率分布情况</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label>抽卡次数</Label>
                <Input 
                  type="number" 
                  value={testDrawCount}
                  onChange={e => setTestDrawCount(parseInt(e.target.value) || 1000)}
                  min="100"
                  max="100000"
                />
              </div>
              <Button 
                onClick={simulateGacha}
                disabled={isSimulating}
                className="bg-gradient-to-r from-purple-500 to-pink-500 mt-6"
              >
                <Play className="w-4 h-4 mr-2" />
                {isSimulating ? '模拟中...' : '开始模拟'}
              </Button>
            </div>

            {testResults.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-bold">测试结果</h4>
                <div className="space-y-2">
                  {testResults.map((result, index) => (
                    <div key={index} className="p-3 rounded-lg border bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold">{result.rarityName}</span>
                        <span className="text-sm text-gray-500">{result.count} 次</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span>实际: {result.percentage.toFixed(3)}%</span>
                          <span>预期: {result.expectedPercentage.toFixed(3)}%</span>
                          <span className={result.difference > 1 ? 'text-red-500' : result.difference < -1 ? 'text-blue-500' : 'text-green-500'}>
                            偏差: {result.difference > 0 ? '+' : ''}{result.difference.toFixed(3)}%
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                              style={{ width: `${Math.min(result.percentage * 5, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSimulateDialogOpen(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default GachaProbabilityManager
