import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import apiClient from '../lib/api'
import { User } from '../services/auth'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Search, Edit, Trash2, Eye, RefreshCw, Shield, User as UserIcon, Mail, AlertCircle, CheckCircle, Settings, Lock, Unlock, UserCog } from 'lucide-react'

interface RoleOption {
  value: string
  label: string
  color: string
}

const roleOptions: RoleOption[] = [
  { value: 'user', label: '普通用户', color: 'bg-gray-100 text-gray-700' },
  { value: 'admin', label: '管理员', color: 'bg-blue-100 text-blue-700' },
  { value: 'superadmin', label: '超级管理员', color: 'bg-red-100 text-red-700' },
]

interface Permissions {
  teams: boolean
  shops: boolean
  decks: boolean
  inventory: boolean
  marketplace: boolean
  analytics: boolean
  messages: boolean
  friends: boolean
  favorites: boolean
}

interface UserDetail extends User {
  createdAt?: string
  userType?: string
  permissions?: Permissions
}

const permissionOptions = [
  { key: 'teams', label: '战队', description: '访问战队界面' },
  { key: 'shops', label: '店铺', description: '访问店铺界面' },
  { key: 'decks', label: '卡组', description: '访问卡组界面' },
  { key: 'inventory', label: '库存', description: '访问库存界面' },
  { key: 'marketplace', label: '交易市场', description: '访问交易市场' },
  { key: 'analytics', label: '数据分析', description: '访问数据分析' },
  { key: 'messages', label: '消息中心', description: '访问消息中心' },
  { key: 'friends', label: '好友系统', description: '访问好友系统' },
  { key: 'favorites', label: '我的收藏', description: '访问收藏界面' },
]

