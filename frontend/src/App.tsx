// TCG卡牌综合管理系统 - 根组件
// 负责整个应用的路由配置、认证上下文和权限控制

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { SuperAdminProtectedRoute } from './components/SuperAdminProtectedRoute'
import { MainLayout } from './components/layout/MainLayout'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { InventoryPage } from './pages/InventoryPage'
import { TeamsPage } from './pages/TeamsPage'
import { TeamDetailPage } from './pages/TeamDetailPage'
import { TeamInventoryPage } from './pages/TeamInventoryPage'
import { ShopsPage } from './pages/ShopsPage'
import { ShopDashboardPage } from './pages/ShopDashboardPage'
import { ShopManagementPage } from './pages/ShopManagementPage'
import { DeckBuildingPage } from './pages/DeckBuildingPage'
import { DeckCollectionPage } from './pages/DeckCollectionPage'
import { DeckDetailPage } from './pages/DeckDetailPage'
import { MarketplacePage } from './pages/MarketplacePage'
import { TradeHistoryPage } from './pages/TradeHistoryPage'
import { MessagesPage } from './pages/MessagesPage'
import { FavoritesPage } from './pages/FavoritesPage'
import { TeamInvitesPage } from './pages/TeamInvitesPage'
import { FriendsPage } from './pages/FriendsPage'

import { SettingsPage } from './pages/SettingsPage'
import { PermissionManagementPage } from './pages/PermissionManagementPage'
import { GachaPage } from './pages/GachaPage'
import { InventoryDataManagementPage } from './pages/InventoryDataManagementPage'
import { OrdersPage } from './pages/OrdersPage'
import { OrdersAndFavoritesPage } from './pages/OrdersAndFavoritesPage'
import { GroupChatManagementPage } from './pages/GroupChatManagementPage'
import { TasksPage } from './pages/TasksPage'
import { TaskManagementPage } from './pages/TaskManagementPage'
import { AnnouncementsPage } from './pages/AnnouncementsPage'
import { PlatformStorePage } from './pages/PlatformStorePage'
import { PlatformStoreManagementPage } from './pages/PlatformStoreManagementPage'
import { GachaProbabilityManager } from './pages/GachaProbabilityManager'
import { CardTypeManagementPage } from './pages/CardTypeManagementPage'
import { useAuth } from './contexts/AuthContext'

// 数据分析页面的保护组件 - 仅管理员和超级管理员可访问
function AnalyticsProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth()

  // 认证加载中显示加载动画
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  // 未登录重定向到登录页
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // 检查用户角色是否为管理员或超级管理员
  const hasAccess = user?.role === 'admin' || user?.role === 'superadmin'

  // 无权限显示访问拒绝页面
  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-red-600 mb-2">访问被拒绝</h1>
          <p className="text-gray-500">您没有权限访问此页面</p>
          <p className="text-sm text-gray-400 mt-2">只有管理员和超级管理员可以访问此功能</p>
        </div>
      </div>
    )
  }

  // 有权限渲染子组件
  return <>{children}</>
}

