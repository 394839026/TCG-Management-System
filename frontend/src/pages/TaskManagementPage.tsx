import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Trophy, 
  Target, 
  Zap, 
  Users, 
  BookOpen, 
  ShoppingCart, 
  Star,
  CheckCircle2,
  Clock,
  RefreshCw,
  AlertCircle,
  Coins
} from 'lucide-react'
import { taskService, type Task } from '@/services/api'
import { toast } from 'sonner'

// 类型配置
const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  daily: { label: '每日', color: 'bg-blue-100 text-blue-800' },
  weekly: { label: '每周', color: 'bg-purple-100 text-purple-800' },
  achievement: { label: '成就', color: 'bg-yellow-100 text-yellow-800' },
  'one-time': { label: '一次性', color: 'bg-gray-100 text-gray-800' },
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  inventory: { label: '库存', icon: Target, color: 'text-blue-600' },
  trade: { label: '交易', icon: Zap, color: 'text-purple-600' },
  deck: { label: '卡组', icon: BookOpen, color: 'text-yellow-600' },
  shop: { label: '商店', icon: ShoppingCart, color: 'text-green-600' },
  social: { label: '社交', icon: Users, color: 'text-pink-600' },
  other: { label: '其他', icon: Star, color: 'text-gray-600' },
}

const ACTION_OPTIONS = [
  { value: 'check_in', label: '签到' },
  { value: 'add_inventory', label: '添加物品到库存' },
  { value: 'create_deck', label: '创建/编辑卡组' },
  { value: 'make_trade', label: '完成交易' },
  { value: 'add_friend', label: '添加好友' },
  { value: 'unique_items', label: '拥有独特物品' },
]

