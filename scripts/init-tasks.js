const mongoose = require('mongoose')
require('dotenv').config()
const Task = require('../models/Task')

async function initTasks() {
  try {
    console.log('连接数据库...')
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tcg-db')
    console.log('数据库连接成功')

    // 清空现有任务（可选）
    const existingCount = await Task.countDocuments()
    console.log(`现有任务数量: ${existingCount}`)

    // 检查是否已有任务
    if (existingCount > 0) {
      console.log('系统中已有任务，是否清空并重新初始化? (y/n)')
      // 这里我们先不自动清空，只是提示
    }

    const defaultTasks = [
      // 每日任务
      {
        name: '每日签到',
        description: '完成每日签到',
        type: 'daily',
        category: 'other',
        target: { action: 'check_in', value: 1 },
        rewards: { exp: 5, points: 10 },
        sortOrder: 1,
        isActive: true,
      },
      {
        name: '添加物品',
        description: '在个人库存中添加3个物品',
        type: 'daily',
        category: 'inventory',
        target: { action: 'add_inventory', value: 3 },
        rewards: { exp: 10, points: 20 },
        sortOrder: 2,
        isActive: true,
      },
      {
        name: '创建卡组',
        description: '创建或编辑1个卡组',
        type: 'daily',
        category: 'deck',
        target: { action: 'create_deck', value: 1 },
        rewards: { exp: 8, points: 15 },
        sortOrder: 3,
        isActive: true,
      },
      // 每周任务
      {
        name: '卡牌收藏家',
        description: '一周内累计添加20个物品',
        type: 'weekly',
        category: 'inventory',
        target: { action: 'add_inventory', value: 20 },
        rewards: { exp: 50, points: 100 },
        sortOrder: 10,
        isActive: true,
      },
      {
        name: '活跃玩家',
        description: '一周内完成3次签到',
        type: 'weekly',
        category: 'other',
        target: { action: 'check_in', value: 3 },
        rewards: { exp: 30, points: 60 },
        sortOrder: 11,
        isActive: true,
      },
      // 成就任务
      {
        name: '初来乍到',
        description: '完成首次签到',
        type: 'achievement',
        category: 'other',
        target: { action: 'check_in', value: 1 },
        rewards: { exp: 20, points: 50 },
        sortOrder: 100,
        isActive: true,
      },
      {
        name: '收藏达人',
        description: '个人库存中拥有50种不同的物品',
        type: 'achievement',
        category: 'inventory',
        target: { action: 'unique_items', value: 50 },
        rewards: { exp: 100, points: 200 },
        sortOrder: 101,
        isActive: true,
      },
    ]

    // 创建新任务
    const createdTasks = await Task.create(defaultTasks)
    
    console.log(`成功创建 ${createdTasks.length} 个任务`)
    createdTasks.forEach(task => {
      console.log(`- ${task.name} (${task.type})`)
    })

    process.exit(0)
  } catch (error) {
    console.error('初始化任务失败:', error)
    process.exit(1)
  }
}

initTasks()
