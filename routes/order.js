const express = require('express');
const router = express.Router({ mergeParams: true });
const { protect } = require('../middleware/auth');
const abac = require('../middleware/abac');
const Order = require('../models/Order');
const Shop = require('../models/Shop');
const ShopInventoryItem = require('../models/ShopInventoryItem');
const InventoryItem = require('../models/Inventory');
const UserInventory = require('../models/UserInventory');
const User = require('../models/User');
const { GroupChat } = require('../models/GroupChat');
const Notification = require('../models/Notification');
const { body, validationResult } = require('express-validator');

const createNotification = async (recipient, type, title, content, data = {}) => {
  try {
    await Notification.create({
      recipient,
      type,
      title,
      content,
      data
    });
  } catch (error) {
    console.error('创建通知失败:', error);
  }
};

router.post('/', protect, [
  body('items').isArray({ min: 1 }).withMessage('订单项不能为空'),
  body('items.*.shopInventoryItemId').notEmpty().withMessage('物品ID是必填项'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('数量至少为1'),
  body('notes').optional().isLength({ max: 500 }).withMessage('备注不能超过500字符')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const shopId = req.params.shopId;
    const { items, notes } = req.body;
    
    if (!shopId) {
      return res.status(400).json({ message: '店铺ID是必填项' });
    }

    const shop = await Shop.findById(shopId);
    if (!shop) {
      return res.status(404).json({ message: '店铺不存在' });
    }

    const orderItems = [];
    let totalAmount = 0;

    for (const item of items) {
      const shopInventoryItem = await ShopInventoryItem.findById(item.shopInventoryItemId)
        .populate('template');
      
      if (!shopInventoryItem) {
        return res.status(404).json({ message: `物品 ${item.shopInventoryItemId} 不存在` });
      }

      if (shopInventoryItem.shop.toString() !== shopId) {
        return res.status(400).json({ message: `物品 ${shopInventoryItem.template?.itemName || item.shopInventoryItemId} 不属于该店铺` });
      }

      if (shopInventoryItem.quantity < item.quantity) {
        return res.status(400).json({ 
          message: `物品 ${shopInventoryItem.template?.itemName || item.shopInventoryItemId} 库存不足，当前库存: ${shopInventoryItem.quantity}` 
        });
      }

      if (!shopInventoryItem.isListed) {
        return res.status(400).json({ 
          message: `物品 ${shopInventoryItem.template?.itemName || item.shopInventoryItemId} 未上架，无法订购` 
        });
      }

      const itemTotal = shopInventoryItem.price * item.quantity;
      totalAmount += itemTotal;

      orderItems.push({
        shopInventoryItem: shopInventoryItem._id,
        quantity: item.quantity,
        price: shopInventoryItem.price,
        itemName: shopInventoryItem.template?.itemName || '未知物品',
        itemSnapshot: {
          rarity: shopInventoryItem.template?.rarity,
          itemType: shopInventoryItem.template?.itemType,
          gameType: shopInventoryItem.template?.gameType,
          images: shopInventoryItem.template?.images,
          runeCardInfo: shopInventoryItem.template?.runeCardInfo
        }
      });
    }

    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const orderNumber = `ORD${year}${month}${day}${random}`;

    const order = new Order({
      orderNumber,
      user: req.user._id,
      shop: shopId,
      items: orderItems,
      totalAmount,
      notes
    });

    await order.save();

    const shopWithEmployees = await Shop.findById(shopId);
    console.log('=== 订单创建 - 店铺信息 ===');
    console.log('shopId:', shopId);
    console.log('shopWithEmployees:', shopWithEmployees ? '存在' : '不存在');
    if (shopWithEmployees) {
      console.log('店铺名称:', shopWithEmployees.name);
      console.log('店铺员工数量:', shopWithEmployees.employees ? shopWithEmployees.employees.length : 0);
      console.log('店铺员工列表:', JSON.stringify(shopWithEmployees.employees, null, 2));
    }
    
    if (shopWithEmployees && shopWithEmployees.employees && shopWithEmployees.employees.length > 0) {
      const shopEmployees = shopWithEmployees.employees.filter(e => e.role === 'owner' || e.role === 'operator' || e.role === 'staff');
      console.log('符合条件的员工数量:', shopEmployees.length);
      console.log('符合条件的员工列表:', JSON.stringify(shopEmployees, null, 2));
      
      for (const employee of shopEmployees) {
        await createNotification(
          employee.user,
          'order_created',
          '新订单',
          `您有一笔新订单：${orderNumber}，金额：¥${totalAmount}`,
          { orderId: order._id, shopId }
        );
      }

      try {
        const groupMembers = [];
        
        console.log('开始创建群聊...');
        console.log('订单号:', orderNumber);
        console.log('创建者:', req.user._id);
        
        groupMembers.push({
          user: req.user._id,
          role: 'member',
          joinedAt: new Date()
        });

        for (const employee of shopEmployees) {
          if (employee.user) {
            let chatRole = 'member';
            if (employee.role === 'owner') {
              chatRole = 'owner';
            } else if (employee.role === 'operator') {
              chatRole = 'admin';
            }
            groupMembers.push({
              user: employee.user,
              role: chatRole,
              joinedAt: new Date()
            });
          }
        }
        
        console.log('群聊成员:', groupMembers);

        const groupChat = await GroupChat.create({
          name: `${orderNumber} - ${shopWithEmployees.name}`,
          description: `订单群聊：${orderNumber}`,
          creator: req.user._id,
          members: groupMembers,
          type: 'custom',
          level: 1,
          isPublic: false,
          maxMembers: 50,
          settings: {
            allowInvite: false,
            allowImages: true,
            allowAnonymous: false,
            allowNicknameChange: true
          }
        });

        console.log('群聊创建成功, ID:', groupChat._id);

        const systemMessage = {
          sender: req.user._id,
          content: `群聊 ${groupChat.name} 创建成功！`,
          readBy: [req.user._id],
          createdAt: new Date()
        };
        groupChat.messages.push(systemMessage);
        groupChat.lastMessage = {
          sender: req.user._id,
          content: systemMessage.content,
          readBy: [req.user._id],
          createdAt: new Date()
        };
        await groupChat.save();
        console.log('系统消息已发送');

        order.groupChat = groupChat._id;
        await order.save();
        console.log('订单已更新群聊ID');
      } catch (groupError) {
        console.error('创建群聊失败 (订单仍成功):', groupError.message);
      }
    }

    res.status(201).json({
      success: true,
      message: '订单创建成功',
      data: order
    });
  } catch (error) {
    console.error('创建订单错误:', error);
    res.status(500).json({ 
      success: false,
      message: '服务器错误', 
      error: error.message 
    });
  }
});

