import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SciFiBackground } from '@/components/SciFiBackground'
import { CreditCard, Sparkles, Zap, Lock, User, Shield, Terminal, Cpu } from 'lucide-react'
import { toast } from 'sonner'

export function LoginPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [hoveredButton, setHoveredButton] = useState<string | null>(null)
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
    <div className="min-h-screen relative overflow-hidden">
      <SciFiBackground />
      
      <div className="relative z-10 min-h-screen flex flex-col lg:flex-row">
        {/* Left side - Hero */}
        <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-12">
          <div className="relative">
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute -bottom-10 -right-10 w-60 h-60 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
            
            <div className="relative space-y-8">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 backdrop-blur-xl flex items-center justify-center border border-cyan-400/30 shadow-lg shadow-cyan-500/20">
                  <Terminal className="w-10 h-10 text-cyan-400" />
                </div>
                <div className="flex flex-col">
                  <Sparkles className="w-8 h-8 text-cyan-400 mb-1" />
                </div>
              </div>

              <h1 className="text-6xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent leading-tight">
                星沉智库
              </h1>
              
              <div className="space-y-2">
                <p className="text-xl text-cyan-300/80 max-w-lg">
                  <span className="text-cyan-400">&gt;</span> 接入集换式卡牌管理系统
                </p>
                <p className="text-lg text-gray-400 max-w-lg">
                  智能库存分类 · 战队资源共享 · 安全交易市场
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: Cpu, label: '库存管理', value: '智能分类' },
                  { icon: Shield, label: '战队系统', value: '共享资源' },
                  { icon: Zap, label: '快捷查询', value: '精确查找' },
                  { icon: Lock, label: '自由交换', value: '自由便捷' },
                ].map((item, index) => (
                  <div 
                    key={item.label}
                    className="group bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-xl rounded-xl p-5 border border-cyan-500/20 hover:border-cyan-400/50 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <item.icon className="w-6 h-6 text-cyan-400 mb-2 group-hover:scale-110 transition-transform" />
                    <p className="text-sm text-gray-400 mb-1">{item.label}</p>
                    <p className="text-lg font-semibold text-cyan-300">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 text-cyan-400/60 font-mono text-sm">
                <span className="animate-pulse">●</span>
                <span>系统状态: 在线</span>
                <span className="animate-pulse" style={{ animationDelay: '0.5s' }}>●</span>
                <span>连接: 稳定</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Auth Form */}
        <div className="flex-1 flex items-center justify-center p-8 lg:p-12">
          <div className="relative w-full max-w-md">
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-cyan-500/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl" />
            
            <div className="relative bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-2xl rounded-3xl p-8 border border-cyan-500/20 shadow-2xl shadow-cyan-500/10">
              <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
              <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-purple-400/50 to-transparent" />
              
              <div className="space-y-1 mb-8">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                    {isLogin ? '系统登录' : '创建账户'}
                  </h2>
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" style={{ animationDelay: '0.2s' }} />
                    <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" style={{ animationDelay: '0.4s' }} />
                  </div>
                </div>
                <p className="text-gray-400">
                  {isLogin ? '请输入您的认证信息' : '填写信息建立连接'}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {!isLogin && (
                  <div className="space-y-2 group">
                    <label className="text-sm font-medium text-cyan-300 flex items-center gap-2">
                      <User className="w-4 h-4" />
                      用户名
                    </label>
                    <div className="relative">
                      <Input
                        type="text"
                        placeholder="输入用户名"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        required={!isLogin}
                        className="bg-gray-800/50 border-cyan-500/30 focus:border-cyan-400 focus:ring-cyan-400/20 text-white placeholder-gray-500 h-12 rounded-xl transition-all"
                      />
                      <div className="absolute inset-0 rounded-xl border border-cyan-400/0 group-focus-within:border-cyan-400/30 transition-colors pointer-events-none" />
                    </div>
                  </div>
                )}

                <div className="space-y-2 group">
                  <label className="text-sm font-medium text-cyan-300 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    邮箱地址
                  </label>
                  <div className="relative">
                    <Input
                      type="email"
                      placeholder="user@stardatabase.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      className="bg-gray-800/50 border-cyan-500/30 focus:border-cyan-400 focus:ring-cyan-400/20 text-white placeholder-gray-500 h-12 rounded-xl transition-all"
                    />
                    <div className="absolute inset-0 rounded-xl border border-cyan-400/0 group-focus-within:border-cyan-400/30 transition-colors pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-2 group">
                  <label className="text-sm font-medium text-cyan-300 flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    访问密码
                  </label>
                  <div className="relative">
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                      minLength={6}
                      className="bg-gray-800/50 border-cyan-500/30 focus:border-cyan-400 focus:ring-cyan-400/20 text-white placeholder-gray-500 h-12 rounded-xl transition-all"
                    />
                    <div className="absolute inset-0 rounded-xl border border-cyan-400/0 group-focus-within:border-cyan-400/30 transition-colors pointer-events-none" />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-14 relative overflow-hidden group bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white font-semibold text-lg rounded-xl transition-all duration-300 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-[1.02] active:scale-[0.98]"
                  onMouseEnter={() => setHoveredButton('submit')}
                  onMouseLeave={() => setHoveredButton(null)}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {isLoading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        连接中...
                      </>
                    ) : (
                      <>
                        <Zap className="w-5 h-5" />
                        {isLogin ? '登录系统' : '建立连接'}
                      </>
                    )}
                  </span>
                </Button>
              </form>

              <div className="mt-8 pt-6 border-t border-cyan-500/20">
                <div className="text-center">
                  <span className="text-gray-400">
                    {isLogin ? '还没有账户？' : '已有账户？'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsLogin(!isLogin)}
                    className="ml-2 text-cyan-400 hover:text-cyan-300 font-semibold relative group"
                    onMouseEnter={() => setHoveredButton('toggle')}
                    onMouseLeave={() => setHoveredButton(null)}
                  >
                    {isLogin ? '立即注册' : '立即登录'}
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-cyan-400 group-hover:w-full transition-all duration-300" />
                  </button>
                </div>
              </div>

              <div className="mt-6 flex justify-center gap-4">
                {[Cpu, Shield, Zap].map((Icon, i) => (
                  <div
                    key={i}
                    className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 hover:border-cyan-400/50 transition-all hover:scale-110"
                  >
                    <Icon className="w-5 h-5 text-cyan-400" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
