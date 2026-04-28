import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { MainLayout } from './components/layout/MainLayout'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { InventoryPage } from './pages/InventoryPage'
import { TeamsPage } from './pages/TeamsPage'
import { TeamDetailPage } from './pages/TeamDetailPage'
import { ShopsPage } from './pages/ShopsPage'
import { ShopDashboardPage } from './pages/ShopDashboardPage'
import { DecksPage } from './pages/DecksPage'
import { DeckDetailPage } from './pages/DeckDetailPage'
import { MarketplacePage } from './pages/MarketplacePage'
import { TradeHistoryPage } from './pages/TradeHistoryPage'
import { MessagesPage } from './pages/MessagesPage'
import { FriendsPage } from './pages/FriendsPage'
import { FavoritesPage } from './pages/FavoritesPage'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { SettingsPage } from './pages/SettingsPage'

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
            <Route path="shops" element={<ShopsPage />} />
            <Route path="shops/:id/dashboard" element={<ShopDashboardPage />} />
            <Route path="decks" element={<DecksPage />} />
            <Route path="decks/:id" element={<DeckDetailPage />} />
            <Route path="marketplace" element={<MarketplacePage />} />
            <Route path="marketplace/history" element={<TradeHistoryPage />} />
            <Route path="messages" element={<MessagesPage />} />
            <Route path="friends" element={<FriendsPage />} />
            <Route path="favorites" element={<FavoritesPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
