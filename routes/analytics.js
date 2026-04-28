const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const InventoryItem = require('../models/Inventory');
const TradeListing = require('../models/TradeListing');

// @route   GET /api/analytics/inventory
// @desc    库存分析报告
// @access  Private
router.get('/inventory', protect, async (req, res) => {
  try {
    const userId = req.user._id;

    // 按稀有度统计
    const rarityStats = await InventoryItem.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: '$rarity',
          count: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          totalValue: { $sum: { $multiply: ['$quantity', '$value'] } }
        }
      },
      { $sort: { totalValue: -1 } }
    ]);

    // 按类型统计
    const typeStats = await InventoryItem.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: '$itemType',
          count: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          totalValue: { $sum: { $multiply: ['$quantity', '$value'] } }
        }
      },
      { $sort: { totalValue: -1 } }
    ]);

    // 总体统计
    const overallStats = await InventoryItem.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: null,
          totalItems: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          totalValue: { $sum: { $multiply: ['$quantity', '$value'] } },
          avgValue: { $avg: '$value' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        overall: overallStats[0] || { totalItems: 0, totalQuantity: 0, totalValue: 0, avgValue: 0 },
        byRarity: rarityStats,
        byType: typeStats
      }
    });
  } catch (error) {
    console.error('库存分析错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   GET /api/analytics/value-trend
// @desc    价值趋势图表数据
// @access  Private
router.get('/value-trend', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const period = req.query.period || 'month'; // day, week, month, year

    let groupByFormat;
    switch (period) {
      case 'day':
        groupByFormat = '%Y-%m-%d';
        break;
      case 'week':
        groupByFormat = '%Y-W%V';
        break;
      case 'year':
        groupByFormat = '%Y-%m';
        break;
      default:
        groupByFormat = '%Y-%m-%d';
    }

    const trendData = await InventoryItem.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: {
            $dateToString: { format: groupByFormat, date: '$createdAt' }
          },
          totalValue: { $sum: { $multiply: ['$quantity', '$value'] } },
          itemCount: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      data: trendData
    });
  } catch (error) {
    console.error('价值趋势错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   GET /api/analytics/spending
// @desc    支出统计
// @access  Private
router.get('/spending', protect, async (req, res) => {
  try {
    const userId = req.user._id;

    const spendingStats = await InventoryItem.aggregate([
      { $match: { userId, acquisitionPrice: { $gt: 0 } } },
      {
        $group: {
          _id: null,
          totalSpent: { $sum: { $multiply: ['$quantity', '$acquisitionPrice'] } },
          avgPurchasePrice: { $avg: '$acquisitionPrice' },
          purchaseCount: { $sum: 1 }
        }
      }
    ]);

    // 按月份统计
    const monthlySpending = await InventoryItem.aggregate([
      { $match: { userId, acquisitionPrice: { $gt: 0 } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m', date: '$acquisitionDate' }
          },
          totalSpent: { $sum: { $multiply: ['$quantity', '$acquisitionPrice'] } },
          itemCount: { $sum: 1 }
        }
      },
      { $sort: { _id: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        overall: spendingStats[0] || { totalSpent: 0, avgPurchasePrice: 0, purchaseCount: 0 },
        monthly: monthlySpending
      }
    });
  } catch (error) {
    console.error('支出统计错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   GET /api/analytics/trades
// @desc    交易统计分析
// @access  Private
router.get('/trades', protect, async (req, res) => {
  try {
    const userId = req.user._id;

    // 我发布的交易
    const myListings = await TradeListing.find({ seller: userId });
    
    const tradeStats = {
      totalListings: myListings.length,
      activeListings: myListings.filter(l => l.status === 'active').length,
      completedListings: myListings.filter(l => l.status === 'completed').length,
      cancelledListings: myListings.filter(l => l.status === 'cancelled').length,
      totalViews: myListings.reduce((sum, l) => sum + l.views, 0),
      totalInterested: myListings.reduce((sum, l) => sum + l.interestedUsers.length, 0)
    };

    // 按类型统计
    const byType = {
      sell: myListings.filter(l => l.type === 'sell').length,
      buy: myListings.filter(l => l.type === 'buy').length,
      trade: myListings.filter(l => l.type === 'trade').length
    };

    res.json({
      success: true,
      data: {
        stats: tradeStats,
        byType
      }
    });
  } catch (error) {
    console.error('交易分析错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// @route   POST /api/analytics/export
// @desc    导出分析报告(CSV/JSON)
// @access  Private
router.post('/export', protect, async (req, res) => {
  try {
    const { type, format } = req.body; // type: inventory/spending/trades, format: csv/json

    let data;
    let filename;

    switch (type) {
      case 'inventory':
        data = await InventoryItem.find({ userId: req.user._id })
          .select('-__v');
        filename = 'inventory_report';
        break;
      case 'spending':
        data = await InventoryItem.find({ 
          userId: req.user._id,
          acquisitionPrice: { $gt: 0 }
        }).select('-__v');
        filename = 'spending_report';
        break;
      case 'trades':
        const TradeListing = require('../models/TradeListing');
        data = await TradeListing.find({ seller: req.user._id })
          .populate('items.item')
          .select('-__v');
        filename = 'trades_report';
        break;
      default:
        return res.status(400).json({ message: '无效的报表类型' });
    }

    if (format === 'csv') {
      // 简单的CSV转换
      if (data.length === 0) {
        return res.status(404).json({ message: '没有数据可导出' });
      }

      const headers = Object.keys(data[0].toObject()).join(',');
      const rows = data.map(item => 
        Object.values(item.toObject()).map(val => 
          typeof val === 'object' ? JSON.stringify(val) : val
        ).join(',')
      ).join('\n');
      
      const csv = `${headers}\n${rows}`;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}.csv`);
      res.send(csv);
    } else {
      // JSON格式
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}.json`);
      res.json(data);
    }
  } catch (error) {
    console.error('导出报告错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

module.exports = router;
