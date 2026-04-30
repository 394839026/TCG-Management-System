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
import { DecksPage } from './pages/DecksPage'
import { DeckDetailPage } from './pages/DeckDetailPage'
import { MarketplacePage } from './pages/MarketplacePage'
import { TradeHistoryPage } from './pages/TradeHistoryPage'
import { MessagesPage } from './pages/MessagesPage'
import { FavoritesPage } from './pages/FavoritesPage'
import { TeamInvitesPage } from './pages/TeamInvitesPage'
import { FriendsPage } from './pages/FriendsPage'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { SettingsPage } from './pages/SettingsPage'
import { PermissionManagementPage } from './pages/PermissionManagementPage'
import { useAuth } from './contexts/AuthContext'

// 创建数据分析页面的保护组件
function AnalyticsProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  const hasAccess = user?.role === 'admin' || user?.role === 'superadmin'

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

  return <>{children}</>
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Auth routes */}
          <Route path="/login" element={<LoginPage />} />
          
          {/* Protected routes with layout */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="teams" element={<TeamsPage />} />
            <Route path="teams/:id" element={<TeamDetailPage />} />
            <Route path="teams/:id/inventory" element={<TeamInventoryPage />} />
            <Route path="shops" element={<ShopsPage />} />
            <Route path="shops/:id/dashboard" element={<ShopDashboardPage />} />
            <Route path="decks" element={<DecksPage />} />
            <Route path="decks/:id" element={<DeckDetailPage />} />
            <Route path="marketplace" element={<MarketplacePage />} />
            <Route path="marketplace/history" element={<TradeHistoryPage />} />
            <Route path="messages" element={<MessagesPage />} />
            <Route path="friends" element={<FriendsPage />} />
            <Route path="team-invites" element={<TeamInvitesPage />} />
            <Route path="favorites" element={<FavoritesPage />} />
            <Route path="analytics" element={
              <AnalyticsProtectedRoute>
                <AnalyticsPage />
              </AnalyticsProtectedRoute>
            } />
            <Route path="settings" element={<SettingsPage />} />
            <Route
              path="permissions"
              element={
                <SuperAdminProtectedRoute>
                  <PermissionManagementPage />
                </SuperAdminProtectedRoute>
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
