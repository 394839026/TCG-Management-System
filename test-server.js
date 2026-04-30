const express = require('express');
const app = express();

app.use(express.json());

// 简单的测试路由
app.get('/api/test', (req, res) => {
  console.log('✅ /api/test 被调用！');
  res.json({ success: true, message: 'API 正常工作！' });
});

// 模拟通知路由
app.get('/api/notifications', (req, res) => {
  console.log('✅ /api/notifications 被调用！');
  res.json({
    success: true,
    data: [
      {
        _id: '1',
        title: '🎉 欢迎通知',
        content: '这是测试通知！',
        isRead: false
      }
    ]
  });
});

const PORT = 8000;

app.listen(PORT, () => {
  console.log(`✅ 测试服务器运行在端口 ${PORT}`);
  console.log(`✅ 访问 http://localhost:${PORT}/api/test 测试`);
  console.log(`✅ 访问 http://localhost:${PORT}/api/notifications 测试通知`);
});
