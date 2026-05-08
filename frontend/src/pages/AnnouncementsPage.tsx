import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Calendar, Pin, Eye, Plus, Edit, Trash2, AlertCircle, Bell, Sparkles, Zap, Tag } from 'lucide-react'
import { announcementService, type Announcement } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'

// 简单的日期格式化函数
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}`
}

const formatDateOnly = (dateString: string) => {
  const date = new Date(dateString)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 类型配置
const TYPE_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  update: { label: '更新', color: 'bg-blue-100 text-blue-800', icon: Sparkles },
  announcement: { label: '公告', color: 'bg-green-100 text-green-800', icon: Bell },
  important: { label: '重要', color: 'bg-red-100 text-red-800', icon: AlertCircle },
  event: { label: '活动', color: 'bg-purple-100 text-purple-800', icon: Zap },
}

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  low: { label: '低', color: 'bg-gray-100 text-gray-800' },
  normal: { label: '普通', color: 'bg-blue-100 text-blue-800' },
  high: { label: '高', color: 'bg-orange-100 text-orange-800' },
  urgent: { label: '紧急', color: 'bg-red-100 text-red-800' },
}

export function AnnouncementsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [createForm, setCreateForm] = useState({
    title: '',
    content: '',
    type: 'announcement',
    priority: 'normal',
    isPinned: false,
    tags: '',
    expiresAt: '',
  })
  const [editForm, setEditForm] = useState({
    title: '',
    content: '',
    type: 'announcement',
    priority: 'normal',
    isPinned: false,
    isActive: true,
    tags: '',
    expiresAt: '',
  })

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin'

  const { data: announcementsData, isLoading } = useQuery({
    queryKey: ['announcements', selectedType],
    queryFn: async () => {
      const params: any = { limit: 50 }
      if (selectedType !== 'all') {
        params.type = selectedType
      }
      return await announcementService.getAnnouncements(params)
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => announcementService.createAnnouncement(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] })
      toast.success('公告创建成功')
      setCreateDialogOpen(false)
      setCreateForm({
        title: '',
        content: '',
        type: 'announcement',
        priority: 'normal',
        isPinned: false,
        tags: '',
        expiresAt: '',
      })
    },
    onError: () => {
      toast.error('创建公告失败')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => announcementService.updateAnnouncement(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] })
      toast.success('公告更新成功')
      setEditDialogOpen(false)
      setSelectedAnnouncement(null)
    },
    onError: () => {
      toast.error('更新公告失败')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => announcementService.deleteAnnouncement(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] })
      toast.success('公告删除成功')
    },
    onError: () => {
      toast.error('删除公告失败')
    },
  })

  const announcements = announcementsData?.data || []

  const handleViewDetails = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement)
    setDetailDialogOpen(true)
  }

  const handleEdit = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement)
    setEditForm({
      title: announcement.title,
      content: announcement.content,
      type: announcement.type,
      priority: announcement.priority,
      isPinned: announcement.isPinned,
      isActive: announcement.isActive,
      tags: announcement.tags?.join(', ') || '',
      expiresAt: announcement.expiresAt ? formatDateOnly(announcement.expiresAt) : '',
    })
    setEditDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这条公告吗？')) {
      deleteMutation.mutate(id)
    }
  }

  const handleCreateSubmit = () => {
    if (!createForm.title || !createForm.content) {
      toast.error('请填写标题和内容')
      return
    }

    const data = {
      ...createForm,
      tags: createForm.tags ? createForm.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      expiresAt: createForm.expiresAt || undefined,
    }

    createMutation.mutate(data)
  }

  const handleEditSubmit = () => {
    if (!selectedAnnouncement) return

    if (!editForm.title || !editForm.content) {
      toast.error('请填写标题和内容')
      return
    }

    const data = {
      ...editForm,
      tags: editForm.tags ? editForm.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      expiresAt: editForm.expiresAt || undefined,
    }

    updateMutation.mutate({ id: selectedAnnouncement._id, data })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">公告中心</h1>
          <p className="text-muted-foreground">查看系统公告和更新内容</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            发布公告
          </Button>
        )}
      </div>

      {/* 筛选器 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-sm text-muted-foreground">类型筛选:</span>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedType === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedType('all')}
              >
                全部类型
              </Button>
              {Object.entries(TYPE_CONFIG).map(([type, config]) => {
                const TypeIcon = config.icon
                return (
                  <Button
                    key={type}
                    variant={selectedType === type ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedType(type)}
                  >
                    <TypeIcon className="w-4 h-4 mr-1" />
                    {config.label}
                  </Button>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 公告列表 */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : announcements.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">暂无公告</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => {
            const typeConfig = TYPE_CONFIG[announcement.type]
            const priorityConfig = PRIORITY_CONFIG[announcement.priority]
            const TypeIcon = typeConfig?.icon || Bell

            return (
              <Card
                key={announcement._id}
                className={`overflow-hidden transition-all ${announcement.isPinned ? 'border-l-4 border-l-yellow-500 bg-yellow-50/30' : ''}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className={`w-12 h-12 rounded-lg ${typeConfig?.color || 'bg-gray-100'} flex items-center justify-center`}>
                        <TypeIcon className="w-6 h-6" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {announcement.isPinned && (
                              <Pin className="w-4 h-4 text-yellow-600" fill="currentColor" />
                            )}
                            <h3 className="text-lg font-semibold truncate">{announcement.title}</h3>
                            {typeConfig && (
                              <Badge className={typeConfig.color}>{typeConfig.label}</Badge>
                            )}
                            {priorityConfig && (
                              <Badge className={priorityConfig.color}>{priorityConfig.label}</Badge>
                            )}
                          </div>
                          <p className="text-muted-foreground mt-1 line-clamp-2">{announcement.content}</p>
                          <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {formatDate(announcement.createdAt)}
            </span>
                            <span className="flex items-center gap-1">
                              <Eye className="w-4 h-4" />
                              {announcement.views || 0} 次浏览
                            </span>
                            {announcement.tags?.length > 0 && (
                              <div className="flex items-center gap-1">
                                <Tag className="w-4 h-4" />
                                <span className="flex gap-1">
                                  {announcement.tags.slice(0, 3).map((tag, i) => (
                                    <Badge key={i} variant="outline" className="text-xs">{tag}</Badge>
                                  ))}
                                  {announcement.tags.length > 3 && (
                                    <span>+{announcement.tags.length - 3}</span>
                                  )}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Button variant="ghost" size="sm" onClick={() => handleViewDetails(announcement)}>
                            查看详情
                          </Button>
                          {isAdmin && (
                            <>
                              <Button variant="ghost" size="sm" onClick={() => handleEdit(announcement)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500"
                                onClick={() => handleDelete(announcement._id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* 详情对话框 */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedAnnouncement && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  {selectedAnnouncement.isPinned && (
                    <Pin className="w-5 h-5 text-yellow-600" fill="currentColor" />
                  )}
                  <DialogTitle className="text-xl">{selectedAnnouncement.title}</DialogTitle>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {TYPE_CONFIG[selectedAnnouncement.type] && (
                    <Badge className={TYPE_CONFIG[selectedAnnouncement.type].color}>
                      {TYPE_CONFIG[selectedAnnouncement.type].label}
                    </Badge>
                  )}
                  {PRIORITY_CONFIG[selectedAnnouncement.priority] && (
                    <Badge className={PRIORITY_CONFIG[selectedAnnouncement.priority].color}>
                      {PRIORITY_CONFIG[selectedAnnouncement.priority].label}
                    </Badge>
                  )}
                </div>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="prose max-w-none">
                  <p className="whitespace-pre-wrap">{selectedAnnouncement.content}</p>
                </div>

                {selectedAnnouncement.tags?.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap pt-4 border-t">
                    <span className="text-sm text-muted-foreground">标签:</span>
                    {selectedAnnouncement.tags.map((tag, i) => (
                      <Badge key={i} variant="outline">{tag}</Badge>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t text-sm text-muted-foreground">
                  <div className="flex items-center gap-4">
                    <span>发布于: {formatDate(selectedAnnouncement.createdAt)}</span>
                    {selectedAnnouncement.createdBy && (
                      <span>
                        发布者: {typeof selectedAnnouncement.createdBy === 'object'
                          ? selectedAnnouncement.createdBy.username
                          : '系统'}
                      </span>
                    )}
                  </div>
                  <span>浏览: {selectedAnnouncement.views || 0} 次</span>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>
                  关闭
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* 创建公告对话框 */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>发布新公告</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>标题 *</Label>
              <Input
                placeholder="请输入公告标题"
                value={createForm.title}
                onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>内容 *</Label>
              <Textarea
                placeholder="请输入公告内容"
                rows={8}
                value={createForm.content}
                onChange={(e) => setCreateForm({ ...createForm, content: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>类型</Label>
                <Select value={createForm.type} onValueChange={(value) => setCreateForm({ ...createForm, type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="update">更新</SelectItem>
                    <SelectItem value="announcement">公告</SelectItem>
                    <SelectItem value="important">重要</SelectItem>
                    <SelectItem value="event">活动</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>优先级</Label>
                <Select value={createForm.priority} onValueChange={(value) => setCreateForm({ ...createForm, priority: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">低</SelectItem>
                    <SelectItem value="normal">普通</SelectItem>
                    <SelectItem value="high">高</SelectItem>
                    <SelectItem value="urgent">紧急</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>标签 (用逗号分隔)</Label>
              <Input
                placeholder="例如: 更新, 功能, 修复"
                value={createForm.tags}
                onChange={(e) => setCreateForm({ ...createForm, tags: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>过期时间 (可选)</Label>
              <Input
                type="date"
                value={createForm.expiresAt}
                onChange={(e) => setCreateForm({ ...createForm, expiresAt: e.target.value })}
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="create-pinned"
                checked={createForm.isPinned}
                onCheckedChange={(checked) => setCreateForm({ ...createForm, isPinned: checked })}
              />
              <Label htmlFor="create-pinned">置顶公告</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleCreateSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending ? '发布中...' : '发布公告'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑公告对话框 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>编辑公告</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>标题 *</Label>
              <Input
                placeholder="请输入公告标题"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>内容 *</Label>
              <Textarea
                placeholder="请输入公告内容"
                rows={8}
                value={editForm.content}
                onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>类型</Label>
                <Select value={editForm.type} onValueChange={(value) => setEditForm({ ...editForm, type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="update">更新</SelectItem>
                    <SelectItem value="announcement">公告</SelectItem>
                    <SelectItem value="important">重要</SelectItem>
                    <SelectItem value="event">活动</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>优先级</Label>
                <Select value={editForm.priority} onValueChange={(value) => setEditForm({ ...editForm, priority: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">低</SelectItem>
                    <SelectItem value="normal">普通</SelectItem>
                    <SelectItem value="high">高</SelectItem>
                    <SelectItem value="urgent">紧急</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>标签 (用逗号分隔)</Label>
              <Input
                placeholder="例如: 更新, 功能, 修复"
                value={editForm.tags}
                onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>过期时间 (可选)</Label>
              <Input
                type="date"
                value={editForm.expiresAt}
                onChange={(e) => setEditForm({ ...editForm, expiresAt: e.target.value })}
              />
            </div>

            <div className="flex items-center gap-8">
              <div className="flex items-center gap-2">
                <Switch
                  id="edit-pinned"
                  checked={editForm.isPinned}
                  onCheckedChange={(checked) => setEditForm({ ...editForm, isPinned: checked })}
                />
                <Label htmlFor="edit-pinned">置顶公告</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="edit-active"
                  checked={editForm.isActive}
                  onCheckedChange={(checked) => setEditForm({ ...editForm, isActive: checked })}
                />
                <Label htmlFor="edit-active">启用公告</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
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

export default AnnouncementsPage
