import { Bell, Moon, Sun, User, LogOut, Coins, Award } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { friendService, messageService, notificationService } from '@/services/api'

interface HeaderProps {
  title?: string
}

export function Header({ title }: HeaderProps) {
  const [isDark, setIsDark] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const { data: friendRequestsData } = useQuery({
    queryKey: ['friendRequests'],
    queryFn: () => friendService.getRequests(),
    refetchInterval: 15000, // 每15秒刷新一次
  })

  const { data: unreadMessagesData } = useQuery({
    queryKey: ['unreadMessagesCount'],
    queryFn: () => messageService.getUnreadCount(),
    refetchInterval: 15000, // 每15秒刷新一次
  })

  const { data: unreadNotificationsData } = useQuery({
    queryKey: ['unreadNotificationsCount'],
    queryFn: () => notificationService.getUnreadCount(),
    refetchInterval: 15000, // 每15秒刷新一次
  })

  const friendRequestsCount = friendRequestsData?.data?.length || 0
  const unreadMessagesCount = unreadMessagesData?.count || 0
  const unreadNotificationsCount = unreadNotificationsData?.count || 0
  
  console.log('=== Header 未读消息调试 ===')
  console.log('friendRequestsCount:', friendRequestsCount)
  console.log('unreadMessagesCount:', unreadMessagesCount)
  console.log('unreadNotificationsCount:', unreadNotificationsCount)
  console.log('totalNotifications:', friendRequestsCount + unreadMessagesCount + unreadNotificationsCount)
  console.log('unreadMessagesData:', unreadMessagesData)
  
  const totalNotifications = friendRequestsCount + unreadMessagesCount + unreadNotificationsCount

  const handleMessageClick = () => {
    navigate('/messages')
  }

  const toggleTheme = () => {
    setIsDark(!isDark)
    document.documentElement.classList.toggle('dark')
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-30 glass border-b border-border">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          {title && <h2 className="text-xl font-semibold">{title}</h2>}
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="rounded-full"
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </Button>

          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full relative"
            onClick={handleMessageClick}
            title="消息中心"
          >
            <Bell className="w-5 h-5" />
            {totalNotifications > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs flex items-center justify-center"
              >
                {totalNotifications}
              </Badge>
            )}
          </Button>

          <div className="flex items-center gap-2 pl-2 border-l">
            <div className="text-right hidden sm:block mr-4">
              <p className="text-sm font-medium">{user?.username || '用户'}</p>
              <p className="text-xs text-muted-foreground">{user?.role || 'player'}</p>
            </div>
            
            {/* 星币和积分显示 */}
            <div className="flex items-center gap-4 mr-4">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-yellow-600" />
                <span className="font-medium text-sm">{user?.points || 0} 积分</span>
              </div>
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-600" />
                <span className="font-medium text-sm">{user?.coins || 0} 星币</span>
              </div>
            </div>
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full"
              onClick={() => navigate('/settings')}
              title="个人设置"
            >
              <User className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="rounded-full text-red-500 hover:text-red-600 hover:bg-red-50"
              title="退出登录"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
