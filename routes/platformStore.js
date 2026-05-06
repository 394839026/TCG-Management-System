const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { withLock, rateLimit, redeemLimiter, executeTransaction, atomicUpdate } = require('../middleware/concurrencyControl');
const PlatformStoreItem = require('../models/PlatformStoreItem');
const PlatformStoreRedemption = require('../models/PlatformStoreRedemption');
const User = require('../models/User');
const InventoryItem = require('../models/Inventory');
const UserInventory = require('../models/UserInventory');

// @route   GET /api/platform-store
// @desc    获取所有有效的商店物品
// @access  Public
router.get('/', async (req, res) => {
  try {
    const now = new Date();
    
    const items = await PlatformStoreItem.find({
      isActive: true,
      $or: [
        { validFrom: { $exists: false } },
        { validFrom: { $lte: now } }
      ],
      $or: [
        { validUntil: { $exists: false } },
        { validUntil: { $gte: now } }
      ]
    })
      .sort({ sortOrder: 1, createdAt: -1 })
      .populate('inventoryItem');

    res.json({
      success: true,
      data: items
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// @route   GET /api/platform-store/admin/all
// @desc    获取所有商店物品（管理员）
// @access  Private/Admin
router.get('/admin/all', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const items = await PlatformStoreItem.find()
      .sort({ sortOrder: 1, createdAt: -1 })
      .populate('inventoryItem createdBy');

    res.json({
      success: true,
      data: items
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// @route   GET /api/platform-store/:id
// @desc    获取单个商店物品详情
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const item = await PlatformStoreItem.findById(req.params.id).populate('inventoryItem');

    if (!item) {
      return res.status(404).json({ success: false, message: '物品不存在' });
    }

    res.json({
      success: true,
      data: item
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// @route   POST /api/platform-store
// @desc    创建商店物品
// @access  Private/Admin
router.post('/', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const { itemName, description, itemType, currencyType, price, inventoryItem, stock, itemQuantity, limitPerUser, validFrom, validUntil, isActive, sortOrder, image, tags } = req.body;

    const storeItem = await PlatformStoreItem.create({
      itemName,
      description,
      itemType,
      currencyType,
      price,
      inventoryItem,
      stock,
      itemQuantity,
      limitPerUser,
      validFrom,
      validUntil,
      isActive,
      sortOrder,
      image,
      tags,
      createdBy: req.user._id
    });

    const populatedItem = await PlatformStoreItem.findById(storeItem._id).populate('inventoryItem createdBy');

    res.status(201).json({
      success: true,
      data: populatedItem,
      message: '物品创建成功'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// @route   PUT /api/platform-store/:id
// @desc    更新商店物品
// @access  Private/Admin
router.put('/:id', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const item = await PlatformStoreItem.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ success: false, message: '物品不存在' });
    }

    const { itemName, description, itemType, currencyType, price, inventoryItem, stock, itemQuantity, limitPerUser, validFrom, validUntil, isActive, sortOrder, image, tags } = req.body;

    if (itemName !== undefined) item.itemName = itemName;
    if (description !== undefined) item.description = description;
    if (itemType !== undefined) item.itemType = itemType;
    if (currencyType !== undefined) item.currencyType = currencyType;
    if (price !== undefined) item.price = price;
    if (inventoryItem !== undefined) item.inventoryItem = inventoryItem;
    if (stock !== undefined) item.stock = stock;
    if (itemQuantity !== undefined) item.itemQuantity = itemQuantity;
    if (limitPerUser !== undefined) item.limitPerUser = limitPerUser;
    if (validFrom !== undefined) item.validFrom = validFrom;
    if (validUntil !== undefined) item.validUntil = validUntil;
    if (isActive !== undefined) item.isActive = isActive;
    if (sortOrder !== undefined) item.sortOrder = sortOrder;
    if (image !== undefined) item.image = image;
    if (tags !== undefined) item.tags = tags;

    await item.save();

    const populatedItem = await PlatformStoreItem.findById(item._id).populate('inventoryItem createdBy');

    res.json({
      success: true,
      data: populatedItem,
      message: '物品更新成功'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// @route   DELETE /api/platform-store/:id
// @desc    删除商店物品
// @access  Private/Admin
router.delete('/:id', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const item = await PlatformStoreItem.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ success: false, message: '物品不存在' });
    }

    await item.deleteOne();

    res.json({
      success: true,
      message: '物品删除成功'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// @route   POST /api/platform-store/:id/redeem
// @desc    兑换商店物品（高并发安全版本）
// @access  Private
router.post('/:id/redeem', protect, rateLimit(redeemLimiter), async (req, res) => {
  try {
    const { quantity = 1 } = req.body;
    const storeItemId = req.params.id;
    const userId = req.user._id;

    // 使用分布式锁确保并发安全
    const result = await withLock(`redeem:${userId}:${storeItemId}`, async () => {
      // 使用事务确保数据一致性
      return await executeTransaction(async (session) => {
        // 获取商店物品并锁定
        const storeItem = await PlatformStoreItem.findById(storeItemId).session(session);

        if (!storeItem) {
          throw new Error('物品不存在');
        }

        if (!storeItem.isActive) {
          throw new Error('物品已下架');
        }

        if (!storeItem.isValid()) {
          throw new Error('物品不在有效期内');
        }

        // 检查库存
        if (storeItem.stock !== -1 && storeItem.redeemedCount + quantity > storeItem.stock) {
          throw new Error('库存不足');
        }

        // 检查用户限购
        if (storeItem.limitPerUser !== -1) {
          const userRedemptions = await PlatformStoreRedemption.countDocuments({
            userId, 
            storeItem: storeItemId
          }).session(session);
          
          if (userRedemptions + quantity > storeItem.limitPerUser) {
            throw new Error('已达到个人限购数量');
          }
        }

        const totalCost = storeItem.price * quantity;

        // 获取用户并锁定
        const user = await User.findById(userId).session(session);

        if (!user) {
          throw new Error('用户不存在');
        }

        // 检查并扣除货币
        if (storeItem.currencyType === 'points') {
          if (user.points < totalCost) {
            throw new Error('积分不足');
          }
          // 原子更新用户积分
          const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $inc: { points: -totalCost } },
            { new: true, session }
          );
          user.points = updatedUser.points;
        } else {
          if (!user.coins || user.coins < totalCost) {
            throw new Error('星币不足');
          }
          // 原子更新用户星币
          const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $inc: { coins: -totalCost } },
            { new: true, session }
          );
          user.coins = updatedUser.coins;
        }

        const actualItemQuantity = (storeItem.itemQuantity || 1) * quantity;
        let userInventoryItem = null;

        if (storeItem.itemType === 'inventory_item' && storeItem.inventoryItem) {
          const templateItem = await InventoryItem.findById(storeItem.inventoryItem).session(session);
          if (templateItem) {
            userInventoryItem = await UserInventory.create([{
              userId,
              inventoryItemId: templateItem._id,
              quantity: actualItemQuantity,
              addedBy: userId,
              acquisitionSource: 'platform_store'
            }], { session });
            userInventoryItem = userInventoryItem[0];
          }
        } else if (storeItem.itemType === 'points') {
          await User.findByIdAndUpdate(
            userId,
            { $inc: { points: (storeItem.price * quantity) * (storeItem.itemQuantity || 1) } },
            { new: true, session }
          );
        } else if (storeItem.itemType === 'exp') {
          // 处理经验值
          const expToAdd = (storeItem.price * quantity) * (storeItem.itemQuantity || 1);
          await user.addExp(expToAdd);
          await user.save({ session });
        } else if (storeItem.itemType === 'coins') {
          await User.findByIdAndUpdate(
            userId,
            { $inc: { coins: (storeItem.price * quantity) * (storeItem.itemQuantity || 1) } },
            { new: true, session }
          );
        }

        // 原子更新已兑换数量
        await PlatformStoreItem.findByIdAndUpdate(
          storeItemId,
          { $inc: { redeemedCount: quantity } },
          { new: true, session }
        );

        // 创建兑换记录
        const redemption = await PlatformStoreRedemption.create([{
          userId,
          storeItem: storeItem._id,
          itemName: storeItem.itemName,
          currencyType: storeItem.currencyType,
          price: storeItem.price,
          quantity,
          userInventoryItem: userInventoryItem?._id || null,
          status: 'completed'
        }], { session });

        // 获取最终的用户数据
        const finalUser = await User.findById(userId).session(session);

        return {
          redemption: redemption[0],
          user: {
            points: finalUser.points,
            coins: finalUser.coins
          }
        };
      });
    });

    // 填充关联数据（需要在事务外查询）
    const populatedRedemption = await PlatformStoreRedemption.findById(result.redemption._id)
      .populate('storeItem userInventoryItem');

    res.json({
      success: true,
      data: {
        redemption: populatedRedemption,
        user: result.user
      },
      message: '兑换成功'
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({ 
      success: false, 
      message: error.message || '兑换失败，请稍后再试' 
    });
  }
});

// @route   GET /api/platform-store/redemptions/my
// @desc    获取用户的兑换记录
// @access  Private
router.get('/redemptions/my', protect, async (req, res) => {
  try {
    const redemptions = await PlatformStoreRedemption.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .populate('storeItem userInventoryItem');

    res.json({
      success: true,
      data: redemptions
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

module.exports = router;
