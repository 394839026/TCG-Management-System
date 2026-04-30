import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CreditCard, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

export function LoginPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const { login, register, isAuthenticated, isLoading: authLoading } = useAuth()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
  })

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      console.log('LoginPage: User authenticated, navigating to dashboard...')
      navigate('/dashboard', { replace: true })
    }
  }, [isAuthenticated, authLoading, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      console.log('Attempting login with:', formData.email)
      
      if (isLogin) {
        await login(formData.email, formData.password)
        console.log('Login successful, waiting for state update...')
        toast.success('登录成功！')
      } else {
        await register(formData.username, formData.email, formData.password)
        console.log('Registration successful, waiting for state update...')
        toast.success('注册成功！')
      }
    } catch (error: any) {
      console.error('Login/Register error:', error)
      const message = error.response?.data?.message || 
        error.message ||
        (isLogin ? '登录失败，请检查邮箱和密码' : '注册失败，请稍后重试')
      toast.error(message)
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Hero */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-hero relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-20 w-72 h-72 bg-primary/30 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-accent/30 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-14 h-14 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
              <CreditCard className="w-8 h-8" />
            </div>
            <Sparkles className="w-6 h-6 text-primary-glow" />
          </div>

          <h1 className="text-5xl font-bold mb-6 leading-tight">
            TCG卡牌<br />综合管理系统
          </h1>
          <p className="text-lg text-white/80 mb-8 max-w-md">
            管理你的集换式卡牌收藏、组建战队、经营店铺、交易卡牌，一站式卡牌管理平台
          </p>

          <div className="grid grid-cols-2 gap-4">
            {[
              { label: '库存管理', value: '智能分类' },
              { label: '战队系统', value: '共享资源' },
              { label: '店铺列表', value: '销售统计' },
              { label: '交易市场', value: '安全可靠' },
            ].map((item) => (
              <div key={item.label} className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                <p className="text-sm text-white/60">{item.label}</p>
                <p className="text-lg font-semibold">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <Card className="w-full max-w-md shadow-elegant">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">
              {isLogin ? '欢迎回来' : '创建账号'}
            </CardTitle>
            <CardDescription>
              {isLogin ? '请输入您的账号信息' : '填写以下信息开始使用'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">用户名</label>
                  <Input
                    type="text"
                    placeholder="输入用户名"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    required={!isLogin}
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">邮箱</label>
                <Input
                  type="email"
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">密码</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength={6}
                />
              </div>

              <Button type="submit" variant="premium" className="w-full" disabled={isLoading}>
                {isLoading ? '处理中...' : isLogin ? '登录' : '注册'}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">
                {isLogin ? '还没有账号？' : '已有账号？'}
              </span>
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="ml-2 text-primary hover:underline font-medium"
              >
                {isLogin ? '立即注册' : '立即登录'}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
