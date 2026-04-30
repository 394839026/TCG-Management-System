import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { User, Palette, Bell, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'appearance' | 'notifications'>('profile')
  const [copied, setCopied] = useState(false)
  const { user } = useAuth()

  const handleSave = () => {
    toast.success('设置已保存')
  }

  const handleCopyUid = () => {
    if (user?.uid) {
      navigator.clipboard.writeText(user.uid)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast.success('UID已复制到剪贴板')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">设置</h1>
        <p className="text-muted-foreground mt-1">管理你的账户和偏好</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <Button
          variant={activeTab === 'profile' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('profile')}
          className="rounded-b-none"
        >
          <User className="w-4 h-4 mr-2" />
          个人资料
        </Button>
        <Button
          variant={activeTab === 'appearance' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('appearance')}
          className="rounded-b-none"
        >
          <Palette className="w-4 h-4 mr-2" />
          外观设置
        </Button>
        <Button
          variant={activeTab === 'notifications' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('notifications')}
          className="rounded-b-none"
        >
          <Bell className="w-4 h-4 mr-2" />
          通知设置
        </Button>
      </div>

      {/* Profile settings */}
      {activeTab === 'profile' && (
        <Card>
          <CardHeader>
            <CardTitle>个人资料</CardTitle>
            <CardDescription>更新你的个人信息</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">用户ID (UID)</label>
                <div className="flex items-center gap-2">
                  <Input 
                    value={user?.uid || '加载中...'} 
                    readOnly 
                    className="bg-muted"
                  />
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={handleCopyUid}
                    disabled={!user?.uid}
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">这是你的唯一用户标识，无法修改</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">角色</label>
                <Badge variant="outline" className="px-3 py-2">
                  {user?.role === 'superadmin' ? '超级管理员' : user?.role === 'admin' ? '管理员' : '普通用户'}
                </Badge>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">用户名</label>
                <Input defaultValue={user?.username || '玩家123'} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">邮箱</label>
                <Input type="email" defaultValue={user?.email || 'player@example.com'} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">个人简介</label>
              <textarea
                className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="介绍一下自己..."
                defaultValue={user?.bio || '热爱集换式卡牌游戏的玩家'}
              />
            </div>
            <Button onClick={handleSave}>保存更改</Button>
          </CardContent>
        </Card>
      )}

      {/* Appearance settings */}
      {activeTab === 'appearance' && (
        <Card>
          <CardHeader>
            <CardTitle>外观设置</CardTitle>
            <CardDescription>自定义界面主题和显示</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <label className="text-sm font-medium">主题模式</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => document.documentElement.classList.remove('dark')}
                  className="p-4 rounded-lg border-2 border-primary bg-card hover:bg-accent transition-colors"
                >
                  <div className="text-center font-medium">浅色模式</div>
                </button>
                <button
                  onClick={() => document.documentElement.classList.add('dark')}
                  className="p-4 rounded-lg border-2 border-border bg-card hover:bg-accent transition-colors"
                >
                  <div className="text-center font-medium">深色模式</div>
                </button>
              </div>
            </div>
            <Button onClick={handleSave}>保存更改</Button>
          </CardContent>
        </Card>
      )}

      {/* Notification settings */}
      {activeTab === 'notifications' && (
        <Card>
          <CardHeader>
            <CardTitle>通知设置</CardTitle>
            <CardDescription>管理通知偏好</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: '交易消息通知', desc: '收到新的交易消息时通知' },
              { label: '战队活动通知', desc: '战队成员加入或活动时通知' },
              { label: '价格变动提醒', desc: '收藏的卡牌价格变动时通知' },
              { label: '系统公告', desc: '接收系统更新和公告' },
            ].map((item, index) => (
              <div key={index} className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <p className="font-medium">{item.label}</p>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                </label>
              </div>
            ))}
            <Button onClick={handleSave} className="mt-4">保存更改</Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
