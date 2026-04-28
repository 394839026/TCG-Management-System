import { Bell, Moon, Sun, User, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

interface HeaderProps {
  title?: string
}

export function Header({ title }: HeaderProps) {
  const [isDark, setIsDark] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()

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
          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="rounded-full"
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </Button>

          {/* Notifications */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full relative"
            onClick={() => navigate('/messages')}
            title="消息中心"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </Button>

          {/* User menu */}
          <div className="flex items-center gap-2 pl-2 border-l">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium">{user?.username || '用户'}</p>
              <p className="text-xs text-muted-foreground">{user?.role || 'player'}</p>
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
