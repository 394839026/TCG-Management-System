import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Swords, Zap, Sparkles, RotateCcw, Minus, Plus, Users, ArrowLeft, Trophy, Check, Star, Maximize, Minimize } from 'lucide-react'

type GameMode = '1v1' | '2v2' | '4player' | null
type AppStep = 'mode' | 'colors' | 'battle'

interface PlayerState {
  score: number
  mana: number
  rune1: number
  rune2: number
  coloredRunes: number
  experience: number
}

interface PlayerColorSelection {
  colors: [string, string] | [null, null]
  confirmed: boolean
}

interface BattleState {
  players: PlayerState[]
  teamScores?: [number, number] // 2v2模式的阵营分数: [红方, 绿方]
  playerColors?: PlayerColorSelection[]
}

const RUNE_COLORS = [
  { name: '红色', value: 'red', bg: 'bg-red-500', border: 'border-red-500', text: 'text-red-600' },
  { name: '黄色', value: 'yellow', bg: 'bg-yellow-500', border: 'border-yellow-500', text: 'text-yellow-600' },
  { name: '蓝色', value: 'blue', bg: 'bg-blue-500', border: 'border-blue-500', text: 'text-blue-600' },
  { name: '绿色', value: 'green', bg: 'bg-green-500', border: 'border-green-500', text: 'text-green-600' },
  { name: '紫色', value: 'purple', bg: 'bg-purple-500', border: 'border-purple-500', text: 'text-purple-600' },
  { name: '橙色', value: 'orange', bg: 'bg-orange-500', border: 'border-orange-500', text: 'text-orange-600' },
]

