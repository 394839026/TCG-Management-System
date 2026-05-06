const mongoose = require('mongoose');

// 连接池配置
const poolConfig = {
  maxPoolSize: 20, // 最大连接数
  minPoolSize: 5, // 最小连接数
  socketTimeoutMS: 45000, // Socket超时时间
  connectTimeoutMS: 30000, // 连接超时时间
  serverSelectionTimeoutMS: 30000, // 服务器选择超时
  heartbeatFrequencyMS: 10000, // 心跳频率
  maxIdleTimeMS: 30000, // 连接最大空闲时间
};

// 连接选项
const mongooseOptions = {
  ...poolConfig,
  autoIndex: process.env.NODE_ENV === 'development', // 开发环境自动创建索引
  bufferCommands: false, // 禁用命令缓冲
  retryWrites: true, // 重试写入操作
  retryReads: true, // 重试读取操作
  readConcern: { level: 'majority' }, // 读取关注级别
  writeConcern: { w: 'majority', j: true, wtimeout: 5000 }, // 写入关注级别
  readPreference: 'primary', // 读取首选策略 - 必须是primary以支持事务
};

// 连接状态监控
mongoose.connection.on('connected', () => {
  console.log('✅ MongoDB 连接成功');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB 连接错误:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ MongoDB 连接断开');
});

mongoose.connection.on('reconnected', () => {
  console.log('🔄 MongoDB 重新连接成功');
});

mongoose.connection.on('poolCreated', () => {
  console.log('🌊 MongoDB 连接池已创建');
});

mongoose.connection.on('connectionReady', () => {
  console.log('✅ MongoDB 连接已就绪');
});

// 优雅关闭连接
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('👋 MongoDB 连接已关闭 (SIGINT)');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await mongoose.connection.close();
  console.log('👋 MongoDB 连接已关闭 (SIGTERM)');
  process.exit(0);
});

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, mongooseOptions);
    console.log(`✅ MongoDB 连接成功: ${conn.connection.host}:${conn.connection.port}`);
    console.log(`👥 连接池大小: ${poolConfig.minPoolSize} - ${poolConfig.maxPoolSize}`);
    return conn;
  } catch (error) {
    console.error('❌ MongoDB 连接失败:', error.message);
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
    throw error;
  }
};

module.exports = connectDB;
