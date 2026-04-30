import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { Button } from '@/components/ui/button'
import { ExternalLink } from 'lucide-react'

export function MainLayout() {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="pl-64">
        <div className="bg-gradient-to-r from-muted/50 to-muted px-6 py-3 border-b border-border">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center gap-8">
              <span className="text-sm font-medium text-muted-foreground">特别鸣谢:</span>
              <div className="flex items-center gap-6">
                <span className="font-semibold text-primary">赞助商1</span>
                <span className="text-muted-foreground">赞助商 2</span>
                <span className="text-muted-foreground">赞助商 3</span>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="gap-1">
              了解更多 <ExternalLink className="w-3 h-3" />
            </Button>
          </div>
        </div>
        <Header />
        <main className="p-6 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
