const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const GachaProbability = require('../models/GachaProbability');

// 默认的稀有度配置
const DEFAULT_RARITIES = [
  { rarityId: 'N', rarityName: '普通', probability: 0.5, color: 'text-gray-600', bgColor: 'bg-gray-100', borderColor: 'border-gray-300', glowColor: '' },
  { rarityId: 'N_FOIL', rarityName: '普通（闪）', probability: 0.05, color: 'text-gray-600', bgColor: 'bg-gray-100', borderColor: 'border-gray-300', glowColor: 'shadow-gray-400/50' },
  { rarityId: 'U', rarityName: '不凡', probability: 0.25, color: 'text-blue-600', bgColor: 'bg-blue-100', borderColor: 'border-blue-400', glowColor: '' },
  { rarityId: 'U_FOIL', rarityName: '不凡（闪）', probability: 0.03, color: 'text-blue-600', bgColor: 'bg-blue-100', borderColor: 'border-blue-400', glowColor: 'shadow-blue-400/50' },
  { rarityId: 'R', rarityName: '稀有', probability: 0.1, color: 'text-purple-600', bgColor: 'bg-purple-100', borderColor: 'border-purple-400', glowColor: 'shadow-purple-400/30' },
  { rarityId: 'E', rarityName: '史诗', probability: 0.05, color: 'text-yellow-600', bgColor: 'bg-yellow-100', borderColor: 'border-yellow-400', glowColor: 'shadow-yellow-400/40' },
  { rarityId: 'AA', rarityName: '异画', probability: 0.015, color: 'text-red-600', bgColor: 'bg-red-100', borderColor: 'border-red-400', glowColor: 'shadow-red-400/50' },
  { rarityId: 'AA_SIGN', rarityName: '异画（签字）', probability: 0.003, color: 'text-red-600', bgColor: 'bg-red-100', borderColor: 'border-red-400', glowColor: 'shadow-red-500/60' },
  { rarityId: 'AA_ULTIMATE', rarityName: '异画（终极超编）', probability: 0.002, color: 'text-red-600', bgColor: 'bg-red-100', borderColor: 'border-red-400', glowColor: 'shadow-red-500/70' },
  { rarityId: 'common', rarityName: '普通', probability: 0.5, color: 'text-gray-600', bgColor: 'bg-gray-100', borderColor: 'border-gray-300', glowColor: '' },
  { rarityId: 'uncommon', rarityName: '不凡', probability: 0.3, color: 'text-blue-600', bgColor: 'bg-blue-100', borderColor: 'border-blue-400', glowColor: '' },
  { rarityId: 'rare', rarityName: '稀有', probability: 0.15, color: 'text-purple-600', bgColor: 'bg-purple-100', borderColor: 'border-purple-400', glowColor: 'shadow-purple-400/30' },
  { rarityId: 'super_rare', rarityName: '超稀有', probability: 0.035, color: 'text-yellow-600', bgColor: 'bg-yellow-100', borderColor: 'border-yellow-400', glowColor: 'shadow-yellow-400/40' },
  { rarityId: 'ultra_rare', rarityName: '极稀有', probability: 0.01, color: 'text-orange-600', bgColor: 'bg-orange-100', borderColor: 'border-orange-400', glowColor: 'shadow-orange-400/50' },
  { rarityId: 'secret_rare', rarityName: '秘密稀有', probability: 0.005, color: 'text-pink-600', bgColor: 'bg-pink-100', borderColor: 'border-pink-400', glowColor: 'shadow-pink-400/60' },
];

// 获取所有概率配置（公开接口）
router.get('/', async (req, res) => {
  try {
    // 获取激活的概率配置
    const config = await GachaProbability.findOne({ isActive: true }).sort({ createdAt: -1 });
    
    if (!config) {
      return res.json({
        success: true,
        data: {
          name: '默认配置',
          description: '系统默认抽卡概率配置',
          rarities: DEFAULT_RARITIES,
        }
      });
    }
    
    res.json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 获取所有概率配置列表（管理员）
router.get('/admin/all', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const configs = await GachaProbability.find().sort({ createdAt: -1 }).populate('createdBy', 'username');
    res.json({
      success: true,
      data: configs,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 获取单个概率配置（管理员）
router.get('/admin/:id', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const config = await GachaProbability.findById(req.params.id).populate('createdBy', 'username');
    
    if (!config) {
      return res.status(404).json({
        success: false,
        message: '配置不存在'
      });
    }
    
    res.json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 创建新的概率配置（管理员）
router.post('/', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const { name, description, rarities } = req.body;
    
    if (!name || !rarities || !Array.isArray(rarities)) {
      return res.status(400).json({
        success: false,
        message: '请提供有效的配置数据'
      });
    }
    
    const newConfig = await GachaProbability.create({
      name,
      description: description || '',
      rarities,
      createdBy: req.user._id,
    });
    
    res.status(201).json({
      success: true,
      data: newConfig,
      message: '概率配置创建成功'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 更新概率配置（管理员）
router.put('/:id', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const config = await GachaProbability.findById(req.params.id);
    
    if (!config) {
      return res.status(404).json({
        success: false,
        message: '配置不存在'
      });
    }
    
    const { name, description, rarities, isActive } = req.body;
    
    if (name !== undefined) config.name = name;
    if (description !== undefined) config.description = description;
    if (rarities !== undefined) config.rarities = rarities;
    if (isActive !== undefined) {
      if (isActive) {
        await GachaProbability.updateMany({}, { isActive: false });
      }
      config.isActive = isActive;
    }
    
    await config.save();
    
    res.json({
      success: true,
      data: config,
      message: '概率配置更新成功'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 删除概率配置（管理员）
router.delete('/:id', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const config = await GachaProbability.findById(req.params.id);
    
    if (!config) {
      return res.status(404).json({
        success: false,
        message: '配置不存在'
      });
    }
    
    await config.deleteOne();
    
    res.json({
      success: true,
      message: '概率配置删除成功'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 激活某个配置（管理员）
router.post('/:id/activate', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const config = await GachaProbability.findById(req.params.id);
    
    if (!config) {
      return res.status(404).json({
        success: false,
        message: '配置不存在'
      });
    }
    
    await GachaProbability.updateMany({}, { isActive: false });
    config.isActive = true;
    await config.save();
    
    res.json({
      success: true,
      data: config,
      message: '概率配置激活成功'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

module.exports = router;
