const mongoose = require('mongoose');

const userTaskSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: true
  },
  // 当前进度
  progress: {
    type: Number,
    default: 0,
    min: 0
  },
  // 任务状态
  status: {
    type: String,
    enum: ['not-started', 'in-progress', 'completed', 'claimed'],
    default: 'not-started'
  },
  // 完成时间
  completedAt: {
    type: Date
  },
  // 奖励领取时间
  claimedAt: {
    type: Date
  },
  // 任务周期开始时间（用于每日/每周任务重置
  periodStart: {
    type: Date,
    required: true
  },
  // 任务周期结束时间
  periodEnd: {
    type: Date
  }
}, {
  timestamps: true
});

// 复合索引 - 确保每个用户在每个周期内同一任务只有一条记录
userTaskSchema.index({ userId: 1, taskId: 1, periodStart: 1 }, { unique: true });
userTaskSchema.index({ userId: 1, status: 1 });
userTaskSchema.index({ userId: 1, periodStart: 1 });

module.exports = mongoose.model('UserTask', userTaskSchema);
