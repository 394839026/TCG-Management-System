const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const abac = require('../middleware/abac');
const Shop = require('../models/Shop');
const Inventory = require('../models/Inventory');
const ShopInventoryItem = require('../models/ShopInventoryItem');
const UserInventory = require('../models/UserInventory');
const User = require('../models/User');

// @route   GET /api/shops/:shopId/inventory
// @desc    获取店铺库存
// @access  Private (店员及以上)
router.get('/:shopId/inventory', protect, abac({ resource: 'shop', actions: ['read'] }), async (req, res) => {
  try {
    const shopId = req.params.shopId;
    const { search, rarity, itemType } = req.query;

    const shop = await Shop.findById(shopId);
    if (!shop) {
      return res.status(404).json({ message: '店铺不存在' });
    }

    // 先检查旧格式的数据
    const oldInventory = await Inventory.find({ relatedShop: shopId });
    console.log('找到旧格式的店铺库存项:', oldInventory.length);
    
    // 如果有旧数据，先还回个人库存，然后删除旧数据
    if (oldInventory.length > 0) {
      console.log('开始清理旧数据...');
      for (const oldItem of oldInventory) {
        // 把物品还回个人库存
        const userInventory = await Inventory.findOne({
          _id: oldItem._id,
          userId: req.user._id
        });
        
        if (userInventory) {
          // 恢复个人库存的 inShop 状态
          userInventory.inShop = false;
          userInventory.relatedShop = undefined;
          await userInventory.save();
          console.log('已还回个人库存:', oldItem.itemName);
        }
        
        // 然后删除旧格式的店铺库存标记
        const updateResult = await Inventory.updateOne(
          { _id: oldItem._id },
          { $unset: { relatedShop: 1, inShop: 1 } }
        );
        console.log('删除 oldItem 的 relatedShop/inShop 标记');
      }
    }

    let filter = { shop: shopId };
    
    // 如果有搜索或筛选条件，需要先找到匹配的模板
    if (search || rarity || itemType) {
      const templateFilter = {};
      if (search) {
        templateFilter.$or = [
          { itemName: { $regex: search, $options: 'i' } },
          { 'runeCardInfo.cardNumber': { $regex: search, $options: 'i' } }
        ];
      }
      if (rarity) templateFilter.rarity = rarity;
      if (itemType) templateFilter.itemType = itemType;
      
      const matchingTemplates = await Inventory.find(templateFilter).select('_id');
      const templateIds = matchingTemplates.map(t => t._id);
      filter.template = { $in: templateIds };
    }

    console.log('查找店铺库存，filter:', filter);
    const inventory = await ShopInventoryItem.find(filter)
      .populate('template')
      .populate('addedBy', 'username');
    
    console.log('找到', inventory.length, '个店铺库存项');
    console.log('第一项数据:', inventory[0] ? JSON.stringify(inventory[0], null, 2) : '无数据');

    // 确保返回的数据中没有品相字段
    const sanitizedInventory = inventory.map(item => {
      const obj = item.toObject();
      delete obj.condition; // 明确删除品相字段
      return obj;
    });

    res.json({
      success: true,
      data: sanitizedInventory,
      stats: {
        totalItems: inventory.length,
        totalQuantity: inventory.reduce((sum, item) => sum + item.quantity, 0),
        totalValue: inventory.reduce((sum, item) => sum + (item.price * item.quantity), 0)
      }
    });
  } catch (error) {
    console.error('获取店铺库存错误:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

// @route   POST /api/shops/:shopId/inventory
// @desc    添加物品到店铺库存
// @access  Private (manager)
router.post('/:shopId/inventory', protect, async (req, res) => {
  try {
    console.log('=== 添加物品到店铺库存请求:', {
      shopId: req.params.shopId,
      body: req.body,
      user: req.user._id
    });
    
    const shopId = req.params.shopId;
    const { inventoryItemId, quantity = 1, price, source = 'personal_inventory', sourceNote = '' } = req.body;

    const shop = await Shop.findById(shopId);
    console.log('找到店铺:', shop ? shop._id : null);
    if (!shop) {
      console.log('店铺不存在:', shopId);
      return res.status(404).json({ message: '店铺不存在' });
    }

    const inventoryItem = await Inventory.findById(inventoryItemId);
    console.log('找到物品模板:', inventoryItem ? inventoryItem._id : null);
    if (!inventoryItem) {
      console.log('物品不存在:', inventoryItemId);
      return res.status(404).json({ message: '物品不存在' });
    }

    // 查找用户的个人库存记录 (使用 UserInventory 模型)
    const userInventory = await UserInventory.findOne({
      userId: req.user._id,
      inventoryItemId: inventoryItemId
    });
    console.log('用户个人库存:', userInventory ? userInventory._id : '未找到');
    
    if (!userInventory) {
      return res.status(400).json({ message: '您的个人库存中没有这个物品' });
    }

    console.log('用户库存数量检查:', {
      userInventoryQuantity: userInventory.quantity,
      requestedQuantity: quantity,
      isEnough: userInventory.quantity >= quantity
    });

    // 检查数量是否足够
    if (userInventory.quantity < quantity) {
      return res.status(400).json({ 
        message: `您的个人库存中只有 ${userInventory.quantity} 个，不足 ${quantity} 个` 
      });
    }

    console.log('开始扣除个人库存数量...');
    // 扣除个人库存数量
    userInventory.quantity -= quantity;
    await userInventory.save();
    console.log('扣除后个人库存数量:', userInventory.quantity);

    // 检查是否已存在店铺库存（使用 shop 和 template 字段）
    console.log('检查店铺库存是否存在:', { shopId, inventoryItemId });
    let shopItem = await ShopInventoryItem.findOne({ 
      shop: shopId, 
      template: inventoryItemId 
    }).populate('template');
    console.log('找到的店铺库存项:', shopItem ? shopItem._id : '不存在');
    
    if (shopItem) {
      // 如果已存在，增加数量
      shopItem.quantity += quantity;
      if (price !== undefined) shopItem.price = price;
      if (source) shopItem.source = source;
      if (sourceNote) shopItem.sourceNote = sourceNote;
    } else {
      // 创建新的店铺库存项
      shopItem = new ShopInventoryItem({
        shop: shopId,
        template: inventoryItemId,
        quantity: quantity,
        price: price !== undefined ? price : inventoryItem.value,
        addedBy: req.user._id,
        source: source,
        sourceNote: sourceNote,
        isListed: false
      });
    }

    await shopItem.save();
    await shopItem.populate('template');
    
    console.log('物品已保存到店铺库存');

    // 确保返回的数据中没有品相字段
    const sanitizedItem = shopItem.toObject();
    delete sanitizedItem.condition;

    res.status(201).json({
      success: true,
      message: '物品已添加到店铺库存',
      data: sanitizedItem
    });
  } catch (error) {
    console.error('添加店铺库存错误:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

// @route   DELETE /api/shops/:shopId/inventory/:itemId
// @desc    从店铺库存移除物品
// @access  Private (manager)
router.delete('/:shopId/inventory/:itemId', protect, abac({ resource: 'shop', actions: ['write'] }), async (req, res) => {
  try {
    const { shopId, itemId } = req.params;

    const shop = await Shop.findById(shopId);
    if (!shop) {
      return res.status(404).json({ message: '店铺不存在' });
    }

    const shopItem = await ShopInventoryItem.findById(itemId);
    if (!shopItem) {
      return res.status(404).json({ message: '物品不存在' });
    }

    // 查找用户的个人库存记录 (使用 UserInventory 模型)
    let userInventory = await UserInventory.findOne({
      userId: req.user._id,
      inventoryItemId: shopItem.template
    });
    
    if (userInventory) {
      // 把数量还回个人库存
      userInventory.quantity += shopItem.quantity;
      await userInventory.save();
      console.log('已将物品还回个人库存');
    } else {
      // 如果用户没有个人库存记录，则创建一个
      userInventory = new UserInventory({
        userId: req.user._id,
        inventoryItemId: shopItem.template,
        quantity: shopItem.quantity
      });
      await userInventory.save();
      console.log('已为用户创建个人库存记录');
    }

    await ShopInventoryItem.findByIdAndDelete(itemId);

    res.json({
      success: true,
      message: '物品已从店铺库存移除并还回个人库存'
    });
  } catch (error) {
    console.error('移除店铺库存错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   PUT /api/shops/:shopId/inventory/:itemId
// @desc    更新店铺库存物品（只能编辑数量、价格）
// @access  Private (manager)
router.put('/:shopId/inventory/:itemId', protect, abac({ resource: 'shop', actions: ['write'] }), async (req, res) => {
  try {
    const { shopId, itemId } = req.params;
    const { quantity, price } = req.body;

    const shop = await Shop.findById(shopId);
    if (!shop) {
      return res.status(404).json({ message: '店铺不存在' });
    }

    const shopItem = await ShopInventoryItem.findById(itemId).populate('template');
    if (!shopItem) {
      return res.status(404).json({ message: '物品不存在' });
    }

    if (quantity !== undefined) shopItem.quantity = quantity;
    if (price !== undefined) shopItem.price = price;

    await shopItem.save();

    // 确保返回的数据中没有品相字段
    const sanitizedItem = shopItem.toObject();
    delete sanitizedItem.condition;

    res.json({
      success: true,
      message: '库存物品已更新',
      data: sanitizedItem
    });
  } catch (error) {
    console.error('更新店铺库存错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   PUT /api/shops/:shopId/inventory/:itemId/toggle-listed
// @desc    切换物品上下架状态
// @access  Private (manager)
router.put('/:shopId/inventory/:itemId/toggle-listed', protect, abac({ resource: 'shop', actions: ['write'] }), async (req, res) => {
  try {
    const { shopId, itemId } = req.params;
    const { isListed } = req.body;

    const shop = await Shop.findById(shopId);
    if (!shop) {
      return res.status(404).json({ message: '店铺不存在' });
    }

    const shopItem = await ShopInventoryItem.findById(itemId).populate('template');
    if (!shopItem) {
      return res.status(404).json({ message: '物品不存在' });
    }

    shopItem.isListed = isListed;
    await shopItem.save();

    // 确保返回的数据中没有品相字段
    const sanitizedItem = shopItem.toObject();
    delete sanitizedItem.condition;

    res.json({
      success: true,
      message: `物品已${isListed ? '上架' : '下架'}`,
      data: sanitizedItem
    });
  } catch (error) {
    console.error('切换上下架状态错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   GET /api/shops/:shopId/inventory/stats
// @desc    获取店铺库存统计
// @access  Private (店员及以上)
router.get('/:shopId/inventory/stats', protect, abac({ resource: 'shop', actions: ['read'] }), async (req, res) => {
  try {
    const shopId = req.params.shopId;

    const shop = await Shop.findById(shopId);
    if (!shop) {
      return res.status(404).json({ message: '店铺不存在' });
    }

    const inventory = await ShopInventoryItem.find({ shop: shopId }).populate('template');

    const stats = {
      totalItems: inventory.length,
      totalQuantity: inventory.reduce((sum, item) => sum + item.quantity, 0),
      totalValue: inventory.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    };

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
