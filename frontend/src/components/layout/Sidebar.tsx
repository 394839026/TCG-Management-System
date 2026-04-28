import { Link, useLocation, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import {
  LayoutDashboard,
  CreditCard,
  Users,
  Store,
  BookOpen,
  Repeat,
  MessageCircle,
  Users2,
  Heart,
  BarChart3,
  Settings,
  LogOut,
} from 'lucide-react'

const navigation = [
  { name: '仪表板', href: '/dashboard', icon: LayoutDashboard },
  { name: '库存管理', href: '/inventory', icon: CreditCard },
  { name: '战队', href: '/teams', icon: Users },
  { name: '店铺', href: '/shops', icon: Store },
  { name: '卡组', href: '/decks', icon: BookOpen },
  { name: '交易市场', href: '/marketplace', icon: Repeat },
  { name: '消息中心', href: '/messages', icon: MessageCircle },
  { name: '好友系统', href: '/friends', icon: Users2 },
  { name: '我的收藏', href: '/favorites', icon: Heart },
  { name: '数据分析', href: '/analytics', icon: BarChart3 },
]

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar border-r border-sidebar-border transition-transform',
        className
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
          <span className="text-white font-bold text-lg">TCG</span>
        </div>
        <div>
          <h1 className="text-sidebar-foreground font-semibold">卡牌管理系统</h1>
          <p className="text-xs text-sidebar-foreground/60">{user?.username || '玩家'}</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-primary/20 text-primary shadow-sm'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-border/30 hover:text-sidebar-foreground'
              )}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.name}</span>
            </Link>
          )
        })}
      </nav>

      {/* Bottom actions */}
      <div className="px-3 py-4 border-t border-sidebar-border space-y-1">
        <Link
          to="/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-border/30 hover:text-sidebar-foreground transition-colors"
        >
          <Settings className="w-5 h-5" />
          <span>设置</span>
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>退出登录</span>
        </button>
      </div>
    </aside>
  )
}
