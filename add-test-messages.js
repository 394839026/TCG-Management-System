const mongoose = require('mongoose')
const TradeMessage = require('./models/TradeMessage')
const User = require('./models/User')
require('dotenv').config()

async function addTestMessages() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tcg-card-system')
    console.log('✅ 数据库连接成功')

    const users = await User.find().limit(3)
    console.log(`找到 ${users.length} 个用户')

    if (users.length < 2) {
      console.log('需要至少2个用户才能创建测试消息！')
      process.exit(1)
    }

    console.log('\n用户列表：')
    users.forEach((u, i) => console.log(`${i + 1}. ${u.username} (${u._id})')

    const testMessages = [
      {
        sender: users[0]._id,
        receiver: users[1]._id,
        content: '你好！很高兴认识你！',
        isRead: true,
      },
      {
        sender: users[1]._id,
        receiver: users[0]._id,
        content: '你好！我也很高兴认识你！',
        isRead: false,
      },
      {
        sender: users[0]._id,
        receiver: users[1]._id,
        content: '你最近在玩什么卡牌游戏？',
        isRead: true,
      },
      {
        sender: users[1]._id,
        receiver: users[0]._id,
        content: '我最近在玩万智牌！',
        isRead: false,
      },
    ]

    if (users.length > 2) {
      testMessages.push({
        sender: users[0]._id,
        receiver: users[2]._id,
        content: '嗨！想一起组牌吗？',
        isRead: false,
      })
      testMessages.push({
        sender: users[2]._id,
        receiver: users[0]._id,
        content: '好的！什么时候？',
        isRead: true,
      })
    }

    const result = await TradeMessage.insertMany(testMessages)
    console.log(`\n✅ 已创建 ${result.length} 条测试消息')

    console.log('\n🎉 测试数据创建成功！')
    console.log('\n现在你现在可以：')
    console.log('1. 使用用户 1 登录，看到用户 2 和用户 3 发来的未读消息')
    console.log('2. 在消息中心看到这些对话')
    console.log('3. 可以回复消息')
    
    process.exit(0)
  } catch (error) {
    console.error('❌ 错误:', error)
    process.exit(1)
  }
}

addTestMessages()
