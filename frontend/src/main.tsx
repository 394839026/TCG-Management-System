// TCG卡牌综合管理系统 - 前端入口文件
// 负责初始化React应用、配置React Query和Toast组件

import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import App from './App'
import './index.css'

// 创建React Query客户端 - 用于数据获取和缓存管理
// 配置默认查询选项：5分钟过期时间，失败重试1次
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 数据5分钟后视为过期
      retry: 1, // 查询失败时重试1次
    },
  },
})

// 渲染React应用到DOM
ReactDOM.createRoot(document.getElementById('root')!).render(
  // React严格模式 - 帮助检测潜在问题
  <React.StrictMode>
    {/* React Query提供者 - 为整个应用提供数据查询能力 */}
    <QueryClientProvider client={queryClient}>
      {/* 根组件 */}
      <App />
      {/* Toast消息组件 - 显示全局通知消息 */}
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  </React.StrictMode>,
)