export function TaskManagementPage() {
  const queryClient = useQueryClient()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [createForm, setCreateForm] = useState<Partial<Task>>({
    name: '',
    description: '',
    type: 'daily',
    category: 'other',
    target: {
      action: 'check_in',
      value: 1,
    },
    rewards: {
      exp: 10,
      points: 20,
      coins: 0,
    },
    isActive: true,
    sortOrder: 0,
  })

  const { data: tasksData, isLoading, error, refetch } = useQuery({
    queryKey: ['adminTasks'],
    queryFn: () => {
      console.log('🔍 开始获取管理员任务...');
      return taskService.getAllTasksAdmin();
    },
    onError: (error: any) => {
      console.error('❌ 获取任务列表失败:', error);
      console.error('错误详情:', error?.response);
    },
    onSuccess: (data) => {
      console.log('✅ 获取任务列表成功:', data);
    },
  })

  const tasks = (tasksData?.data || []).map((task: any) => ({
    ...task,
    rewards: {
      exp: task.rewards?.exp || 0,
      points: task.rewards?.points || 0,
      coins: task.rewards?.coins || 0
    }
  }))

  const createMutation = useMutation({
    mutationFn: (data: Partial<Task>) => {
      console.log('创建任务数据:', data)
      return taskService.createTask(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminTasks'] })
      toast.success('任务创建成功')
      setCreateDialogOpen(false)
      resetCreateForm()
    },
    onError: (error: any) => {
      console.error('创建任务失败:', error)
      const errorMsg = error?.response?.data?.message || 
                      error?.response?.data?.errors?.[0] || 
                      '创建任务失败'
      toast.error(errorMsg)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Task> }) => {
      console.log('更新任务数据:', data)
      return taskService.updateTask(id, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminTasks'] })
      toast.success('任务更新成功')
      setEditDialogOpen(false)
      setEditingTask(null)
    },
    onError: (error: any) => {
      console.error('更新任务失败:', error)
      const errorMsg = error?.response?.data?.message || 
                      error?.response?.data?.errors?.[0] || 
                      '更新任务失败'
      toast.error(errorMsg)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => taskService.deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminTasks'] })
      toast.success('任务删除成功')
    },
    onError: (error: any) => {
      console.error('删除任务失败:', error)
      const errorMsg = error?.response?.data?.message || '删除任务失败'
      toast.error(errorMsg)
    },
  })

  const initDefaultMutation = useMutation({
    mutationFn: () => taskService.initDefaultTasks(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['adminTasks'] })
      toast.success(`成功初始化 ${data.data.count} 个默认任务`)
    },
    onError: (error: any) => {
      console.error('初始化默认任务失败:', error)
      const errorMsg = error?.response?.data?.message || '初始化默认任务失败'
      toast.error(errorMsg)
    },
  })

  const resetCreateForm = () => {
    setCreateForm({
      name: '',
      description: '',
      type: 'daily',
      category: 'other',
      target: {
        action: 'check_in',
        value: 1,
      },
      rewards: {
        exp: 10,
        points: 20,
        coins: 0,
      },
      isActive: true,
      sortOrder: 0,
    })
  }

  const handleEdit = (task: Task) => {
    setEditingTask(task)
    setCreateForm({
      ...task,
      rewards: {
        exp: (task.rewards && task.rewards.exp) || 0,
        points: (task.rewards && task.rewards.points) || 0,
        coins: (task.rewards && task.rewards.coins) || 0
      }
    })
    setEditDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这个任务吗？')) {
      deleteMutation.mutate(id)
    }
  }

  const handleCreateSubmit = () => {
    if (!createForm.name) {
      toast.error('请输入任务名称')
      return
    }
    if (!createForm.target?.value || createForm.target.value <= 0) {
      toast.error('请输入有效的目标数量')
      return
    }
    createMutation.mutate(createForm)
  }

  const handleEditSubmit = () => {
    if (!editingTask) return
    if (!createForm.name) {
      toast.error('请输入任务名称')
      return
    }
    updateMutation.mutate({ id: editingTask._id, data: createForm })
  }

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <Badge className="bg-green-100 text-green-800">启用</Badge>
    ) : (
      <Badge className="bg-gray-100 text-gray-800">禁用</Badge>
    )
  }

  // 按类型分组任务
  const dailyTasks = tasks.filter((t: Task) => t.type === 'daily')
  const weeklyTasks = tasks.filter((t: Task) => t.type === 'weekly')
  const achievementTasks = tasks.filter((t: Task) => t.type === 'achievement')
  const oneTimeTasks = tasks.filter((t: Task) => t.type === 'one-time')

  const renderTaskTable = (taskList: Task[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>任务名称</TableHead>
          <TableHead>类型</TableHead>
          <TableHead>分类</TableHead>
          <TableHead>目标</TableHead>
          <TableHead>奖励</TableHead>
          <TableHead>状态</TableHead>
          <TableHead>排序</TableHead>
          <TableHead className="text-right">操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {taskList.map((task) => {
          const CategoryIcon = CATEGORY_CONFIG[task.category]?.icon || Star
          return (
            <TableRow key={task._id}>
              <TableCell>
                <div className="font-medium">{task.name}</div>
                {task.description && (
                  <div className="text-sm text-muted-foreground">{task.description}</div>
                )}
              </TableCell>
              <TableCell>
                <Badge className={TYPE_CONFIG[task.type]?.color}>
                  {TYPE_CONFIG[task.type]?.label}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <CategoryIcon className="w-4 h-4" style={{ color: CATEGORY_CONFIG[task.category]?.color }} />
                  <span>{CATEGORY_CONFIG[task.category]?.label}</span>
                </div>
              </TableCell>
              <TableCell>
                <div>
                  <div className="text-sm">{task.target.action}</div>
                  <div className="font-medium">x {task.target.value}</div>
                </div>
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  {(task.rewards.exp || 0) > 0 && (
                    <div className="flex items-center gap-1 text-yellow-600">
                      <Zap className="w-3 h-3" />
                      <span className="text-sm">{task.rewards.exp} 经验</span>
                    </div>
                  )}
                  {(task.rewards.points || 0) > 0 && (
                    <div className="flex items-center gap-1 text-green-600">
                      <Trophy className="w-3 h-3" />
                      <span className="text-sm">{task.rewards.points} 积分</span>
                    </div>
                  )}
                  {(task.rewards.coins || 0) > 0 && (
                    <div className="flex items-center gap-1 text-amber-600">
                      <Coins className="w-3 h-3" />
                      <span className="text-sm">{task.rewards.coins} 金币</span>
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>{getStatusBadge(task.isActive)}</TableCell>
              <TableCell>{task.sortOrder}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(task)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500"
                    onClick={() => handleDelete(task._id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )

  return (
    <div className="space-y-6">
      {/* 错误显示 */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <div className="flex-1">
                <h3 className="font-medium text-red-800">加载任务失败</h3>
                <p className="text-sm text-red-600">
                  {error?.response?.data?.message || error?.message || '未知错误'}
                </p>
                {error?.response?.status && (
                  <p className="text-xs text-red-500 mt-1">
                    状态码: {error.response.status}
                  </p>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                重试
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">任务管理</h1>
          <p className="text-muted-foreground">创建和管理系统任务</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => initDefaultMutation.mutate()}
            disabled={initDefaultMutation.isPending}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            初始化默认任务
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            创建任务
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <Tabs defaultValue="daily" className="space-y-6">
          <TabsList>
            <TabsTrigger value="daily">每日任务 ({dailyTasks.length})</TabsTrigger>
            <TabsTrigger value="weekly">每周任务 ({weeklyTasks.length})</TabsTrigger>
            <TabsTrigger value="achievement">成就 ({achievementTasks.length})</TabsTrigger>
            <TabsTrigger value="one-time">一次性任务 ({oneTimeTasks.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="daily" className="space-y-4">
            <Card>
              <CardContent className="p-0">
                {dailyTasks.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>暂无每日任务</p>
                  </div>
                ) : (
                  renderTaskTable(dailyTasks)
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="weekly" className="space-y-4">
            <Card>
              <CardContent className="p-0">
                {weeklyTasks.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>暂无每周任务</p>
                  </div>
                ) : (
                  renderTaskTable(weeklyTasks)
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="achievement" className="space-y-4">
            <Card>
              <CardContent className="p-0">
                {achievementTasks.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>暂无成就任务</p>
                  </div>
                ) : (
                  renderTaskTable(achievementTasks)
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="one-time" className="space-y-4">
            <Card>
              <CardContent className="p-0">
                {oneTimeTasks.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>暂无一次性任务</p>
                  </div>
                ) : (
                  renderTaskTable(oneTimeTasks)
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* 创建任务对话框 */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>创建新任务</DialogTitle>
            <DialogDescription>设置任务的详细信息和奖励</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>任务名称 *</Label>
                <Input
                  placeholder="请输入任务名称"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>任务描述</Label>
                <Textarea
                  placeholder="请输入任务描述"
                  value={createForm.description || ''}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>任务类型</Label>
                <Select
                  value={createForm.type}
                  onValueChange={(value: any) => setCreateForm({ ...createForm, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">每日</SelectItem>
                    <SelectItem value="weekly">每周</SelectItem>
                    <SelectItem value="achievement">成就</SelectItem>
                    <SelectItem value="one-time">一次性</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>任务分类</Label>
                <Select
                  value={createForm.category}
                  onValueChange={(value: any) => setCreateForm({ ...createForm, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inventory">库存</SelectItem>
                    <SelectItem value="trade">交易</SelectItem>
                    <SelectItem value="deck">卡组</SelectItem>
                    <SelectItem value="shop">商店</SelectItem>
                    <SelectItem value="social">社交</SelectItem>
                    <SelectItem value="other">其他</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>目标动作</Label>
                <Select
                  value={createForm.target?.action}
                  onValueChange={(value) => 
                    setCreateForm({
                      ...createForm,
                      target: { ...createForm.target!, action: value }
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTION_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>目标数量 *</Label>
                <Input
                  type="number"
                  min="1"
                  value={createForm.target?.value || ''}
                  onChange={(e) => 
                    setCreateForm({
                      ...createForm,
                      target: { ...createForm.target!, value: parseInt(e.target.value) || 1 }
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>经验奖励</Label>
                <Input
                  type="number"
                  min="0"
                  value={createForm.rewards?.exp || 0}
                  onChange={(e) => 
                    setCreateForm({
                      ...createForm,
                      rewards: { ...createForm.rewards!, exp: parseInt(e.target.value) || 0 }
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>积分奖励</Label>
                <Input
                  type="number"
                  min="0"
                  value={createForm.rewards?.points || 0}
                  onChange={(e) => 
                    setCreateForm({
                      ...createForm,
                      rewards: { ...createForm.rewards!, points: parseInt(e.target.value) || 0 }
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>金币奖励</Label>
                <Input
                  type="number"
                  min="0"
                  value={createForm.rewards?.coins || 0}
                  onChange={(e) => 
                    setCreateForm({
                      ...createForm,
                      rewards: { ...createForm.rewards!, coins: parseInt(e.target.value) || 0 }
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>排序顺序</Label>
                <Input
                  type="number"
                  min="0"
                  value={createForm.sortOrder || 0}
                  onChange={(e) => 
                    setCreateForm({
                      ...createForm,
                      sortOrder: parseInt(e.target.value) || 0
                    })
                  }
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch
                  id="create-active"
                  checked={createForm.isActive ?? true}
                  onCheckedChange={(checked) => setCreateForm({ ...createForm, isActive: checked })}
                />
                <Label htmlFor="create-active">启用任务</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateDialogOpen(false)
                resetCreateForm()
              }}
            >
              取消
            </Button>
            <Button onClick={handleCreateSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending ? '创建中...' : '创建任务'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑任务对话框 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>编辑任务</DialogTitle>
            <DialogDescription>修改任务的详细信息和奖励</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>任务名称 *</Label>
                <Input
                  placeholder="请输入任务名称"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>任务描述</Label>
                <Textarea
                  placeholder="请输入任务描述"
                  value={createForm.description || ''}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>任务类型</Label>
                <Select
                  value={createForm.type}
                  onValueChange={(value: any) => setCreateForm({ ...createForm, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">每日</SelectItem>
                    <SelectItem value="weekly">每周</SelectItem>
                    <SelectItem value="achievement">成就</SelectItem>
                    <SelectItem value="one-time">一次性</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>任务分类</Label>
                <Select
                  value={createForm.category}
                  onValueChange={(value: any) => setCreateForm({ ...createForm, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inventory">库存</SelectItem>
                    <SelectItem value="trade">交易</SelectItem>
                    <SelectItem value="deck">卡组</SelectItem>
                    <SelectItem value="shop">商店</SelectItem>
                    <SelectItem value="social">社交</SelectItem>
                    <SelectItem value="other">其他</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>目标动作</Label>
                <Select
                  value={createForm.target?.action}
                  onValueChange={(value) => 
                    setCreateForm({
                      ...createForm,
                      target: { ...createForm.target!, action: value }
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTION_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>目标数量 *</Label>
                <Input
                  type="number"
                  min="1"
                  value={createForm.target?.value || ''}
                  onChange={(e) => 
                    setCreateForm({
                      ...createForm,
                      target: { ...createForm.target!, value: parseInt(e.target.value) || 1 }
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>经验奖励</Label>
                <Input
                  type="number"
                  min="0"
                  value={createForm.rewards?.exp || 0}
                  onChange={(e) => 
                    setCreateForm({
                      ...createForm,
                      rewards: { ...createForm.rewards!, exp: parseInt(e.target.value) || 0 }
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>积分奖励</Label>
                <Input
                  type="number"
                  min="0"
                  value={createForm.rewards?.points || 0}
                  onChange={(e) => 
                    setCreateForm({
                      ...createForm,
                      rewards: { ...createForm.rewards!, points: parseInt(e.target.value) || 0 }
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>金币奖励</Label>
                <Input
                  type="number"
                  min="0"
                  value={createForm.rewards?.coins || 0}
                  onChange={(e) => 
                    setCreateForm({
                      ...createForm,
                      rewards: { ...createForm.rewards!, coins: parseInt(e.target.value) || 0 }
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>排序顺序</Label>
                <Input
                  type="number"
                  min="0"
                  value={createForm.sortOrder || 0}
                  onChange={(e) => 
                    setCreateForm({
                      ...createForm,
                      sortOrder: parseInt(e.target.value) || 0
                    })
                  }
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch
                  id="edit-active"
                  checked={createForm.isActive ?? true}
                  onCheckedChange={(checked) => setCreateForm({ ...createForm, isActive: checked })}
                />
                <Label htmlFor="edit-active">启用任务</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditDialogOpen(false)
                setEditingTask(null)
              }}
            >
              取消
            </Button>
            <Button onClick={handleEditSubmit} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? '保存中...' : '保存修改'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default TaskManagementPage
