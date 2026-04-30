const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const InventoryItem = require('../models/Inventory');
const UserInventory = require('../models/UserInventory');

router.get('/', protect, async (req, res) => {
  try {
    const { itemType, search, sort = 'createdAt', order = 'desc', page = 1, limit = 50, rarity, gameType, priceMin, priceMax, showZeroQuantity, version, cardProperty } = req.query;
    const query = {};

    if (itemType && itemType !== 'all') {
      if (itemType.includes(',')) {
        query.itemType = { $in: itemType.split(',') };
      } else {
        query.itemType = itemType;
      }
    }

    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };
      query.$or = [
        { itemName: searchRegex },
        { 'runeCardInfo.cardNumber': searchRegex }
      ];
    }

    if (rarity && rarity !== 'all') {
      if (rarity.includes(',')) {
        query.rarity = { $in: rarity.split(',') };
      } else {
        query.rarity = rarity;
      }
    }

    if (gameType && gameType !== 'all') {
      query.gameType = gameType;
    }

    if (version && version !== 'all') {
      query['runeCardInfo.version'] = version;
    }

    if (cardProperty && cardProperty !== 'all') {
      if (cardProperty.includes(',')) {
        query.cardProperty = { $in: cardProperty.split(',') };
      } else {
        query.cardProperty = cardProperty;
      }
    }

    if (priceMin) {
      query.value = query.value || {};
      query.value.$gte = parseFloat(priceMin);
    }
    if (priceMax) {
      query.value = query.value || {};
      query.value.$lte = parseFloat(priceMax);
    }

    if (showZeroQuantity === 'false') {
      query.quantity = { $gt: 0 };
    }

    const sortOrder = order === 'asc' ? 1 : -1;
    let sortOptions = { [sort]: sortOrder };

    if (sort === 'userQuantity') {
      sortOptions = {};
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const items = await InventoryItem.find(query).sort(sortOptions).skip(skip).limit(parseInt(limit));
    const total = await InventoryItem.countDocuments(query);

    const userInventory = await UserInventory.find({ userId: req.user._id });
    const userInventoryMap = new Map();
    userInventory.forEach(ui => {
      userInventoryMap.set(ui.inventoryItemId.toString(), ui);
    });

    let itemsWithUserInfo = items.map(item => {
      const userItem = userInventoryMap.get(item._id.toString());
      return {
        ...item.toObject(),
        userQuantity: userItem?.quantity || 0,
        userValue: userItem?.value || 0,
        userIsFavorite: userItem?.isFavorite || false,
        userNotes: userItem?.notes || '',
        userInventoryId: userItem?._id || null
      };
    });

    if (sort === 'userQuantity') {
      itemsWithUserInfo.sort((a, b) => {
        return sortOrder * (a.userQuantity - b.userQuantity);
      });
    } else if (sort === 'userValue') {
      itemsWithUserInfo.sort((a, b) => {
        return sortOrder * (a.userValue - b.userValue);
      });
    }

    res.json({
      success: true,
      count: itemsWithUserInfo.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: itemsWithUserInfo
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
});

router.put('/:id', protect, async (req, res) => {
  try {
    const { quantity, value, isFavorite, notes } = req.body;

    let userInventory = await UserInventory.findOne({
      userId: req.user._id,
      inventoryItemId: req.params.id
    });

    if (!userInventory) {
      const inventoryItem = await InventoryItem.findById(req.params.id);
      if (!inventoryItem) {
        return res.status(404).json({ message: '物品不存在' });
      }

      userInventory = await UserInventory.create({
        userId: req.user._id,
        inventoryItemId: req.params.id,
        quantity: quantity || 0,
        value: value || 0,
        isFavorite: isFavorite || false,
        notes: notes || ''
      });
    } else {
      if (quantity !== undefined) {
        userInventory.quantity = quantity;
      }
      if (value !== undefined) {
        userInventory.value = value;
      }
      if (isFavorite !== undefined) {
        userInventory.isFavorite = isFavorite;
      }
      if (notes !== undefined) {
        userInventory.notes = notes;
      }

      await userInventory.save();
    }

    res.json({
      success: true,
      message: '更新成功',
      data: userInventory
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
});

router.get('/stats', protect, async (req, res) => {
  try {
    const userInventory = await UserInventory.find({ userId: req.user._id }).populate('inventoryItemId');
    
    const totalItems = userInventory.reduce((sum, ui) => sum + ui.quantity, 0);
    const totalValue = userInventory.reduce((sum, ui) => sum + (ui.quantity * ui.value), 0);
    
    const digimonCount = userInventory.filter(ui => ui.inventoryItemId?.gameType === 'digimon' && ui.quantity > 0).length;
    const runeCount = userInventory.filter(ui => ui.inventoryItemId?.gameType === 'rune' && ui.quantity > 0).length;
    const pokemonCount = userInventory.filter(ui => ui.inventoryItemId?.gameType === 'pokemon' && ui.quantity > 0).length;

    res.json({
      success: true,
      data: {
        totalItems,
        totalQuantity: userInventory.length,
        totalValue,
        digimonCount,
        runeCount,
        pokemonCount
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '服务器错误' });
  }
});

module.exports = router;