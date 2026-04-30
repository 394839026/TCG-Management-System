const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const abac = require('../middleware/abac');
const Shop = require('../models/Shop');
const Inventory = require('../models/Inventory');
const User = require('../models/User');

// @route   GET /api/shops/:shopId/inventory
// @desc    获取店铺库存
// @access  Private (店员及以上)
router.get('/', protect, abac({ resource: 'shop', actions: ['read'] }), async (req, res) => {
  try {
    const shopId = req.params.shopId;
    const { search, rarity, itemType } = req.query;

    const shop = await Shop.findById(shopId);
    if (!shop) {
      return res.status(404).json({ message: '店铺不存在' });
    }

    const filter = { relatedShop: shopId };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { itemCode: { $regex: search, $options: 'i' } }
      ];
    }
    if (rarity) filter.rarity = rarity;
    if (itemType) filter.itemType = itemType;

    const inventory = await Inventory.find(filter).populate('addedBy', 'username');

    res.json({
      success: true,
      data: inventory,
      stats: {
        totalItems: inventory.length,
        totalQuantity: inventory.reduce((sum, item) => sum + item.quantity, 0)
      }
    });
  } catch (error) {
    console.error('获取店铺库存错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   POST /api/shops/:shopId/inventory
// @desc    添加物品到店铺库存
// @access  Private (manager)
router.post('/', protect, abac({ resource: 'shop', actions: ['write'] }), async (req, res) => {
  try {
    const shopId = req.params.shopId;
    const { inventoryItemId, quantity = 1 } = req.body;

    const shop = await Shop.findById(shopId);
    if (!shop) {
      return res.status(404).json({ message: '店铺不存在' });
    }

    const inventoryItem = await Inventory.findById(inventoryItemId);
    if (!inventoryItem) {
      return res.status(404).json({ message: '物品不存在' });
    }

    inventoryItem.relatedShop = shopId;
    inventoryItem.addedBy = req.user._id;
    inventoryItem.inShop = true;
    await inventoryItem.save();

    res.status(201).json({
      success: true,
      message: '物品已添加到店铺库存',
      data: inventoryItem
    });
  } catch (error) {
    console.error('添加店铺库存错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   DELETE /api/shops/:shopId/inventory/:itemId
// @desc    从店铺库存移除物品
// @access  Private (manager)
router.delete('/:itemId', protect, abac({ resource: 'shop', actions: ['write'] }), async (req, res) => {
  try {
    const { shopId, itemId } = req.params;

    const shop = await Shop.findById(shopId);
    if (!shop) {
      return res.status(404).json({ message: '店铺不存在' });
    }

    const inventoryItem = await Inventory.findById(itemId);
    if (!inventoryItem) {
      return res.status(404).json({ message: '物品不存在' });
    }

    inventoryItem.relatedShop = null;
    inventoryItem.inShop = false;
    await inventoryItem.save();

    res.json({
      success: true,
      message: '物品已从店铺库存移除'
    });
  } catch (error) {
    console.error('移除店铺库存错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   PUT /api/shops/:shopId/inventory/:itemId
// @desc    更新店铺库存物品
// @access  Private (manager)
router.put('/:itemId', protect, abac({ resource: 'shop', actions: ['write'] }), async (req, res) => {
  try {
    const { shopId, itemId } = req.params;
    const { quantity, price, condition, description } = req.body;

    const shop = await Shop.findById(shopId);
    if (!shop) {
      return res.status(404).json({ message: '店铺不存在' });
    }

    const inventoryItem = await Inventory.findById(itemId);
    if (!inventoryItem) {
      return res.status(404).json({ message: '物品不存在' });
    }

    if (quantity !== undefined) inventoryItem.quantity = quantity;
    if (price !== undefined) inventoryItem.price = price;
    if (condition !== undefined) inventoryItem.condition = condition;
    if (description !== undefined) inventoryItem.description = description;

    await inventoryItem.save();

    res.json({
      success: true,
      message: '库存物品已更新',
      data: inventoryItem
    });
  } catch (error) {
    console.error('更新店铺库存错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   GET /api/shops/:shopId/inventory/stats
// @desc    获取店铺库存统计
// @access  Private (店员及以上)
router.get('/stats', protect, abac({ resource: 'shop', actions: ['read'] }), async (req, res) => {
  try {
    const shopId = req.params.shopId;

    const shop = await Shop.findById(shopId);
    if (!shop) {
      return res.status(404).json({ message: '店铺不存在' });
    }

    const inventory = await Inventory.find({ relatedShop: shopId });

    const stats = {
      totalItems: inventory.length,
      totalQuantity: inventory.reduce((sum, item) => sum + item.quantity, 0),
      totalValue: inventory.reduce((sum, item) => sum + (item.price * item.quantity), 0),
      byRarity: {},
      byType: {}
    };

    inventory.forEach(item => {
      if (!stats.byRarity[item.rarity]) {
        stats.byRarity[item.rarity] = { count: 0, quantity: 0 };
      }
      stats.byRarity[item.rarity].count++;
      stats.byRarity[item.rarity].quantity += item.quantity;

      if (!stats.byType[item.itemType]) {
        stats.byType[item.itemType] = { count: 0, quantity: 0 };
      }
      stats.byType[item.itemType].count++;
      stats.byType[item.itemType].quantity += item.quantity;
    });

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('获取店铺库存统计错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

module.exports = router;