// 根组件 - 配置应用路由和上下文
function App() {
  return (
    // 认证上下文提供者 - 为整个应用提供认证状态
    <AuthProvider>
      {/* 浏览器路由 - 使用HTML5 History API */}
      <BrowserRouter>
        {/* 路由配置 */}
        <Routes>
          {/* 认证路由 - 无需登录即可访问 */}
          <Route path="/login" element={<LoginPage />} />
          
          {/* 受保护路由 - 需要登录才能访问，包含主布局 */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            {/* 首页重定向到仪表板 */}
            <Route index element={<Navigate to="/dashboard" replace />} />
            {/* 仪表板 - 用户概览页面 */}
            <Route path="dashboard" element={<DashboardPage />} />
            {/* 公告页面 */}
            <Route path="announcements" element={<AnnouncementsPage />} />
            {/* 任务页面 */}
            <Route path="tasks" element={<TasksPage />} />
            {/* 平台商城页面 */}
            <Route path="platform-store" element={<PlatformStorePage />} />
            {/* 个人库存页面 */}
            <Route path="inventory" element={<InventoryPage />} />
            {/* 团队列表页面 */}
            <Route path="teams" element={<TeamsPage />} />
            {/* 团队详情页面 */}
            <Route path="teams/:id" element={<TeamDetailPage />} />
            {/* 团队库存页面 */}
            <Route path="teams/:id/inventory" element={<TeamInventoryPage />} />
            {/* 商店列表页面 */}
            <Route path="shops" element={<ShopsPage />} />
            {/* 商店仪表板 */}
            <Route path="shops/:id/dashboard" element={<ShopDashboardPage />} />
            {/* 商店管理页面 */}
            <Route path="shops/:id/management" element={<ShopManagementPage />} />
            {/* 卡组构建页面 */}
            <Route path="deck-building" element={<DeckBuildingPage />} />
            {/* 卡组收藏页面 */}
            <Route path="decks" element={<DeckCollectionPage />} />
            {/* 卡组详情页面 */}
            <Route path="decks/:id" element={<DeckDetailPage />} />
            {/* 抽卡页面 */}
            <Route path="gacha" element={<GachaPage />} />
            {/* 交易市场页面 */}
            <Route path="marketplace" element={<MarketplacePage />} />
            {/* 交易历史页面 */}
            <Route path="marketplace/history" element={<TradeHistoryPage />} />
            {/* 消息页面 */}
            <Route path="messages" element={<MessagesPage />} />
            {/* 好友页面 */}
            <Route path="friends" element={<FriendsPage />} />
            {/* 团队邀请页面 */}
            <Route path="team-invites" element={<TeamInvitesPage />} />
            {/* 收藏页面 */}
            <Route path="favorites" element={<OrdersAndFavoritesPage />} />
            {/* 订单页面 */}
            <Route path="orders" element={<OrdersAndFavoritesPage />} />
            {/* 群聊管理页面 - 管理员专属 */}
            <Route path="group-chats" element={
              <AnalyticsProtectedRoute>
                <GroupChatManagementPage />
              </AnalyticsProtectedRoute>
            } />
            {/* 设置页面 */}
            <Route path="settings" element={<SettingsPage />} />
            {/* 权限管理页面 - 超级管理员专属 */}
            <Route
              path="permissions"
              element={
                <SuperAdminProtectedRoute>
                  <PermissionManagementPage />
                </SuperAdminProtectedRoute>
              }
            />
            {/* 库存数据管理页面 - 超级管理员专属 */}
            <Route
              path="inventory-data-management"
              element={
                <SuperAdminProtectedRoute>
                  <InventoryDataManagementPage />
                </SuperAdminProtectedRoute>
              }
            />
            {/* 任务管理页面 - 管理员专属 */}
            <Route
              path="task-management"
              element={
                <AnalyticsProtectedRoute>
                  <TaskManagementPage />
                </AnalyticsProtectedRoute>
              }
            />
            {/* 平台商城管理页面 - 管理员专属 */}
            <Route
              path="platform-store-management"
              element={
                <AnalyticsProtectedRoute>
                  <PlatformStoreManagementPage />
                </AnalyticsProtectedRoute>
              }
            />
            {/* 抽卡概率管理页面 - 管理员专属 */}
            <Route
              path="gacha-probability"
              element={
                <AnalyticsProtectedRoute>
                  <GachaProbabilityManager />
                </AnalyticsProtectedRoute>
              }
            />
            {/* 卡牌类型管理页面 - 管理员专属 */}
            <Route
              path="card-type-management"
              element={
                <AnalyticsProtectedRoute>
                  <CardTypeManagementPage />
                </AnalyticsProtectedRoute>
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

// 导出根组件
export default App
