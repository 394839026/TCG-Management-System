import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
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
  Settings,
  LogOut,
  Shield,
  UserPlus,
  Sparkles,
  Database,
  ShoppingCart,
  UsersRound,
  Crown,
  Bell,
  Trophy,
  ListTodo,
  Gift,
  Store as StoreIcon,
  User,
  Wrench,
  ChevronLeft,
  ChevronRight,
  Settings as SettingsIcon,
  History,
  Layers,
} from 'lucide-react'

const userNavigation = [
  { name: '个人主页', href: '/dashboard', icon: LayoutDashboard },
  { name: '公告中心', href: '/announcements', icon: Bell },
  { name: '任务中心', href: '/tasks', icon: Trophy },
  { name: '智库兑换窗口', href: '/platform-store', icon: Gift },
  { name: '个人库存管理', href: '/inventory', icon: CreditCard },
  { name: '战队', href: '/teams', icon: Users },
  { name: '店铺列表', href: '/shops', icon: Store },
  { name: '卡组构筑', href: '/deck-building', icon: Crown },
  { name: '卡组管理', href: '/decks', icon: BookOpen },
  { name: '抽卡模拟器', href: '/gacha', icon: Sparkles },
  { name: '星网订单', href: '/marketplace', icon: Repeat },
  { name: '消息中心', href: '/messages', icon: MessageCircle },
  { name: '好友系统', href: '/friends', icon: Users2 },
  { name: '我的订单与收藏', href: '/favorites', icon: Heart },
]

const adminNavigation = [
  { name: '群聊管理', href: '/group-chats', icon: UsersRound },
  { name: '任务管理', href: '/task-management', icon: ListTodo },
  { name: '智库兑换窗口管理', href: '/platform-store-management', icon: StoreIcon },
  { name: '卡片类型管理', href: '/card-type-management', icon: Layers },
  { name: '抽卡概率管理', href: '/gacha-probability', icon: SettingsIcon },
]

const superadminNavigation = [
  { name: '权限管理', href: '/permissions', icon: Shield },
  { name: '库存模板数据管理', href: '/inventory-data-management', icon: Database },
]

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState(0) // 0: 用户页, 1: 管理页

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin'
  const isSuperadmin = user?.role === 'superadmin'

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // 检查是否在管理页面
  const isOnAdminPage = [
    '/group-chats',
    '/task-management',
    '/platform-store-management',
    '/card-type-management',
    '/permissions',
    '/inventory-data-management',
    '/gacha-probability'
  ].some(path => location.pathname.startsWith(path))

  // 上次的路径，用于检测路径变化
  const [lastPath, setLastPath] = useState(location.pathname)

  // 只在从用户页面导航到管理页面时自动切换标签
  useEffect(() => {
    if (location.pathname !== lastPath) {
      setLastPath(location.pathname)
      if (isAdmin && isOnAdminPage) {
        setActiveTab(1)
      }
    }
  }, [location.pathname, lastPath, isAdmin, isOnAdminPage])

  // 显示的导航项
  const currentNavigation = activeTab === 0 
    ? userNavigation 
    : [...adminNavigation, ...(isSuperadmin ? superadminNavigation : [])]

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
          <h1 className="text-sidebar-foreground font-semibold">星沉智库</h1>
          <p className="text-xs text-sidebar-foreground/60">{user?.username || '玩家'}</p>
        </div>
      </div>

      {/* 页签切换 - 只对管理员显示 */}
      {isAdmin && (
        <div className="flex items-center justify-center px-4 py-2 border-b border-sidebar-border gap-1">
          <button
            onClick={() => {
              setActiveTab(0)
              // 如果当前不在用户页面，导航到dashboard
              if (isOnAdminPage) {
                navigate('/dashboard')
              }
            }}
            className={cn(
              'flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              activeTab === 0
                ? 'bg-primary/20 text-primary'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-border/30 hover:text-sidebar-foreground'
            )}
          >
            <User className="w-4 h-4" />
            <span>用户</span>
          </button>
          <button
            onClick={() => {
              setActiveTab(1)
              // 如果当前不在管理页面，导航到第一个管理页面
              if (!isOnAdminPage) {
                navigate('/group-chats')
              }
            }}
            className={cn(
              'flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              activeTab === 1
                ? 'bg-red-500/20 text-red-500'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-border/30 hover:text-sidebar-foreground'
            )}
          >
            <Wrench className="w-4 h-4" />
            <span>管理</span>
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
        {currentNavigation.map((item) => {
            const isActive = location.pathname === item.href
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                  isActive
                    ? (activeTab === 1
                        ? 'bg-red-500/20 text-red-500 shadow-sm'
                        : 'bg-primary/20 text-primary shadow-sm')
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
