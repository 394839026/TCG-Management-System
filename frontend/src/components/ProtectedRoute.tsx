// 受保护路由组件 - 确保用户必须登录才能访问的路由

import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

// 受保护路由组件
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  // 认证加载中 - 显示加载动画
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  // 未认证 - 重定向到登录页
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // 已认证 - 渲染子组件
  return <>{children}</>
}
