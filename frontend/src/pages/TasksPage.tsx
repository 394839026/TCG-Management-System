import { useState, useEffect } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { Calendar, Trophy, Target, Zap, Coins, CheckCircle2, Clock, Star, Award } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { taskService, type Task } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { authService } from '@/services/auth'
import { toast } from 'sonner'

const TaskCard = ({ task, onClaim }: { task: Task; onClaim: (task: Task) => void }) => {
  const progress = task.userProgress?.progress || 0
  const target = task.target.value
  const percentage = Math.min((progress / target) * 100, 100)
  const isCompleted = task.userProgress?.status === 'completed'
  const isClaimed = task.userProgress?.status === 'claimed'

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'inventory': return <Target className="w-5 h-5 text-blue-500" />
      case 'trade': return <Zap className="w-5 h-5 text-purple-500" />
      case 'deck': return <Trophy className="w-5 h-5 text-yellow-500" />
      case 'shop': return <Coins className="w-5 h-5 text-green-500" />
      default: return <Star className="w-5 h-5 text-gray-500" />
    }
  }

  const getStatusBadge = (type: string) => {
    switch (type) {
      case 'daily': return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">每日</span>
      case 'weekly': return <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">每周</span>
      case 'achievement': return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">成就</span>
      default: return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">一次性</span>
    }
  }

  return (
    <Card className="transition-all duration-300 hover:shadow-lg border border-gray-200">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {getCategoryIcon(task.category)}
            <div>
              <CardTitle className="text-lg">{task.name}</CardTitle>
              <CardDescription>{task.description}</CardDescription>
            </div>
          </div>
          {getStatusBadge(task.type)}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">进度</span>
              <span className="font-medium">{progress} / {target}</span>
            </div>
            <Progress value={percentage} className="h-2" />
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-4 flex-wrap">
              {(task.rewards.exp || 0) > 0 && (
                <div className="flex items-center gap-1 text-yellow-600">
                  <Zap className="w-4 h-4" />
                  <span className="font-medium">+{task.rewards.exp} 经验</span>
                </div>
              )}
              {(task.rewards.points || 0) > 0 && (
                <div className="flex items-center gap-1 text-green-600">
                  <Star className="w-4 h-4" />
                  <span className="font-medium">+{task.rewards.points} 积分</span>
                </div>
              )}
              {(task.rewards.coins || 0) > 0 && (
                <div className="flex items-center gap-1 text-amber-600">
                  <Coins className="w-4 h-4" />
                  <span className="font-medium">+{task.rewards.coins} 星币</span>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                完成任务即可领取奖励
              </div>
              {isClaimed ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-medium">已领取</span>
                </div>
              ) : isCompleted ? (
                <Button onClick={() => onClaim(task)} className="bg-yellow-500 hover:bg-yellow-600">
                  领取奖励
                </Button>
              ) : (
                <div className="flex items-center gap-1 text-gray-400">
                  <Clock className="w-4 h-4" />
                  <span>进行中</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function TasksPage() {
  const { user, setUser } = useAuth()
  const queryClient = useQueryClient()
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [claimedTask, setClaimedTask] = useState<Task | null>(null)

  const { data: tasksData, isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => taskService.getMyTasks(),
    refetchInterval: 30000, // 30秒刷新
  })

  const tasks = (tasksData?.data || []).map((task: any) => ({
    ...task,
    rewards: {
      exp: task.rewards?.exp || 0,
      points: task.rewards?.points || 0,
      coins: task.rewards?.coins || 0
    }
  }))

  const dailyTasks = tasks.filter((t: Task) => t.type === 'daily' && t.isActive)
  const weeklyTasks = tasks.filter((t: Task) => t.type === 'weekly' && t.isActive)
  const achievementTasks = tasks.filter((t: Task) => t.type === 'achievement' && t.isActive)

  // 领取奖励的 mutation
  const claimRewardMutation = useMutation({
    mutationFn: (taskId: string) => taskService.claimReward(taskId),
    onSuccess: (response, taskId) => {
      const task = tasks.find((t: Task) => t._id === taskId)
      if (task) {
        setClaimedTask(task)
        setShowSuccessModal(true)
        
        // 更新用户数据
        if (user && setUser) {
          const updatedUser = {
            ...user,
            exp: (user.exp || 0) + (task.rewards.exp || 0),
            points: (user.points || 0) + (task.rewards.points || 0),
            coins: (user.coins || 0) + (task.rewards.coins || 0),
          }
          setUser(updatedUser)
          authService.setAuth(localStorage.getItem('token'), updatedUser)
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      toast.success('奖励领取成功！')
    },
    onError: (error: any) => {
      console.error('领取奖励失败:', error)
      toast.error(error.response?.data?.message || '领取奖励失败')
    }
  })

  const handleClaim = (task: Task) => {
    claimRewardMutation.mutate(task._id)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">任务中心</h1>
          <p className="text-gray-500">完成任务获取经验和积分</p>
        </div>
        <div className="flex items-center gap-4">
          {user && (
          <div className="flex items-center gap-2 bg-yellow-50 px-4 py-2 rounded-lg">
            <Award className="w-5 h-5 text-yellow-600" />
            <div className="font-medium text-yellow-700">
              Lv.{user.level}
            </div>
          </div>
        )}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-500">加载中...</p>
        </div>
      ) : (
        <Tabs defaultValue="daily" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="daily" className="text-base">
              每日任务
            </TabsTrigger>
            <TabsTrigger value="weekly" className="text-base">
              每周任务
            </TabsTrigger>
            <TabsTrigger value="achievement" className="text-base">
              成就
            </TabsTrigger>
          </TabsList>

          <TabsContent value="daily" className="space-y-4">
            {dailyTasks.length === 0 ? (
              <Card className="text-center">
                <CardContent className="p-8">
                  <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">暂无每日任务</h3>
                  <p className="text-gray-500">请稍后再来查看新的任务</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {dailyTasks.map((task: Task) => (
                  <TaskCard key={task._id} task={task} onClaim={handleClaim} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="weekly" className="space-y-4">
            {weeklyTasks.length === 0 ? (
              <Card className="text-center">
                <CardContent className="p-8">
                  <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">暂无每周任务</h3>
                  <p className="text-gray-500">请稍后再来查看新的任务</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {weeklyTasks.map((task: Task) => (
                  <TaskCard key={task._id} task={task} onClaim={handleClaim} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="achievement" className="space-y-4">
            {achievementTasks.length === 0 ? (
              <Card className="text-center">
                <CardContent className="p-8">
                  <Trophy className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">暂无成就</h3>
                  <p className="text-gray-500">完成更多活动来解锁成就</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {achievementTasks.map((task: Task) => (
                  <TaskCard key={task._id} task={task} onClaim={handleClaim} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-500" />
              恭喜！奖励已领取！
            </DialogTitle>
            <DialogDescription>
              任务完成，奖励已发放到您的账户
            </DialogDescription>
          </DialogHeader>
          {claimedTask && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{claimedTask.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6 justify-center text-lg flex-wrap">
                    {(claimedTask.rewards.exp || 0) > 0 && (
                      <div className="flex items-center gap-2 text-yellow-600">
                        <Zap className="w-5 h-5" />
                        <span className="font-medium">+{claimedTask.rewards.exp} 经验</span>
                      </div>
                    )}
                    {(claimedTask.rewards.points || 0) > 0 && (
                      <div className="flex items-center gap-2 text-green-600">
                        <Star className="w-5 h-5" />
                        <span className="font-medium">+{claimedTask.rewards.points} 积分</span>
                      </div>
                    )}
                    {(claimedTask.rewards.coins || 0) > 0 && (
                      <div className="flex items-center gap-2 text-amber-600">
                        <Coins className="w-5 h-5" />
                        <span className="font-medium">+{claimedTask.rewards.coins} 星币</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              <Button
                onClick={() => setShowSuccessModal(false)}
                className="w-full"
              >
                继续任务
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default TasksPage