export function PermissionManagementPage() {
  const { user } = useAuth()
  const [users, setUsers] = useState<UserDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null)
  const [roleDialogOpen, setRoleDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false)
  const [usernameDialogOpen, setUsernameDialogOpen] = useState(false)
  const [newRole, setNewRole] = useState('')
  const [newUsername, setNewUsername] = useState('')
  const [editingPermissions, setEditingPermissions] = useState<Permissions | null>(null)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error'>('success')

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const response = await apiClient.get('/auth/users')
      if (response.data.success) {
        setUsers(response.data.data)
        setMessage('')
      }
    } catch (error) {
      console.error('Failed to load users:', error)
      setMessage('加载用户列表失败')
      setMessageType('error')
    }
    setLoading(false)
  }

  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.uid?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleViewDetail = (user: UserDetail) => {
    setSelectedUser(user)
    setRoleDialogOpen(false)
    setDeleteDialogOpen(false)
    setPermissionsDialogOpen(false)
  }

  const handleOpenRoleChange = (user: UserDetail) => {
    setSelectedUser(user)
    setNewRole(user.role)
    setRoleDialogOpen(true)
  }

  const handleOpenDeleteConfirm = (user: UserDetail) => {
    setSelectedUser(user)
    setDeleteDialogOpen(true)
  }

  const handleOpenPermissions = (user: UserDetail) => {
    setSelectedUser(user)
    setEditingPermissions(user.permissions || {
      teams: true,
      shops: true,
      decks: true,
      inventory: true,
      marketplace: true,
      analytics: true,
      messages: true,
      friends: true,
      favorites: true,
    })
    setPermissionsDialogOpen(true)
  }

  const handleOpenUsernameChange = (user: UserDetail) => {
    setSelectedUser(user)
    setNewUsername(user.username)
    setUsernameDialogOpen(true)
  }

  const handleUsernameChange = async () => {
    if (!selectedUser || !newUsername) return
    
    try {
      const response = await apiClient.put(`/auth/users/${selectedUser._id}/username`, { 
        username: newUsername 
      })
      
      if (response.data.success) {
        setUsers(users.map(u => 
          u._id === selectedUser._id ? { ...u, username: newUsername } : u
        ))
        setSelectedUser({ ...selectedUser, username: newUsername })
        setMessage('用户名更新成功')
        setMessageType('success')
        setUsernameDialogOpen(false)
      }
    } catch (error: any) {
      console.error('Failed to update username:', error)
      setMessage(error.response?.data?.message || '更新用户名失败')
      setMessageType('error')
    }
  }

  const handleRoleChange = async () => {
    if (!selectedUser || !newRole) return
    
    try {
      const response = await apiClient.put(`/auth/users/${selectedUser._id}/role`, { role: newRole })
      if (response.data.success) {
        setUsers(users.map(u => 
          u._id === selectedUser._id ? { ...u, role: newRole } : u
        ))
        setSelectedUser({ ...selectedUser, role: newRole })
        setMessage('用户角色更新成功')
        setMessageType('success')
        setRoleDialogOpen(false)
      }
    } catch (error) {
      console.error('Failed to update role:', error)
      setMessage('更新角色失败')
      setMessageType('error')
    }
  }

  const handleDeleteUser = async () => {
    if (!selectedUser) return
    
    try {
      const response = await apiClient.delete(`/auth/users/${selectedUser._id}`)
      if (response.data.success) {
        setUsers(users.filter(u => u._id !== selectedUser._id))
        setSelectedUser(null)
        setMessage('用户删除成功')
        setMessageType('success')
        setDeleteDialogOpen(false)
      }
    } catch (error) {
      console.error('Failed to delete user:', error)
      setMessage('删除用户失败')
      setMessageType('error')
    }
  }

  const handlePermissionsChange = (key: keyof Permissions, value: boolean) => {
    if (editingPermissions) {
      setEditingPermissions({ ...editingPermissions, [key]: value })
    }
  }

  const handleSavePermissions = async () => {
    if (!selectedUser || !editingPermissions) return
    
    try {
      const response = await apiClient.put(`/auth/users/${selectedUser._id}/permissions`, editingPermissions)
      if (response.data.success) {
        setUsers(users.map(u => 
          u._id === selectedUser._id ? { ...u, permissions: editingPermissions } : u
        ))
        setSelectedUser({ ...selectedUser, permissions: editingPermissions })
        setMessage('用户权限更新成功')
        setMessageType('success')
        setPermissionsDialogOpen(false)
      }
    } catch (error) {
      console.error('Failed to update permissions:', error)
      setMessage('更新权限失败')
      setMessageType('error')
    }
  }

  const toggleAllPermissions = (value: boolean) => {
    if (editingPermissions) {
      const newPermissions: Permissions = {
        teams: value,
        shops: value,
        decks: value,
        inventory: value,
        marketplace: value,
        analytics: value,
        messages: value,
        friends: value,
        favorites: value,
      }
      setEditingPermissions(newPermissions)
    }
  }

  const getRoleOption = (role: string) => {
    return roleOptions.find(r => r.value === role) || roleOptions[0]
  }

  const getUserTypeLabel = (userType?: string) => {
    const types: Record<string, string> = {
      personal: '个人用户',
      team: '战队用户',
      shop: '店铺用户'
    }
    return types[userType || 'personal'] || '个人用户'
  }

  const getAllPermissionsCount = (user: UserDetail) => {
    const perms = user.permissions
    if (!perms) return 9
    return Object.values(perms).filter(Boolean).length
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-7 h-7 text-red-600" />
            权限管理
          </h1>
          <p className="text-gray-500 mt-1">管理所有用户的角色和页面访问权限</p>
        </div>
        <Button
          onClick={loadUsers}
          className="flex items-center gap-2"
          variant="outline"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          刷新列表
        </Button>
      </div>

      {message && (
        <div className={`mb-4 p-4 rounded-lg flex items-center gap-2 ${
          messageType === 'success' 
            ? 'bg-green-50 text-green-700 border border-green-200' 
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {messageType === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          {message}
        </div>
      )}

      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            type="text"
            placeholder="搜索用户名、邮箱或UID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
              <UserIcon className="w-6 h-6 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">总用户数</p>
              <p className="text-2xl font-bold text-gray-900">{users.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">管理员</p>
              <p className="text-2xl font-bold text-gray-900">
                {users.filter(u => u.role === 'admin').length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <Shield className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">超级管理员</p>
              <p className="text-2xl font-bold text-gray-900">
                {users.filter(u => u.role === 'superadmin').length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">UID</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">用户名</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">邮箱</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">角色</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">权限</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">创建时间</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                    <p className="text-gray-500 mt-2">加载中...</p>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <p className="text-gray-500">没有找到匹配的用户</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((userItem) => {
                  const roleOption = getRoleOption(userItem.role)
                  const isCurrentUser = user?._id === userItem._id
                  const hasAllPermissions = getAllPermissionsCount(userItem) === 9
                  
                  return (
                    <tr key={userItem._id} className="border-b hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm text-gray-600">{userItem.uid}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                            <UserIcon className="w-4 h-4 text-gray-600" />
                          </div>
                          <span className="font-medium text-gray-900">{userItem.username}</span>
                          {isCurrentUser && (
                            <Badge variant="secondary" className="text-xs">当前用户</Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 text-gray-600">
                          <Mail className="w-4 h-4" />
                          <span className="text-sm">{userItem.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge className={roleOption.color}>{roleOption.label}</Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {hasAllPermissions ? (
                            <Unlock className="w-4 h-4 text-green-500" />
                          ) : (
                            <Lock className="w-4 h-4 text-yellow-500" />
                          )}
                          <span className="text-sm text-gray-600">
                            {getAllPermissionsCount(userItem)}/9
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-500">
                          {userItem.createdAt 
                            ? new Date(userItem.createdAt).toLocaleDateString('zh-CN')
                            : '-'
                          }
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetail(userItem)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {user?.role === 'superadmin' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenUsernameChange(userItem)}
                              disabled={isCurrentUser}
                              className={isCurrentUser ? 'text-gray-300' : 'text-indigo-600 hover:text-indigo-700'}
                            >
                              <UserCog className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenRoleChange(userItem)}
                            disabled={isCurrentUser}
                            className={isCurrentUser ? 'text-gray-300' : 'text-yellow-600 hover:text-yellow-700'}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenPermissions(userItem)}
                            disabled={isCurrentUser}
                            className={isCurrentUser ? 'text-gray-300' : 'text-purple-600 hover:text-purple-700'}
                          >
                            <Settings className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDeleteConfirm(userItem)}
                            disabled={isCurrentUser}
                            className={isCurrentUser ? 'text-gray-300' : 'text-red-600 hover:text-red-700'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>修改用户角色</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">用户名</p>
                <p className="font-medium text-gray-900">{selectedUser.username}</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">选择新角色</label>
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择角色" />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions
                      .filter(option => user?.role === 'superadmin' || option.value !== 'superadmin')
                      .map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>
                  取消
                </Button>
                <Button onClick={handleRoleChange} className="bg-red-600 hover:bg-red-700">
                  确认修改
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">删除用户</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-700">确认删除用户？</p>
                  <p className="text-sm text-red-600 mt-1">
                    删除后将无法恢复此用户的所有数据。
                  </p>
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">待删除用户</p>
                <p className="font-medium text-gray-900">{selectedUser.username}</p>
                <p className="text-sm text-gray-500">{selectedUser.email}</p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                  取消
                </Button>
                <Button 
                  onClick={handleDeleteUser} 
                  className="bg-red-600 hover:bg-red-700"
                  disabled={user?._id === selectedUser._id}
                >
                  确认删除
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={permissionsDialogOpen} onOpenChange={setPermissionsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>管理页面权限</DialogTitle>
          </DialogHeader>
          {selectedUser && editingPermissions && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">用户名</p>
                <p className="font-medium text-gray-900">{selectedUser.username}</p>
              </div>
              
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">页面访问权限</label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleAllPermissions(true)}
                  >
                    全选
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleAllPermissions(false)}
                  >
                    全不选
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {permissionOptions.map((option) => (
                  <div
                    key={option.key}
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <Checkbox
                      id={option.key}
                      checked={editingPermissions[option.key as keyof Permissions]}
                      onChange={(e) => handlePermissionsChange(option.key as keyof Permissions, e.target.checked)}
                    />
                    <div className="flex-1">
                      <label
                        htmlFor={option.key}
                        className="text-sm font-medium text-gray-700 cursor-pointer"
                      >
                        {option.label}
                      </label>
                      <p className="text-xs text-gray-500">{option.description}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setPermissionsDialogOpen(false)}>
                  取消
                </Button>
                <Button onClick={handleSavePermissions} className="bg-purple-600 hover:bg-purple-700">
                  保存权限
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={usernameDialogOpen} onOpenChange={setUsernameDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>修改用户名</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">当前用户名</p>
                <p className="font-medium text-gray-900">{selectedUser.username}</p>
                <p className="text-xs text-gray-500 mt-2">邮箱</p>
                <p className="text-sm text-gray-900">{selectedUser.email}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="newUsername">新用户名</Label>
                <Input
                  id="newUsername"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="输入新用户名（3-20个字符）"
                />
                <p className="text-xs text-gray-500">
                  用户名长度必须在3-20个字符之间
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setUsernameDialogOpen(false)}>
                  取消
                </Button>
                <Button 
                  onClick={handleUsernameChange} 
                  className="bg-indigo-600 hover:bg-indigo-700"
                  disabled={!newUsername || newUsername.length < 3 || newUsername.length > 20}
                >
                  确认修改
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedUser && !roleDialogOpen && !deleteDialogOpen && !permissionsDialogOpen && !usernameDialogOpen} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>用户详情</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <UserIcon className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900">{selectedUser.username}</p>
                  <Badge className={getRoleOption(selectedUser.role).color}>{getRoleOption(selectedUser.role).label}</Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">UID</p>
                  <p className="font-mono text-sm text-gray-900">{selectedUser.uid}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">用户类型</p>
                  <p className="text-sm text-gray-900">{getUserTypeLabel(selectedUser.userType)}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">邮箱</p>
                  <p className="text-sm text-gray-900">{selectedUser.email}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">创建时间</p>
                  <p className="text-sm text-gray-900">
                    {selectedUser.createdAt 
                      ? new Date(selectedUser.createdAt).toLocaleString('zh-CN')
                      : '-'
                    }
                  </p>
                </div>
              </div>
              
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-2">页面权限状态</p>
                <div className="flex flex-wrap gap-2">
                  {permissionOptions.map((option) => {
                    const hasPermission = selectedUser.permissions?.[option.key as keyof Permissions] ?? true
                    return (
                      <Badge
                        key={option.key}
                        className={hasPermission ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}
                      >
                        {hasPermission ? <Unlock className="w-3 h-3 inline mr-1" /> : <Lock className="w-3 h-3 inline mr-1" />}
                        {option.label}
                      </Badge>
                    )
                  })}
                </div>
              </div>
              
              {selectedUser.bio && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">个人简介</p>
                  <p className="text-sm text-gray-900">{selectedUser.bio}</p>
                </div>
              )}
              <DialogFooter>
                <Button onClick={() => setSelectedUser(null)}>
                  关闭
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}