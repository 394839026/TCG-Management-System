// 主布局组件 - 提供应用的整体布局结构

import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { Button } from '@/components/ui/button'
import { ExternalLink } from 'lucide-react'

// 主布局组件
export function MainLayout() {
  return (
    // 主容器 - 最小高度占满屏幕
    <div className="min-h-screen bg-background">
      {/* 侧边栏导航 */}
      <Sidebar />
      {/* 主内容区域 - 为侧边栏留出空间 */}
      <div className="pl-64">
        {/* 顶部赞助商标识区域 */}
        <div className="bg-gradient-to-r from-muted/50 to-muted px-6 py-3 border-b border-border">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center gap-8">
              <span className="text-sm font-medium text-muted-foreground">特别鸣谢:</span>
              {/* 赞助商列表 */}
              <div className="flex items-center gap-6">
                <span className="font-semibold text-primary">赞助商1</span>
                <span className="text-muted-foreground">赞助商 2</span>
                <span className="text-muted-foreground">赞助商 3</span>
              </div>
            </div>
            {/* 了解更多按钮 */}
            <Button variant="ghost" size="sm" className="gap-1">
              了解更多 <ExternalLink className="w-3 h-3" />
            </Button>
          </div>
        </div>
        {/* 顶部导航栏 */}
        <Header />
        {/* 页面内容区域 - 使用Outlet渲染子路由 */}
        <main className="p-6 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
