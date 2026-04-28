import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Download, TrendingUp, DollarSign, Package } from 'lucide-react'
import { analyticsService } from '@/services/api'
import { formatCurrency } from '@/lib/utils'

export function AnalyticsPage() {
  const { data: inventoryData, isLoading: invLoading } = useQuery({
    queryKey: ['analyticsInventory'],
    queryFn: () => analyticsService.getInventory(),
  })

  const { data: valueTrendData } = useQuery({
    queryKey: ['analyticsValueTrend'],
    queryFn: () => analyticsService.getValueTrend('month'),
  })

  const { data: spendingData } = useQuery({
    queryKey: ['analyticsSpending'],
    queryFn: () => analyticsService.getSpending(),
  })

  const analytics = inventoryData?.data
  const valueTrend = valueTrendData?.data || []
  const spending = spendingData?.data

  // Transform rarity data for pie chart
  const rarityData = (analytics?.byRarity || []).map((r: any) => ({
    name: r._id || '未知',
    value: r.count,
    color: r._id === 'UR' ? '#8b5cf6' : r._id === 'SR' ? '#06b6d4' : r._id === 'R' ? '#10b981' : '#6b7280',
  }))

  // Transform value trend for line chart
  const chartValueData = valueTrend.map((item: any) => ({
    month: new Date(item._id).toLocaleDateString('zh-CN', { month: 'short' }),
    value: item.totalValue,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">数据分析</h1>
          <p className="text-muted-foreground mt-1">库存价值和支出分析</p>
        </div>
        <Button variant="outline">
          <Download className="w-4 h-4 mr-2" />
          导出报告
        </Button>
      </div>

      {/* Summary stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">总库存价值</CardTitle>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {invLoading ? '...' : formatCurrency(analytics?.overall?.totalValue || 0)}
            </div>
            <p className="text-xs text-green-600 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              +12.5% 较上月
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">本月支出</CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {invLoading ? '...' : formatCurrency(spending?.overall?.totalSpent || 0)}
            </div>
            <p className="text-xs text-muted-foreground">卡牌采购</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">物品总数</CardTitle>
            <Package className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {invLoading ? '...' : analytics?.overall?.totalItems || 0}
            </div>
            <p className="text-xs text-muted-foreground">{analytics?.overall?.totalQuantity || 0} 件物品</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Value trend */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>库存价值趋势</CardTitle>
            <CardDescription>过去6个月的库存价值变化</CardDescription>
          </CardHeader>
          <CardContent>
            {chartValueData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartValueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))' }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                暂无数据
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rarity distribution */}
        <Card>
          <CardHeader>
            <CardTitle>稀有度分布</CardTitle>
            <CardDescription>按稀有度统计卡牌数量</CardDescription>
          </CardHeader>
          <CardContent>
            {rarityData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={rarityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {rarityData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                暂无数据
              </div>
            )}
          </CardContent>
        </Card>

        {/* Spending chart */}
        <Card>
          <CardHeader>
            <CardTitle>月度支出</CardTitle>
            <CardDescription>每月的卡牌采购支出</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] flex items-center justify-center text-muted-foreground">
              支出数据将在有交易记录后显示
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