export function RuneBattleCalculatorPage() {
  const [gameMode, setGameMode] = useState<GameMode>(null)
  const [appStep, setAppStep] = useState<AppStep>('mode')
  const [battleState, setBattleState] = useState<BattleState>({
    players: [],
  })
  const [diceResult, setDiceResult] = useState<number | null>(null)
  const [diceOpen, setDiceOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const playerThemes = [
    { border: 'border-red-200', bg: 'bg-red-50/50', text: 'text-red-700', score: 'text-red-600' },
    { border: 'border-green-200', bg: 'bg-green-50/50', text: 'text-green-700', score: 'text-green-600' },
    { border: 'border-blue-200', bg: 'bg-blue-50/50', text: 'text-blue-700', score: 'text-blue-600' },
    { border: 'border-purple-200', bg: 'bg-purple-50/50', text: 'text-purple-700', score: 'text-purple-600' },
  ]

  const getPlayerNames = (mode: GameMode) => {
    if (mode === '1v1') return ['对手', '我方']
    if (mode === '2v2') return ['红方1', '红方2', '绿方1', '绿方2']
    return ['玩家1', '玩家2', '玩家3', '玩家4']
  }

  const selectMode = (mode: GameMode) => {
    let playerCount = 2
    if (mode === '2v2' || mode === '4player') {
      playerCount = 4
    }
    const players: PlayerState[] = []
    const playerColors: PlayerColorSelection[] = []
    for (let i = 0; i < playerCount; i++) {
      players.push({
        score: 0,
        mana: 0,
        rune1: 0,
        rune2: 0,
        coloredRunes: 0,
        experience: 0,
      })
      playerColors.push({
        colors: [null, null],
        confirmed: false,
      })
    }
    setBattleState({ 
      players,
      teamScores: mode === '2v2' ? [0, 0] : undefined,
      playerColors,
    })
    setGameMode(mode)
    setAppStep('colors')
  }

  const toggleColor = (playerIndex: number, colorValue: string) => {
    setBattleState(prev => {
      if (!prev.playerColors) return prev
      
      const newPlayerColors = [...prev.playerColors]
      const playerColor = { ...newPlayerColors[playerIndex] }
      const currentColors = [...playerColor.colors]
      
      // 如果颜色已选，取消选择
      if (currentColors.includes(colorValue)) {
        const index = currentColors.indexOf(colorValue)
        currentColors[index] = null
      } 
      // 如果有空位，添加颜色
      else if (currentColors.includes(null)) {
        const emptyIndex = currentColors.indexOf(null)
        currentColors[emptyIndex] = colorValue
      }
      // 已满，替换第一个
      else {
        currentColors[0] = colorValue
      }
      
      playerColor.colors = currentColors as [string, string] | [null, null]
      newPlayerColors[playerIndex] = playerColor
      
      return { ...prev, playerColors: newPlayerColors }
    })
  }

  const confirmPlayerColors = (playerIndex: number) => {
    setBattleState(prev => {
      if (!prev.playerColors) return prev
      const newPlayerColors = [...prev.playerColors]
      newPlayerColors[playerIndex] = {
        ...newPlayerColors[playerIndex],
        confirmed: true,
      }
      return { ...prev, playerColors: newPlayerColors }
    })
  }

  const allColorsConfirmed = () => {
    if (!battleState.playerColors) return false
    return battleState.playerColors.every(pc => pc.confirmed && pc.colors[0] && pc.colors[1])
  }

  const startBattle = () => {
    if (allColorsConfirmed()) {
      setAppStep('battle')
    }
  }

  const goBack = () => {
    if (appStep === 'colors') {
      setAppStep('mode')
      setGameMode(null)
    } else if (appStep === 'battle') {
      setAppStep('colors')
    }
  }

  const resetBattle = () => {
    if (!gameMode) return
    selectMode(gameMode)
  }

  const ColorSelectionCard = ({ playerIndex, playerName, is2v2 = false }: { playerIndex: number; playerName: string; is2v2?: boolean }) => {
    const playerColor = battleState.playerColors?.[playerIndex]
    const theme = is2v2 ? 
      (playerIndex < 2 ? playerThemes[0] : playerThemes[1]) : 
      playerThemes[playerIndex]

    if (!playerColor) return null

    const selectedColors = playerColor.colors.filter(c => c !== null)
    const canConfirm = selectedColors.length === 2

    return (
      <Card className={`${theme.border} ${theme.bg}`}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className={`${theme.text} flex items-center gap-2`}>
              <Swords className="w-5 h-5" />
              {playerName}
            </CardTitle>
            {playerColor.confirmed && (
              <Badge variant="default" className="bg-green-500">
                <Check className="w-3 h-3 mr-1" />
                已确认
              </Badge>
            )}
          </div>
          <CardDescription>选择两个符能颜色</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 已选颜色显示 */}
          <div className="flex items-center justify-center gap-2">
            {[0, 1].map(index => (
              <div key={index} className="w-12 h-12 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center">
                {playerColor.colors[index] ? (
                  <div 
                    className={`w-10 h-10 rounded-full ${RUNE_COLORS.find(c => c.value === playerColor.colors[index])?.bg}`}
                  />
                ) : (
                  <span className="text-gray-400">?</span>
                )}
              </div>
            ))}
          </div>

          {!playerColor.confirmed && (
            <>
              {/* 颜色选择按钮 */}
              <div className="grid grid-cols-3 gap-2">
                {RUNE_COLORS.map(color => {
                  const isSelected = playerColor.colors.includes(color.value)
                  return (
                    <Button
                      key={color.value}
                      variant={isSelected ? "default" : "outline"}
                      className={`h-12 ${isSelected ? color.bg : ''}`}
                      onClick={() => toggleColor(playerIndex, color.value)}
                    >
                      <div className={`w-6 h-6 rounded-full ${color.bg} mr-2`} />
                      {color.name}
                    </Button>
                  )
                })}
              </div>

              {/* 确认按钮 */}
              <Button 
                className="w-full" 
                disabled={!canConfirm}
                onClick={() => confirmPlayerColors(playerIndex)}
              >
                确认颜色
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    )
  }

  const updatePlayerValue = (playerIndex: number, field: keyof PlayerState, delta: number) => {
    setBattleState(prev => ({
      ...prev,
      players: prev.players.map((player, idx) => {
        if (idx === playerIndex) {
          let updates: Partial<PlayerState> = {}
          const newValue = Math.max(0, player[field] + delta)
          updates[field] = newValue
          
          // 如果修改的是符能，需要更新总符能
          if (field === 'rune1' || field === 'rune2') {
            const otherRuneField = field === 'rune1' ? 'rune2' : 'rune1'
            const totalRunes = newValue + player[otherRuneField]
            let newColoredRunes
            if (delta > 0) {
              newColoredRunes = Math.max(player.coloredRunes, totalRunes)
            } else {
              newColoredRunes = Math.max(totalRunes, player.coloredRunes + delta)
            }
            updates.coloredRunes = newColoredRunes
          }
          
          return {
            ...player,
            ...updates,
          }
        }
        return player
      }),
    }))
  }

  const setPlayerValue = (playerIndex: number, field: keyof PlayerState, value: number) => {
    setBattleState(prev => ({
      ...prev,
      players: prev.players.map((player, idx) => {
        if (idx === playerIndex) {
          let newColoredRunes = player.coloredRunes
          // 如果修改的是符能，需要检查并更新总符能
          if (field === 'rune1' || field === 'rune2') {
            const otherRuneField = field === 'rune1' ? 'rune2' : 'rune1'
            const newValue = Math.max(0, value)
            const totalRunes = newValue + player[otherRuneField]
            const oldValue = player[field]
            const delta = newValue - oldValue
            // 如果是增加符能，确保总符能不小于当前符能总量
            // 如果是减少符能，总符能也要相应减少
            if (delta > 0) {
              newColoredRunes = Math.max(player.coloredRunes, totalRunes)
            } else {
              newColoredRunes = Math.max(totalRunes, player.coloredRunes + delta)
            }
          }
          // 如果修改的是总符能，确保不小于当前符能总量
          if (field === 'coloredRunes') {
            const totalRunes = player.rune1 + player.rune2
            newColoredRunes = Math.max(value, totalRunes)
          }
          return {
            ...player,
            [field]: field === 'coloredRunes' ? newColoredRunes : Math.max(0, value),
            ...(field === 'rune1' || field === 'rune2' ? { coloredRunes: newColoredRunes } : {}),
          }
        }
        return player
      }),
    }))
  }

  const updateRuneValue = (playerIndex: number, runeField: 'rune1' | 'rune2', delta: number) => {
    setBattleState(prev => ({
      ...prev,
      players: prev.players.map((player, idx) => {
        if (idx === playerIndex) {
          const newValue = Math.max(0, player[runeField] + delta)
          const otherRuneField = runeField === 'rune1' ? 'rune2' : 'rune1'
          const totalRunes = newValue + player[otherRuneField]
          // 如果是增加符能，确保总符能不小于当前符能总量
          // 如果是减少符能，总符能也要相应减少
          let newColoredRunes
          if (delta > 0) {
            newColoredRunes = Math.max(player.coloredRunes, totalRunes)
          } else {
            // 减少时，总符能不能小于当前符能总量，也不能超过原来的值
            newColoredRunes = Math.max(totalRunes, player.coloredRunes + delta)
          }
          return {
            ...player,
            [runeField]: newValue,
            coloredRunes: newColoredRunes,
          }
        }
        return player
      }),
    }))
  }

  const updateTotalRunes = (playerIndex: number, delta: number) => {
    setBattleState(prev => ({
      ...prev,
      players: prev.players.map((player, idx) => {
        if (idx === playerIndex) {
          const totalRunes = player.rune1 + player.rune2
          const newValue = Math.max(totalRunes, player.coloredRunes + delta)
          return {
            ...player,
            coloredRunes: newValue,
          }
        }
        return player
      }),
    }))
  }

  const updateTeamScore = (teamIndex: number, delta: number) => {
    setBattleState(prev => ({
      ...prev,
      teamScores: prev.teamScores ? [
        teamIndex === 0 ? Math.max(0, prev.teamScores[0] + delta) : prev.teamScores[0],
        teamIndex === 1 ? Math.max(0, prev.teamScores[1] + delta) : prev.teamScores[1],
      ] : undefined,
    }))
  }

  const setTeamScore = (teamIndex: number, value: number) => {
    setBattleState(prev => ({
      ...prev,
      teamScores: prev.teamScores ? [
        teamIndex === 0 ? Math.max(0, value) : prev.teamScores[0],
        teamIndex === 1 ? Math.max(0, value) : prev.teamScores[1],
      ] : undefined,
    }))
  }

  const rollDice = () => {
    const result = Math.floor(Math.random() * 6) + 1
    setDiceResult(result)
    setDiceOpen(true)
  }

  const DiceButton = () => (
    <Button
      variant="premium"
      size="icon"
      onClick={rollDice}
      className="h-14 w-14 rounded-full text-2xl shadow-lg hover:shadow-xl transition-all"
    >
      🎲
    </Button>
  )

  const DiceDialog = () => (
    <Dialog open={diceOpen} onOpenChange={setDiceOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">骰子结果</DialogTitle>
          <DialogDescription className="text-center">
            恭喜你掷出了以下点数！
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-center py-8">
          <div className="text-8xl font-bold bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 bg-clip-text text-transparent animate-bounce">
            {diceResult}
          </div>
        </div>
        <div className="flex justify-center">
          <Button
            variant="default"
            className="px-8"
            onClick={() => setDiceOpen(false)}
          >
            确定
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )

  const ValueControl = ({
    label,
    value,
    playerIndex,
    field,
    icon: Icon,
    className = '',
    compact = false,
  }: {
    label: string
    value: number
    playerIndex: number
    field: keyof PlayerState
    icon: any
    className?: string
    compact?: boolean
  }) => (
    <div className={`${compact ? 'space-y-1' : 'space-y-2'} ${className}`}>
      <div className="flex items-center justify-between">
        <Label className={`flex items-center gap-2 ${compact ? 'text-sm' : ''}`}>
          <Icon className={compact ? 'w-3 h-3' : 'w-4 h-4'} />
          {label}
        </Label>
      </div>
      <div className="relative flex items-center justify-center">
        <div className={`text-center ${compact ? 'text-2xl' : 'text-4xl'} font-bold absolute z-10 select-none text-white`}>
          {value}
        </div>
        <div className="flex items-center gap-0 w-full">
          <Button
            className={`${compact ? 'h-10' : 'h-16'} flex-1 bg-slate-600 hover:bg-slate-700 opacity-90 hover:opacity-100 transition-opacity rounded-r-none border-r-0 border-slate-700 disabled:!bg-slate-600 disabled:hover:!bg-slate-600 disabled:!opacity-90 disabled:hover:!opacity-90 disabled:!cursor-default disabled:!pointer-events-auto`}
            onClick={() => updatePlayerValue(playerIndex, field, -1)}
            disabled={value <= 0}
          >
            <Minus className={`${compact ? 'w-5 h-5' : 'w-8 h-8'} text-slate-200`} />
          </Button>
          <Button
            className={`${compact ? 'h-10' : 'h-16'} flex-1 bg-slate-600 hover:bg-slate-700 opacity-90 hover:opacity-100 transition-opacity rounded-l-none border-l-0 border-slate-700`}
            onClick={() => updatePlayerValue(playerIndex, field, 1)}
          >
            <Plus className={`${compact ? 'w-5 h-5' : 'w-8 h-8'} text-slate-200`} />
          </Button>
        </div>
      </div>
    </div>
  )

  const RuneControl = ({
    label,
    value,
    playerIndex,
    runeField,
    color,
    className = '',
    compact = false,
  }: {
    label: string
    value: number
    playerIndex: number
    runeField: 'rune1' | 'rune2'
    color: string
    className?: string
    compact?: boolean
  }) => {
    const colorData = RUNE_COLORS.find(c => c.value === color)
    const bgColor = colorData?.bg || 'bg-gray-400'
    const textColor = colorData?.text || 'text-gray-600'
    
    return (
      <div className={`${compact ? 'space-y-1' : 'space-y-2'} ${className}`}>
        <div className="flex items-center justify-between">
          <Label className={`flex items-center gap-2 ${textColor} ${compact ? 'text-sm' : ''}`}>
            <div className={`${compact ? 'w-3 h-3' : 'w-4 h-4'} rounded-full ${bgColor}`} />
            {label}
          </Label>
        </div>
        <div className="relative flex items-center justify-center">
          <div className={`text-center ${compact ? 'text-2xl' : 'text-4xl'} font-bold absolute z-10 select-none ${textColor}`}>
            {value}
          </div>
          <div className="flex items-center gap-0 w-full">
            <Button
              className={`${compact ? 'h-10' : 'h-16'} flex-1 bg-slate-600 hover:bg-slate-700 opacity-90 hover:opacity-100 transition-opacity rounded-r-none border-r-0 border-slate-700 disabled:!bg-slate-600 disabled:hover:!bg-slate-600 disabled:!opacity-90 disabled:hover:!opacity-90 disabled:!cursor-default disabled:!pointer-events-auto`}
              onClick={() => updateRuneValue(playerIndex, runeField, -1)}
              disabled={value <= 0}
            >
              <Minus className={`${compact ? 'w-5 h-5' : 'w-8 h-8'} text-slate-200`} />
            </Button>
            <Button
              className={`${compact ? 'h-10' : 'h-16'} flex-1 bg-slate-600 hover:bg-slate-700 opacity-90 hover:opacity-100 transition-opacity rounded-l-none border-l-0 border-slate-700`}
              onClick={() => updateRuneValue(playerIndex, runeField, 1)}
            >
              <Plus className={`${compact ? 'w-5 h-5' : 'w-8 h-8'} text-slate-200`} />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const TotalRuneControl = ({
    value,
    playerIndex,
    minValue,
    className = '',
    compact = false,
  }: {
    value: number
    playerIndex: number
    minValue: number
    className?: string
    compact?: boolean
  }) => (
    <div className={`${compact ? 'space-y-1' : 'space-y-2'} ${className}`}>
      <div className="flex items-center justify-between">
        <Label className={`flex items-center gap-2 ${compact ? 'text-sm' : ''}`}>
          <div className={`${compact ? 'w-3 h-3' : 'w-4 h-4'} rounded-full bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500`} />
          <span className="bg-gradient-to-r from-red-600 via-yellow-600 to-blue-600 bg-clip-text text-transparent font-semibold">
            总符能
          </span>
          {!compact && (
            <span className="text-xs text-muted-foreground">
              (≥ {minValue})
            </span>
          )}
        </Label>
      </div>
      <div className="relative flex items-center justify-center">
        <div className={`text-center ${compact ? 'text-2xl' : 'text-4xl'} font-bold absolute z-10 select-none bg-gradient-to-r from-red-600 via-yellow-600 to-blue-600 bg-clip-text text-transparent`}>
          {value}
        </div>
        <div className="flex items-center gap-0 w-full">
          <Button
            className={`${compact ? 'h-10' : 'h-16'} flex-1 bg-slate-600 hover:bg-slate-700 opacity-90 hover:opacity-100 transition-opacity rounded-r-none border-r-0 border-slate-700 disabled:!bg-slate-600 disabled:hover:!bg-slate-600 disabled:!opacity-90 disabled:hover:!opacity-90 disabled:!cursor-default disabled:!pointer-events-auto`}
            onClick={() => updateTotalRunes(playerIndex, -1)}
            disabled={value <= minValue}
          >
            <Minus className={`${compact ? 'w-5 h-5' : 'w-8 h-8'} text-slate-200`} />
          </Button>
          <Button
            className={`${compact ? 'h-10' : 'h-16'} flex-1 bg-slate-600 hover:bg-slate-700 opacity-90 hover:opacity-100 transition-opacity rounded-l-none border-l-0 border-slate-700`}
            onClick={() => updateTotalRunes(playerIndex, 1)}
          >
            <Plus className={`${compact ? 'w-5 h-5' : 'w-8 h-8'} text-slate-200`} />
          </Button>
        </div>
      </div>
    </div>
  )

  const PlayerCard = ({ playerIndex, name, hideScore = false, is2v2 = false, compact = false }: { playerIndex: number; name: string; hideScore?: boolean; is2v2?: boolean; compact?: boolean }) => {
    const player = battleState.players[playerIndex]
    const playerColor = battleState.playerColors?.[playerIndex]
    // 2v2模式下，前两名玩家是红方，后两名玩家是绿方
    const theme = is2v2 ? 
      (playerIndex < 2 ? playerThemes[0] : playerThemes[1]) : 
      playerThemes[playerIndex]
    
    const totalRunes = player.rune1 + player.rune2
    
    return (
      <Card className={`${theme.border} ${theme.bg} ${compact ? 'h-full flex flex-col' : ''}`}>
        <CardHeader className={compact ? 'pb-1 px-3 py-2' : 'pb-2'}>
          <div className="flex items-center justify-between">
            <CardTitle className={`${theme.text} flex items-center gap-2 ${compact ? 'text-lg' : ''}`}>
              <Swords className={compact ? 'w-4 h-4' : 'w-5 h-5'} />
              {name}
            </CardTitle>
            {/* 显示符能颜色 */}
            <div className="flex gap-1">
              {playerColor?.colors.map((color, idx) => color && (
                <div 
                  key={idx}
                  className={`${compact ? 'w-4 h-4' : 'w-6 h-6'} rounded-full ${RUNE_COLORS.find(c => c.value === color)?.bg}`}
                />
              ))}
            </div>
          </div>
          {!compact && <CardDescription>当前战斗状态</CardDescription>}
        </CardHeader>
        <CardContent className={`${compact ? 'px-3 py-2 flex-1' : 'space-y-6'}`}>
          <div className={`grid grid-cols-2 ${compact ? 'gap-2' : 'gap-4'}`}>
            <ValueControl
              label="经验值"
              value={player.experience}
              playerIndex={playerIndex}
              field="experience"
              icon={Star}
              compact={compact}
            />
            {!hideScore && (
              <ValueControl
                label="分数"
                value={player.score}
                playerIndex={playerIndex}
                field="score"
                icon={Trophy}
                compact={compact}
              />
            )}
          </div>
          {!compact && <Separator />}
          <div className={`grid grid-cols-2 ${compact ? 'gap-2 mt-2' : 'gap-4'}`}>
            <ValueControl
              label="法力"
              value={player.mana}
              playerIndex={playerIndex}
              field="mana"
              icon={Zap}
              compact={compact}
            />
            <TotalRuneControl
              value={player.coloredRunes}
              playerIndex={playerIndex}
              minValue={totalRunes}
              compact={compact}
            />
          </div>
          {!compact && <Separator />}
          <div className={`grid grid-cols-2 ${compact ? 'gap-2 mt-2' : 'gap-4'}`}>
            {playerColor?.colors[0] && (
              <RuneControl
                label={`${RUNE_COLORS.find(c => c.value === playerColor.colors[0])?.name}符能`}
                value={player.rune1}
                playerIndex={playerIndex}
                runeField="rune1"
                color={playerColor.colors[0]}
                compact={compact}
              />
            )}
            {playerColor?.colors[1] && (
              <RuneControl
                label={`${RUNE_COLORS.find(c => c.value === playerColor.colors[1])?.name}符能`}
                value={player.rune2}
                playerIndex={playerIndex}
                runeField="rune2"
                color={playerColor.colors[1]}
                compact={compact}
              />
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  const TeamScoreControl = ({ teamIndex, teamName, score, compact = false }: { teamIndex: number; teamName: string; score: number; compact?: boolean }) => {
    const colors = teamIndex === 0 ? playerThemes[0] : playerThemes[1]
    
    return (
      <div className={`${compact ? 'space-y-1' : 'space-y-2'}`}>
        <Label className={`flex items-center justify-center gap-2 font-semibold ${colors.text} ${compact ? 'text-sm' : ''}`}>
          <Trophy className={compact ? 'w-4 h-4' : 'w-5 h-5'} />
          {teamName} 分数
        </Label>
        <div className="relative flex items-center justify-center">
          <div className={`text-center ${compact ? 'text-2xl' : 'text-5xl'} font-bold absolute z-10 select-none text-white`}>
            {score}
          </div>
          <div className={`flex items-center gap-0 w-full ${compact ? '' : 'max-w-md'}`}>
            <Button
              className={`${compact ? 'h-10' : 'h-20'} flex-1 bg-slate-600 hover:bg-slate-700 opacity-90 hover:opacity-100 transition-opacity rounded-r-none border-r-0 border-slate-700 disabled:!bg-slate-600 disabled:hover:!bg-slate-600 disabled:!opacity-90 disabled:hover:!opacity-90 disabled:!cursor-default disabled:!pointer-events-auto`}
              onClick={() => updateTeamScore(teamIndex, -1)}
              disabled={score <= 0}
            >
              <Minus className={`${compact ? 'w-5 h-5' : 'w-10 h-10'} text-slate-200`} />
            </Button>
            <Button
              className={`${compact ? 'h-10' : 'h-20'} flex-1 bg-slate-600 hover:bg-slate-700 opacity-90 hover:opacity-100 transition-opacity rounded-l-none border-l-0 border-slate-700`}
              onClick={() => updateTeamScore(teamIndex, 1)}
            >
              <Plus className={`${compact ? 'w-5 h-5' : 'w-10 h-10'} text-slate-200`} />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // 模式选择界面
  if (appStep === 'mode') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
          <h1 className="text-2xl font-bold">对战工具</h1>
          <p className="text-muted-foreground">选择游戏模式开始</p>
        </div>
          <DiceButton />
        </div>

        <div className="grid gap-4">
          <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => selectMode('1v1')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Swords className="w-5 h-5" />
                1v1 模式
              </CardTitle>
              <CardDescription>经典1对1对战</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">两名玩家一对一进行战斗</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => selectMode('2v2')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                2v2 模式
              </CardTitle>
              <CardDescription>双人组队对战</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">四名玩家分成两队进行2v2战斗</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => selectMode('4player')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                4人混战模式
              </CardTitle>
              <CardDescription>四人自由对战</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">四名玩家各自为战的大混战</p>
            </CardContent>
          </Card>
        </div>
        <DiceDialog />
      </div>
    )
  }

  // 颜色选择界面
  if (appStep === 'colors' && gameMode) {
    const playerNames = getPlayerNames(gameMode)
    const is2v2 = gameMode === '2v2'

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={goBack}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">选择符能颜色</h1>
              <p className="text-muted-foreground">为每名玩家选择两个符能颜色</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <DiceButton />
            <Button onClick={startBattle} disabled={!allColorsConfirmed()}>
              开始战斗
            </Button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {playerNames.map((name, index) => (
            <ColorSelectionCard 
              key={index} 
              playerIndex={index} 
              playerName={name}
              is2v2={is2v2}
            />
          ))}
        </div>
        <DiceDialog />
      </div>
    )
  }

  return (
    <div className={isFullscreen ? "fixed inset-0 bg-background z-50" : "space-y-6"}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={goBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              对战工具 - {gameMode === '1v1' ? '1v1模式' : gameMode === '2v2' ? '2v2模式' : '4人混战'}
            </h1>
            <p className="text-muted-foreground">实时追踪各方的分数、法力和符能状态</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <DiceButton />
          <Button variant="outline" size="icon" onClick={() => setIsFullscreen(!isFullscreen)}>
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </Button>
          <Button variant="outline" onClick={resetBattle}>
            <RotateCcw className="w-4 h-4 mr-2" />
            重置战斗
          </Button>
        </div>
      </div>

      {gameMode === '1v1' && (
        <div className={isFullscreen ? "h-[calc(100vh-120px)] flex flex-col justify-between" : "space-y-6 max-w-2xl mx-auto"}>
          <div className={isFullscreen ? "h-[45%]" : ""}>
            <PlayerCard playerIndex={0} name="对手" compact={isFullscreen} />
          </div>
          <div className="flex items-center justify-center py-2">
            <Separator className="flex-1" />
            <span className="px-4 text-muted-foreground">VS</span>
            <Separator className="flex-1" />
          </div>
          <div className={isFullscreen ? "h-[45%]" : ""}>
            <PlayerCard playerIndex={1} name="我方" compact={isFullscreen} />
          </div>
        </div>
      )}

      {gameMode === '2v2' && (
        <div className={isFullscreen ? "h-[calc(100vh-120px)] flex flex-col" : "space-y-6"}>
          {/* 阵营分数显示 */}
          <Card className={isFullscreen ? "max-w-3xl mx-auto mb-2" : "max-w-3xl mx-auto"}>
            <CardHeader className={isFullscreen ? "py-2" : ""}>
              <CardTitle className="text-center">阵营比分</CardTitle>
            </CardHeader>
            <CardContent className={isFullscreen ? "py-2" : ""}>
              <div className="flex items-center justify-center gap-8">
                <TeamScoreControl 
                  teamIndex={0} 
                  teamName="红方" 
                  score={battleState.teamScores?.[0] || 0} 
                  compact={isFullscreen}
                />
                <div className="text-4xl font-bold text-muted-foreground">VS</div>
                <TeamScoreControl 
                  teamIndex={1} 
                  teamName="绿方" 
                  score={battleState.teamScores?.[1] || 0} 
                  compact={isFullscreen}
                />
              </div>
            </CardContent>
          </Card>

          {/* 玩家信息 */}
          <div className={isFullscreen ? "grid grid-cols-2 gap-2 flex-1" : "grid gap-4 lg:grid-cols-2"}>
            <div className={isFullscreen ? "space-y-2 h-full flex flex-col" : "space-y-4"}>
              <div className="text-center font-semibold text-red-600">红方成员</div>
              <div className={isFullscreen ? "flex-1 flex flex-col gap-2" : ""}>
                <PlayerCard playerIndex={0} name="红方1" hideScore is2v2 compact={isFullscreen} />
                <PlayerCard playerIndex={1} name="红方2" hideScore is2v2 compact={isFullscreen} />
              </div>
            </div>
            <div className={isFullscreen ? "space-y-2 h-full flex flex-col" : "space-y-4"}>
              <div className="text-center font-semibold text-green-600">绿方成员</div>
              <div className={isFullscreen ? "flex-1 flex flex-col gap-2" : ""}>
                <PlayerCard playerIndex={2} name="绿方1" hideScore is2v2 compact={isFullscreen} />
                <PlayerCard playerIndex={3} name="绿方2" hideScore is2v2 compact={isFullscreen} />
              </div>
            </div>
          </div>
        </div>
      )}

      {gameMode === '4player' && (
        <div className={isFullscreen ? "h-[calc(100vh-120px)] grid grid-cols-2 gap-2" : "space-y-6"}>
          <PlayerCard playerIndex={0} name="玩家1" compact={isFullscreen} />
          <PlayerCard playerIndex={1} name="玩家2" compact={isFullscreen} />
          <PlayerCard playerIndex={2} name="玩家3" compact={isFullscreen} />
          <PlayerCard playerIndex={3} name="玩家4" compact={isFullscreen} />
        </div>
      )}
      <DiceDialog />
    </div>
  )
}
