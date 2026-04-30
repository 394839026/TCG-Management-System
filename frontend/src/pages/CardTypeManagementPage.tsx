import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Edit2, Search, Upload, Download } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface CardType {
  _id: string
  name: string
  gameType: string
  cardProperty?: string
  description?: string
  createdAt: string
  updatedAt: string
}

const GAME_TYPES = [
  { id: 'rune', name: '符文战场' },
  { id: 'digimon', name: '数码宝贝' },
  { id: 'pokemon', name: '宝可梦' },
  { id: 'shadowverse-evolve', name: '影之诗进化对决' },
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

export function CardTypeManagementPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [gameTypeFilter, setGameTypeFilter] = useState('')
  const [cardPropertyFilter, setCardPropertyFilter] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editingType, setEditingType] = useState<CardType | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    gameType: '',
    cardProperty: '无',
    description: '',
  })
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isSuperAdmin = user?.role === 'superadmin'

  const { data: typesData, isLoading } = useQuery({
    queryKey: ['cardTypes', searchTerm],
    queryFn: async () => {
      const response = await fetch('/api/card-types', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      })
      const result = await response.json()
      return result
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; gameType: string; cardProperty?: string; description?: string }) => {
      const response = await fetch('/api/card-types', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cardTypes'] })
      toast.success('卡牌类型创建成功')
      setFormOpen(false)
      setFormData({ name: '', gameType: '', cardProperty: '无', description: '' })
    },
    onError: () => {
      toast.error('创建失败')
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name?: string; gameType?: string; cardProperty?: string; description?: string } }) => {
      const response = await fetch(`/api/card-types/${id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cardTypes'] })
      toast.success('卡牌类型更新成功')
      setFormOpen(false)
      setEditingType(null)
    },
    onError: () => {
      toast.error('更新失败')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/card-types/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      })
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cardTypes'] })
      toast.success('卡牌类型已删除')
    },
    onError: () => {
      toast.error('删除失败')
    },
  })

  const importMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/card-types/import', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      })
      return response.json()
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['cardTypes'] })
      toast.success(result.message)
      setImportDialogOpen(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    },
    onError: () => {
      toast.error('导入失败')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const submitData = {
      ...formData,
      cardProperty: formData.cardProperty === '无' ? '' : formData.cardProperty,
    }
    if (editingType) {
      updateMutation.mutate({ id: editingType._id, data: submitData })
    } else {
      createMutation.mutate(submitData)
    }
  }

  const handleEdit = (type: CardType) => {
    setEditingType(type)
    setFormData({
      name: type.name,
      gameType: type.gameType,
      cardProperty: type.cardProperty || '无',
      description: type.description || '',
    })
    setFormOpen(true)
  }

  const handleDelete = (id: string) => {
    if (confirm('确定要删除此卡牌类型吗？')) {
      deleteMutation.mutate(id)
    }
  }

  const handleImport = (e: React.FormEvent) => {
    e.preventDefault()
    const file = (e.target as HTMLFormElement).file?.files?.[0]
    if (file) {
      const formData = new FormData()
      formData.append('file', file)
      importMutation.mutate(formData)
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch('/api/card-types/template', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (!response.ok) {
        throw new Error('下载失败')
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'card_type_template.xlsx'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast.success('下载成功')
    } catch (error) {
      console.error(error)
      toast.error('下载失败')
    }
  }

  const handleExport = async () => {
    try {
      const exportUrl = gameTypeFilter 
        ? `/api/card-types/export?gameType=${gameTypeFilter}`
        : '/api/card-types/export'
      
      const response = await fetch(exportUrl, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (!response.ok) {
        throw new Error('导出失败')
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `card_types_export_${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast.success('导出成功')
    } catch (error) {
      console.error(error)
      toast.error('导出失败')
    }
  }

  const types: CardType[] = typesData?.data || []
  const filteredTypes = types.filter(type => {
    const matchesSearch = type.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesGameType = !gameTypeFilter || type.gameType === gameTypeFilter
    const matchesCardProperty = !cardPropertyFilter || type.cardProperty === cardPropertyFilter
    return matchesSearch && matchesGameType && matchesCardProperty
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">卡牌类型管理</h1>
          <p className="text-muted-foreground mt-1">管理数据库中的所有卡牌类型</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            导出
          </Button>
          {isSuperAdmin && (
            <>
              <Button variant="outline" onClick={handleDownloadTemplate}>
                <Download className="w-4 h-4 mr-2" />
                下载模板
              </Button>
              <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
                <Upload className="w-4 h-4 mr-2" />
                导入卡牌类型
              </Button>
              <Button variant="premium" onClick={() => { setEditingType(null); setFormData({ name: '', gameType: '', cardProperty: '无', description: '' }); setFormOpen(true) }}>
                <Plus className="w-4 h-4 mr-2" />
                添加卡牌类型
              </Button>
            </>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索卡牌类型..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="min-w-[150px]">
              <Label htmlFor="gameTypeFilter">所属游戏</Label>
              <select
                id="gameTypeFilter"
                value={gameTypeFilter}
                onChange={(e) => setGameTypeFilter(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">全部</option>
                {GAME_TYPES.map((game) => (
                  <option key={game.id} value={game.id}>{game.name}</option>
                ))}
              </select>
            </div>
            <div className="min-w-[150px]">
              <Label htmlFor="cardPropertyFilter">卡牌属性</Label>
              <select
                id="cardPropertyFilter"
                value={cardPropertyFilter}
                onChange={(e) => setCardPropertyFilter(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">全部</option>
                <option value="传奇">传奇</option>
                <option value="英雄">英雄</option>
                <option value="专属">专属</option>
                <option value="单位">单位</option>
                <option value="装备">装备</option>
                <option value="法术">法术</option>
                <option value="战场">战场</option>
                <option value="指示物">指示物</option>
                <option value="符文">符文</option>
              </select>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm('')
                setGameTypeFilter('')
                setCardPropertyFilter('')
              }}
            >
              重置
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredTypes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">暂无卡牌类型</p>
            {isSuperAdmin && (
              <Button variant="outline" className="mt-4" onClick={() => { setEditingType(null); setFormData({ name: '', gameType: '', cardProperty: '', description: '' }); setFormOpen(true) }}>
                <Plus className="w-4 h-4 mr-2" />
                添加第一个卡牌类型
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-medium">类型名称</th>
                  <th className="text-left p-4 font-medium">所属游戏</th>
                  <th className="text-left p-4 font-medium">卡牌属性</th>
                  <th className="text-left p-4 font-medium">描述</th>
                  <th className="text-left p-4 font-medium">创建时间</th>
                  {isSuperAdmin && <th className="text-right p-4 font-medium">操作</th>}
                </tr>
              </thead>
              <tbody>
                {filteredTypes.map((type) => (
                  <tr key={type._id} className="border-t hover:bg-muted/30 transition-colors">
                    <td className="p-4 font-medium">{type.name}</td>
                    <td className="p-4">
                      <Badge variant="outline">
                        {GAME_TYPES.find((g) => g.id === type.gameType)?.name || type.gameType}
                      </Badge>
                    </td>
                    <td className="p-4">
                      {type.cardProperty ? (
                        <Badge>{type.cardProperty}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="p-4 text-muted-foreground">{type.description || '-'}</td>
                    <td className="p-4 text-muted-foreground text-sm">
                      {new Date(type.createdAt).toLocaleDateString()}
                    </td>
                    {isSuperAdmin && (
                      <td className="p-4 text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(type)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDelete(type._id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editingType ? '编辑卡牌类型' : '添加卡牌类型'}</DialogTitle>
              <DialogDescription>
                {editingType ? '修改卡牌类型信息' : '添加新的卡牌类型'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">类型名称</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="输入类型名称"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="gameType">所属游戏</Label>
                <div className="flex flex-wrap gap-2">
                  {GAME_TYPES.map((game) => (
                    <Button
                      key={game.id}
                      type="button"
                      variant={formData.gameType === game.id ? 'default' : 'outline'}
                      onClick={() => setFormData({ ...formData, gameType: game.id, cardProperty: '' })}
                    >
                      {game.name}
                    </Button>
                  ))}
                </div>
              </div>
              {!formData.gameType && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-700">
                  请先选择所属游戏类型，如果选择"符文战场"将显示卡牌属性选项
                </div>
              )}
              
              {formData.gameType === 'rune' && (
                <div className="grid gap-2">
                  <Label htmlFor="cardProperty">卡牌属性</Label>
                  <select
                    id="cardProperty"
                    value={formData.cardProperty}
                    onChange={(e) => setFormData({ ...formData, cardProperty: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {CARD_PROPERTIES.map((property) => (
                      <option key={property.id} value={property.id}>
                        {property.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="grid gap-2">
                <Label htmlFor="description">描述</Label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="输入描述（可选）"
                  className="w-full p-3 border rounded-md"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setFormOpen(false)}>取消</Button>
              <Button type="submit">保存</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleImport}>
            <DialogHeader>
              <DialogTitle>导入卡牌类型</DialogTitle>
              <DialogDescription>
                上传Excel文件批量导入卡牌类型
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="file">选择文件</Label>
                <input
                  ref={fileInputRef}
                  id="file"
                  type="file"
                  accept=".xlsx,.xls"
                  className="w-full p-3 border rounded-md"
                  required
                />
              </div>
              <p className="text-sm text-muted-foreground">
                支持 .xlsx 和 .xls 格式的Excel文件，请先下载模板查看格式要求
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setImportDialogOpen(false)}>取消</Button>
              <Button type="submit">导入</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}