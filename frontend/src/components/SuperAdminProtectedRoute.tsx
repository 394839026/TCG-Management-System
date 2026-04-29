import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function SuperAdminProtectedRoute({ children }: { children: React.ReactNode }) {
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

  if (user?.role !== 'superadmin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-red-600 mb-2">访问被拒绝</h1>
          <p className="text-gray-500">您没有权限访问此页面</p>
          <p className="text-sm text-gray-400 mt-2">只有超级管理员可以访问此功能</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}