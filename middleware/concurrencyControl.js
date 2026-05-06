/**
 * 并发控制中间件
 * 使用内存锁和原子操作处理并发请求（向后兼容版本）
 */
const mongoose = require('mongoose');
const User = require('../models/User');

// 请求锁 - 使用内存锁防止同一用户的并发请求
const userLocks = new Map();
const locks = new Map();

/**
 * 获取锁（向后兼容）
 */
function acquireLock(key, ttl = 5000) {
  if (locks.has(key)) {
    return false;
  }
  locks.set(key, Date.now());
  // 自动释放锁
  setTimeout(() => locks.delete(key), ttl);
  return true;
}

/**
 * 释放锁（向后兼容）
 */
function releaseLock(key) {
  locks.delete(key);
}

/**
 * 带锁执行（向后兼容）
 */
async function withLock(key, handler, ttl = 5000) {
  if (!acquireLock(key, ttl)) {
    throw new Error('请稍候，您的上一个请求正在处理中');
  }

  try {
    const result = await handler();
    return result;
  } finally {
    releaseLock(key);
  }
}

/**
 * 获取用户锁
 */
function acquireUserLock(userId) {
  if (userLocks.has(userId)) {
    return false;
  }
  userLocks.set(userId, true);
  return true;
}

/**
 * 释放用户锁
 */
function releaseUserLock(userId) {
  userLocks.delete(userId);
}

/**
 * 执行带锁的用户操作
 */
async function executeWithUserLock(userId, handler) {
  if (!acquireUserLock(userId)) {
    throw new Error('请稍候，您的上一个请求正在处理中');
  }

  try {
    const result = await handler();
    return result;
  } finally {
    releaseUserLock(userId);
  }
}

/**
 * 原子扣除用户金币
 */
async function deductCoinsAtomic(userId, amount) {
  const result = await User.findOneAndUpdate(
    { 
      _id: userId,
      coins: { $gte: amount }
    },
    { 
      $inc: { coins: -amount },
      $set: { updatedAt: new Date() }
    },
    { 
      new: true,
      runValidators: true 
    }
  );

  if (!result) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('用户不存在');
    }
    throw new Error('星币不足');
  }

  return result;
}

/**
 * 原子增加用户金币
 */
async function addCoinsAtomic(userId, amount) {
  const result = await User.findOneAndUpdate(
    { _id: userId },
    { 
      $inc: { coins: amount },
      $set: { updatedAt: new Date() }
    },
    { 
      new: true,
      runValidators: true 
    }
  );

  if (!result) {
    throw new Error('用户不存在');
  }

  return result;
}

/**
 * 限流器（向后兼容）
 */
function rateLimit(limiter) {
  return (req, res, next) => {
    next();
  };
}

const gachaLimiter = {};
const redeemLimiter = {};

/**
 * 执行事务（向后兼容，不使用真实事务）
 */
async function executeTransaction(handler) {
  // 直接执行，不使用 MongoDB 事务
  return await handler(null);
}

/**
 * 原子更新（向后兼容）
 */
async function atomicUpdate(model, id, update) {
  return await model.findByIdAndUpdate(id, update, { new: true });
}

/**
 * 并发控制中间件
 */
function concurrencyControl() {
  return async (req, res, next) => {
    const userId = req.user?._id;
    if (!userId) {
      return next();
    }

    req.concurrency = {
      executeWithUserLock: (handler) => executeWithUserLock(userId, handler),
      deductCoinsAtomic: (amount) => deductCoinsAtomic(userId, amount),
      addCoinsAtomic: (amount) => addCoinsAtomic(userId, amount)
    };

    next();
  };
}

module.exports = {
  concurrencyControl,
  executeWithUserLock,
  deductCoinsAtomic,
  addCoinsAtomic,
  // 向后兼容的导出
  withLock,
  rateLimit,
  gachaLimiter,
  redeemLimiter,
  executeTransaction,
  atomicUpdate
};
