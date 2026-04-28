/**
 * ABAC (Attribute-Based Access Control) 权限控制中间件
 * 基于资源的访问控制,结合RBAC使用
 */

/**
 * ABAC权限检查中间件工厂
 * @param {Object} options - 权限配置
 * @param {String} options.resource - 资源类型 ('team', 'shop', 'deck', 'inventory')
 * @param {Array} options.actions - 允许的操作 ('read', 'write', 'delete', 'manage')
 */
const abac = (options) => {
  return async (req, res, next) => {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ message: '未授权,请先登录' });
    }
    
    const resourceId = req.params.id || req.params.teamId || req.params.shopId || req.params.deckId;
    
    try {
      // 超级管理员拥有所有权限
      if (user.role === 'superadmin') {
        return next();
      }
      
      // 检查资源所有权或成员资格
      const hasPermission = await checkResourcePermission(user, resourceId, options);
      
      if (!hasPermission) {
        return res.status(403).json({
          message: '您没有权限执行此操作'
        });
      }
      
      next();
    } catch (error) {
      console.error('ABAC权限检查错误:', error);
      res.status(500).json({ message: '权限检查失败' });
    }
  };
};

/**
 * 检查资源权限
 */
async function checkResourcePermission(user, resourceId, options) {
  const { resource } = options;
  
  switch (resource) {
    case 'team':
      return await checkTeamPermission(user, resourceId, options.actions);
    case 'shop':
      return await checkShopPermission(user, resourceId, options.actions);
    case 'deck':
      return await checkDeckPermission(user, resourceId, options.actions);
    case 'inventory':
      return await checkInventoryPermission(user, resourceId, options.actions);
    default:
      return false;
  }
}

/**
 * 检查战队权限
 */
async function checkTeamPermission(user, teamId, actions) {
  const Team = require('../models/Team');
  const team = await Team.findById(teamId);
  
  if (!team) return false;
  
  // 所有者拥有所有权限
  if (team.owner.toString() === user._id.toString()) {
    return true;
  }
  
  // 检查成员权限
  const member = team.members.find(m => m.user.toString() === user._id.toString());
  if (!member) return false;
  
  // 根据角色和操作判断权限
  if (actions.includes('read')) {
    return true; // 所有成员可读
  }
  
  if (actions.includes('write')) {
    return member.role === 'leader' || 
           member.role === 'manager' || 
           member.permissions.canManageInventory;
  }
  
  if (actions.includes('delete')) {
    return member.role === 'leader'; // 仅队长可删除
  }
  
  if (actions.includes('manage')) {
    return member.role === 'leader'; // 仅队长可管理
  }
  
  return false;
}

/**
 * 检查店铺权限
 */
async function checkShopPermission(user, shopId, actions) {
  const Shop = require('../models/Shop');
  const shop = await Shop.findById(shopId);
  
  if (!shop) return false;
  
  // 所有者拥有所有权限
  if (shop.owner.toString() === user._id.toString()) {
    return true;
  }
  
  // 检查员工权限
  const employee = shop.employees.find(e => e.user.toString() === user._id.toString());
  if (!employee) return false;
  
  if (actions.includes('read')) {
    return employee.permissions.canViewReports || actions.length === 1;
  }
  
  if (actions.includes('write')) {
    return employee.role === 'manager' || 
           employee.permissions.canManageInventory ||
           employee.permissions.canRecordSales;
  }
  
  if (actions.includes('delete')) {
    return employee.role === 'manager';
  }
  
  if (actions.includes('manage')) {
    return employee.role === 'manager';
  }
  
  return false;
}

/**
 * 检查卡组权限
 */
async function checkDeckPermission(user, deckId, actions) {
  const Deck = require('../models/Deck');
  const deck = await Deck.findById(deckId);
  
  if (!deck) return false;
  
  // 所有者拥有所有权限
  if (deck.owner.toString() === user._id.toString()) {
    return true;
  }
  
  // 公共卡组可读
  if (actions.includes('read') && deck.isPublic) {
    return true;
  }
  
  return false;
}

/**
 * 检查库存权限
 */
async function checkInventoryPermission(user, itemId, actions) {
  const InventoryItem = require('../models/Inventory');
  const item = await InventoryItem.findById(itemId);
  
  if (!item) return false;
  
  // 所有者拥有所有权限
  if (item.userId.toString() === user._id.toString()) {
    return true;
  }
  
  // 非所有者只能读取(如果物品是公开的)
  if (actions.includes('read')) {
    return true; // 简化处理,实际可能需要更复杂的逻辑
  }
  
  return false;
}

module.exports = abac;