router.get('/', protect, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const filter = { user: req.user._id };
    if (status) {
      filter.status = status;
    }

    const orders = await Order.find(filter)
      .populate('shop', 'name logo employees')
      .populate('user', 'username email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // 手动populate店铺员工的user信息
    for (const order of orders) {
      if (order.shop && order.shop.employees && order.shop.employees.length > 0) {
        // 收集所有员工的用户ID
        const userIds = order.shop.employees.map(e => e.user).filter(Boolean);
        if (userIds.length > 0) {
          // 批量查询用户信息
          const users = await User.find({ _id: { $in: userIds } }).select('_id username email');
          const userMap = {};
          users.forEach(u => {
            userMap[u._id.toString()] = { _id: u._id, username: u.username, email: u.email };
          });

          // 填充员工的用户信息
          order.shop.employees = order.shop.employees.map(e => {
            const userIdStr = e.user?.toString ? e.user.toString() : String(e.user);
            return {
              ...e,
              user: userMap[userIdStr] || e.user
            };
          });
        }
      }
    }

    const total = await Order.countDocuments(filter);

    res.json({
      success: true,
      data: orders,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('获取订单列表错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

router.get('/:orderId', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId)
      .populate('shop', 'name logo location contactInfo employees')
      .populate('user', 'username email');

    if (!order) {
      return res.status(404).json({ message: '订单不存在' });
    }

    const isOrderUser = order.user._id.toString() === req.user._id.toString();
    const shop = await Shop.findById(order.shop._id);
    const isShopEmployee = shop && shop.employees.some(e => e.user.toString() === req.user._id.toString());

    if (!isOrderUser && !isShopEmployee && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: '无权查看此订单' });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('获取订单详情错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 设置群聊过期时间的辅助函数
const setGroupChatExpiration = async (order, senderUserId, days = 3) => {
  if (order.groupChat) {
    try {
      const groupChat = await GroupChat.findById(order.groupChat);
      if (groupChat) {
        // 设置过期时间为N天后
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + days);
        groupChat.expiresAt = expirationDate;
        
        // 在群聊中发送系统消息通知
        const systemMessage = {
          sender: senderUserId,
          content: `订单 ${order.orderNumber} 已完成！本群聊将在 ${days} 天后自动解散。如有需要，请保存重要内容。`,
          readBy: [senderUserId],
          createdAt: new Date()
        };
        groupChat.messages.push(systemMessage);
        groupChat.lastMessage = {
          sender: senderUserId,
          content: systemMessage.content,
          readBy: [senderUserId],
          createdAt: new Date()
        };
        await groupChat.save();
        console.log(`订单 ${order.orderNumber} 群聊 ${order.groupChat} 已设置为 ${days} 天后过期`);
      }
    } catch (groupError) {
      console.error('设置群聊过期时间失败:', groupError);
    }
  }
};

router.put('/:orderId/cancel', protect, async (req, res) => {
  try {
    const { reason } = req.body;
    const order = await Order.findById(req.params.orderId);

    if (!order) {
      return res.status(404).json({ message: '订单不存在' });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({ message: '只能取消待确认的订单' });
    }

    const isOrderUser = order.user.toString() === req.user._id.toString();
    const shop = await Shop.findById(order.shop);
    const isShopEmployee = shop && shop.employees.some(e => e.user.toString() === req.user._id.toString());

    if (!isOrderUser && !isShopEmployee && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: '无权取消此订单' });
    }

    order.status = 'cancelled';
    order.cancelReason = reason || '';
    order.cancelledBy = req.user._id;
    order.cancelledAt = new Date();

    await order.save();

    // 如果订单有关联的群聊，则解散群聊
    if (order.groupChat) {
      try {
        const groupChat = await GroupChat.findById(order.groupChat);
        if (groupChat) {
          // 在群聊中发送系统消息
          const systemMessage = {
            sender: req.user._id,
            content: `由于订单 ${order.orderNumber} 已取消，群聊即将解散`,
            readBy: [req.user._id],
            createdAt: new Date()
          };
          groupChat.messages.push(systemMessage);
          await groupChat.save();

          // 删除群聊
          await GroupChat.findByIdAndDelete(order.groupChat);
          console.log(`订单 ${order.orderNumber} 已取消，群聊 ${order.groupChat} 已解散`);
        }
      } catch (groupError) {
        console.error('解散群聊失败:', groupError);
      }
    }

    if (shop) {
      const shopOwners = shop.employees.filter(e => e.role === 'owner' || e.role === 'manager');
      for (const owner of shopOwners) {
        await createNotification(
          owner.user,
          'order_cancelled',
          '订单取消',
          `订单 ${order.orderNumber} 已被取消，取消原因：${reason || '未填写'}`,
          { orderId: order._id, shopId: shop._id }
        );
      }
    }

    await createNotification(
      order.user,
      'order_cancelled',
      '订单已取消',
      `您的订单 ${order.orderNumber} 已被取消，取消原因：${reason || '未填写'}`,
      { orderId: order._id, shopId: order.shop }
    );

    res.json({
      success: true,
      message: '订单已取消',
      data: order
    });
  } catch (error) {
    console.error('取消订单错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

router.put('/:orderId/confirm', protect, abac({ resource: 'shop', actions: ['write'] }), async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);

    if (!order) {
      return res.status(404).json({ message: '订单不存在' });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({ message: '只能确认待确认的订单' });
    }

    for (const item of order.items) {
      const shopItem = await ShopInventoryItem.findById(item.shopInventoryItem);
      if (!shopItem) {
        return res.status(404).json({ message: `物品 ${item.itemName} 不存在` });
      }

      if (shopItem.quantity < item.quantity) {
        return res.status(400).json({ 
          message: `物品 ${item.itemName} 库存不足，当前库存: ${shopItem.quantity}，需要: ${item.quantity}` 
        });
      }
    }

    order.status = 'confirmed';
    order.confirmedBy = req.user._id;
    order.confirmedAt = new Date();

    await order.save();

    await createNotification(
      order.user,
      'order_confirmed',
      '订单已确认',
      `您的订单 ${order.orderNumber} 已确认！`,
      { orderId: order._id, shopId: order.shop }
    );

    res.json({
      success: true,
      message: '订单已确认',
      data: order
    });
  } catch (error) {
    console.error('确认订单错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

router.put('/:orderId/complete', protect, abac({ resource: 'shop', actions: ['write'] }), async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);

    if (!order) {
      return res.status(404).json({ message: '订单不存在' });
    }

    if (order.status !== 'confirmed') {
      return res.status(400).json({ message: '只能完成已确认的订单' });
    }

    for (const item of order.items) {
      const shopItem = await ShopInventoryItem.findById(item.shopInventoryItem);
      if (!shopItem) {
        return res.status(404).json({ message: `物品 ${item.itemName} 不存在` });
      }

      if (shopItem.quantity < item.quantity) {
        return res.status(400).json({ 
          message: `物品 ${item.itemName} 库存不足，当前库存: ${shopItem.quantity}，需要: ${item.quantity}` 
        });
      }
    }

    // 扣减店铺库存
    for (const item of order.items) {
      await ShopInventoryItem.findByIdAndUpdate(
        item.shopInventoryItem,
        { $inc: { quantity: -item.quantity } }
      );
    }

    // 获取店铺库存物品信息，用于添加物品到用户个人库存
    for (const item of order.items) {
      const shopInventoryItem = await ShopInventoryItem.findById(item.shopInventoryItem);
      if (shopInventoryItem) {
        // 查找或创建用户的个人库存记录
        let userInventory = await UserInventory.findOne({
          userId: order.user,
          inventoryItemId: shopInventoryItem.template
        });

        if (userInventory) {
          // 如果已存在，增加数量
          userInventory.quantity += item.quantity;
          // 如果用户没有设置价值，使用订单中的价格
          if (!userInventory.value || userInventory.value === 0) {
            userInventory.value = item.price;
          }
          await userInventory.save();
        } else {
          // 创建新的用户库存记录
          userInventory = await UserInventory.create({
            userId: order.user,
            inventoryItemId: shopInventoryItem.template,
            quantity: item.quantity,
            value: item.price
          });
        }
      }
    }

    order.status = 'completed';
    order.completedBy = req.user._id;
    order.completedAt = new Date();

    await order.save();

    const shop = await Shop.findById(order.shop);
    if (shop) {
      shop.financialStats.totalRevenue += order.totalAmount;
      shop.financialStats.monthlyRevenue += order.totalAmount;
      shop.financialStats.lastUpdated = new Date();
      await shop.save();
    }

    await createNotification(
      order.user,
      'order_completed',
      '订单已完成',
      `您的订单 ${order.orderNumber} 已完成，感谢购买！商品已添加到您的个人库存。`,
      { orderId: order._id, shopId: order.shop }
    );

    // 设置群聊过期时间为3天后
    await setGroupChatExpiration(order, req.user._id, 3);

    res.json({
      success: true,
      message: '订单已完成，库存已扣减，商品已添加到用户个人库存',
      data: order
    });
  } catch (error) {
    console.error('完成订单错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

router.get('/shop/list', protect, abac({ resource: 'shop', actions: ['read'] }), async (req, res) => {
  try {
    const shopId = req.params.shopId;
    const { status, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const filter = { shop: shopId };
    if (status) {
      filter.status = status;
    }

    const orders = await Order.find(filter)
      .populate('user', 'username email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(filter);

    res.json({
      success: true,
      data: orders,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('获取店铺订单列表错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

module.exports = router;
