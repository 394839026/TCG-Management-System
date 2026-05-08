const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Team = require('../models/Team');
const Deck = require('../models/Deck');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const checkTeamMember = async (user, teamId) => {
  const team = await Team.findById(teamId);
  if (!team) return { isMember: false, isLeader: false, isManager: false, role: null, team };

  const member = team.members.find(m => m.user.toString() === user._id.toString());
  const isLeader = team.owner.toString() === user._id.toString();
  const isManager = isLeader || member?.role === 'manager' || member?.role === 'admin';

  return {
    isMember: !!member || isLeader,
    isLeader,
    isManager,
    role: member?.role || (isLeader ? 'leader' : null),
    team
  };
};

// 获取战队共享构筑列表
router.get('/:teamId/decks', protect, async (req, res) => {
  try {
    const { teamId } = req.params;

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: '战队不存在' });
    }

    const memberCheck = await checkTeamMember(req.user, teamId);
    if (!memberCheck.isMember && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: '您不是该战队成员' });
    }

    const deckIds = team.sharedDecks.map(sd => sd.deck);
    const decks = await Deck.find({ _id: { $in: deckIds } });

    const enrichedDecks = decks.map(deck => {
      const sharedInfo = team.sharedDecks.find(
        sd => sd.deck.toString() === deck._id.toString()
      );
      return {
        ...deck.toObject(),
        sharedAt: sharedInfo?.addedAt,
        isAvailable: sharedInfo?.isAvailable,
        borrowedBy: sharedInfo?.borrowedBy,
        borrowedAt: sharedInfo?.borrowedAt,
        returnDate: sharedInfo?.returnDate,
        addedBy: sharedInfo?.addedBy
      };
    });

    const stats = {
      totalDecks: enrichedDecks.length,
      availableDecks: enrichedDecks.filter(d => d.isAvailable).length,
      borrowedDecks: enrichedDecks.filter(d => !d.isAvailable).length
    };

    res.json({
      success: true,
      data: enrichedDecks,
      stats
    });
  } catch (error) {
    console.error('获取战队构筑错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 添加构筑到战队共享
router.post('/:teamId/decks', protect, [
  body('deckId').notEmpty().withMessage('构筑ID不能为空')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { teamId } = req.params;
    const { deckId } = req.body;

    const memberCheck = await checkTeamMember(req.user, teamId);
    if (!memberCheck.isMember) {
      return res.status(403).json({ message: '您不是该战队成员' });
    }

    const team = memberCheck.team;

    // 检查构筑是否存在且属于当前用户
    const deck = await Deck.findById(deckId);
    if (!deck) {
      return res.status(404).json({ message: '构筑不存在' });
    }

    if (deck.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: '您只能共享自己的构筑' });
    }

    // 检查是否已在共享列表中
    const alreadyShared = team.sharedDecks?.some(
      sd => sd.deck.toString() === deckId
    );
    if (alreadyShared) {
      return res.status(400).json({ message: '该构筑已在战队共享列表中' });
    }

    // 添加到共享列表
    if (!team.sharedDecks) {
      team.sharedDecks = [];
    }
    team.sharedDecks.push({
      deck: deckId,
      addedBy: req.user._id,
      isAvailable: true
    });

    await team.save();

    res.status(201).json({
      success: true,
      message: '构筑已添加到战队共享'
    });
  } catch (error) {
    console.error('添加战队构筑错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 从战队共享移除构筑
router.delete('/:teamId/decks/:deckId', protect, async (req, res) => {
  try {
    const { teamId, deckId } = req.params;

    const memberCheck = await checkTeamMember(req.user, teamId);
    if (!memberCheck.isMember) {
      return res.status(403).json({ message: '您不是该战队成员' });
    }

    const team = memberCheck.team;

    const sharedDeckIndex = team.sharedDecks?.findIndex(
      sd => sd.deck.toString() === deckId
    );
    if (sharedDeckIndex === -1) {
      return res.status(404).json({ message: '该构筑不在战队共享列表中' });
    }

    const sharedDeck = team.sharedDecks[sharedDeckIndex];

    // 检查权限：只有添加者、队长或管理员可以移除
    if (sharedDeck.addedBy.toString() !== req.user._id.toString() &&
        !memberCheck.isManager) {
      return res.status(403).json({ message: '您没有权限移除该构筑' });
    }

    // 检查是否被借用
    if (!sharedDeck.isAvailable) {
      return res.status(400).json({ message: '该构筑正在被借用，无法移除' });
    }

    team.sharedDecks.splice(sharedDeckIndex, 1);
    await team.save();

    res.json({
      success: true,
      message: '构筑已从战队共享移除'
    });
  } catch (error) {
    console.error('移除战队构筑错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 创建构筑借用申请
router.post('/:teamId/deck-borrow-requests', protect, [
  body('deckId').notEmpty().withMessage('构筑ID不能为空')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { teamId } = req.params;
    const { deckId, note, returnDate } = req.body;

    const memberCheck = await checkTeamMember(req.user, teamId);
    if (!memberCheck.isMember) {
      return res.status(403).json({ message: '您不是该战队成员' });
    }

    const team = memberCheck.team;

    // 检查构筑是否在共享列表中且可用
    const sharedDeck = team.sharedDecks?.find(
      sd => sd.deck.toString() === deckId && sd.isAvailable
    );
    if (!sharedDeck) {
      return res.status(400).json({ message: '该构筑不可用或不在战队共享列表中' });
    }

    // 获取构筑信息
    const deck = await Deck.findById(deckId);
    if (!deck) {
      return res.status(404).json({ message: '构筑不存在' });
    }

    // 创建借用申请
    if (!team.deckBorrowRequests) {
      team.deckBorrowRequests = [];
    }
    team.deckBorrowRequests.push({
      deck: deckId,
      deckName: deck.name,
      requestedBy: req.user._id,
      requestDate: new Date(),
      status: 'pending',
      returnDate: returnDate ? new Date(returnDate) : undefined,
      note: note || ''
    });

    await team.save();

    // 发送通知给队长
    if (team.owner.toString() !== req.user._id.toString()) {
      const Notification = require('../models/Notification');
      const notification = new Notification({
        recipient: team.owner,
        type: 'system',
        title: '新的构筑借用申请',
        content: `${req.user.username} 申请借用构筑: ${deck.name}`,
        relatedId: team._id,
      });
      await notification.save();
    }

    res.status(201).json({
      success: true,
      message: '借用申请已提交，等待批准'
    });
  } catch (error) {
    console.error('创建构筑借用申请错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取构筑借用申请列表
router.get('/:teamId/deck-borrow-requests', protect, async (req, res) => {
  try {
    const { teamId } = req.params;
    const { status } = req.query;

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: '战队不存在' });
    }

    const memberCheck = await checkTeamMember(req.user, teamId);
    if (!memberCheck.isMember && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: '您不是该战队成员' });
    }

    // 筛选申请
    let deckBorrowRequests = team.deckBorrowRequests || [];
    const filterStatus = status || 'pending';
    if (filterStatus !== 'all') {
      deckBorrowRequests = deckBorrowRequests.filter(r => r.status === filterStatus);
    }

    // 获取构筑详细信息
    const deckIds = deckBorrowRequests.map(r => r.deck);
    const decks = await Deck.find({ _id: { $in: deckIds } });

    // 获取用户详细信息
    const userIds = [...new Set([
      ...deckBorrowRequests.map(r => r.requestedBy.toString()),
      ...deckBorrowRequests.filter(r => r.handledBy).map(r => r.handledBy.toString())
    ])];
    const users = await User.find({ _id: { $in: userIds } });

    // 合并数据
    const enrichedRequests = deckBorrowRequests.map(request => {
      const deck = decks.find(d => d._id.toString() === request.deck.toString());
      const requestedByUser = users.find(u => u._id.toString() === request.requestedBy.toString());
      const handledByUser = request.handledBy ? users.find(u => u._id.toString() === request.handledBy.toString()) : null;
      return {
        _id: request._id,
        deck: deck ? deck.toObject() : null,
        deckName: request.deckName || deck?.name || '未知构筑',
        requestedBy: requestedByUser ? { _id: requestedByUser._id, username: requestedByUser.username, email: requestedByUser.email } : request.requestedBy,
        requestDate: request.requestDate,
        status: request.status,
        handledBy: handledByUser ? { _id: handledByUser._id, username: handledByUser.username } : request.handledBy,
        handledDate: request.handledDate,
        returnDate: request.returnDate,
        note: request.note
      };
    });

    // 按时间倒序排列
    enrichedRequests.sort((a, b) => new Date(b.requestDate) - new Date(a.requestDate));

    res.json({
      success: true,
      data: enrichedRequests
    });
  } catch (error) {
    console.error('获取构筑借用申请错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 处理构筑借用申请
router.post('/:teamId/deck-borrow-requests/:requestId/handle', protect, async (req, res) => {
  try {
    const { teamId, requestId } = req.params;
    const { action } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: '无效的操作' });
    }

    const memberCheck = await checkTeamMember(req.user, teamId);
    if (!memberCheck.isManager) {
      return res.status(403).json({ message: '只有队长或管理员可以处理借用申请' });
    }

    const team = memberCheck.team;
    const requestIndex = team.deckBorrowRequests?.findIndex(r => r._id.toString() === requestId);
    
    if (requestIndex === -1) {
      return res.status(404).json({ message: '借用申请不存在' });
    }

    const borrowRequest = team.deckBorrowRequests[requestIndex];

    if (borrowRequest.status !== 'pending') {
      return res.status(400).json({ message: '该申请已被处理过了' });
    }

    if (action === 'approve') {
      // 批准：更新共享构筑状态
      const sharedDeck = team.sharedDecks?.find(
        sd => sd.deck.toString() === borrowRequest.deck.toString() && sd.isAvailable
      );
      
      if (!sharedDeck) {
        return res.status(400).json({ message: '该构筑已不可用' });
      }

      sharedDeck.isAvailable = false;
      sharedDeck.borrowedBy = borrowRequest.requestedBy;
      sharedDeck.borrowedAt = new Date();
      sharedDeck.returnDate = borrowRequest.returnDate;

      // 添加借用记录
      if (!team.deckBorrowRecords) {
        team.deckBorrowRecords = [];
      }
      team.deckBorrowRecords.push({
        deck: borrowRequest.deck,
        deckName: borrowRequest.deckName,
        borrowedBy: borrowRequest.requestedBy,
        borrowedAt: new Date(),
        returnDate: borrowRequest.returnDate,
        status: 'borrowed',
        note: borrowRequest.note
      });

      borrowRequest.status = 'approved';
      borrowRequest.handledBy = req.user._id;
      borrowRequest.handledDate = new Date();

      // 发送通知给申请人
      if (borrowRequest.requestedBy.toString() !== req.user._id.toString()) {
        const Notification = require('../models/Notification');
        const notification = new Notification({
          recipient: borrowRequest.requestedBy,
          type: 'system',
          title: '构筑借用申请已批准',
          content: `您的构筑借用申请 (${borrowRequest.deckName}) 已被批准`,
          relatedId: team._id,
        });
        await notification.save();
      }

    } else {
      // 拒绝：只更新申请状态
      borrowRequest.status = 'rejected';
      borrowRequest.handledBy = req.user._id;
      borrowRequest.handledDate = new Date();

      // 发送通知给申请人
      if (borrowRequest.requestedBy.toString() !== req.user._id.toString()) {
        const Notification = require('../models/Notification');
        const notification = new Notification({
          recipient: borrowRequest.requestedBy,
          type: 'system',
          title: '构筑借用申请已拒绝',
          content: `您的构筑借用申请 (${borrowRequest.deckName}) 已被拒绝`,
          relatedId: team._id,
        });
        await notification.save();
      }
    }

    await team.save();

    res.json({
      success: true,
      message: action === 'approve' ? '借用已批准，构筑已借出' : '借用已拒绝'
    });
  } catch (error) {
    console.error('处理构筑借用申请错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取构筑借用记录
router.get('/:teamId/deck-borrow-records', protect, async (req, res) => {
  try {
    const { teamId } = req.params;
    const { status } = req.query;

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: '战队不存在' });
    }

    const memberCheck = await checkTeamMember(req.user, teamId);
    if (!memberCheck.isMember && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: '您不是该战队成员' });
    }

    // 筛选记录
    let deckBorrowRecords = team.deckBorrowRecords || [];
    if (status && status !== 'all') {
      deckBorrowRecords = deckBorrowRecords.filter(r => r.status === status);
    }

    // 获取构筑详细信息
    const deckIds = deckBorrowRecords.map(r => r.deck);
    const decks = await Deck.find({ _id: { $in: deckIds } });

    // 获取用户详细信息
    const userIds = deckBorrowRecords.map(r => r.borrowedBy.toString());
    const users = await User.find({ _id: { $in: userIds } });

    // 合并数据
    const enrichedRecords = deckBorrowRecords.map(record => {
      const deck = decks.find(d => d._id.toString() === record.deck.toString());
      const borrowedByUser = users.find(u => u._id.toString() === record.borrowedBy.toString());
      return {
        _id: record._id,
        deck: deck ? deck.toObject() : null,
        deckName: record.deckName || deck?.name || '未知构筑',
        borrowedBy: borrowedByUser ? { _id: borrowedByUser._id, username: borrowedByUser.username, email: borrowedByUser.email } : record.borrowedBy,
        borrowedAt: record.borrowedAt,
        returnedAt: record.returnedAt,
        returnDate: record.returnDate,
        status: record.status,
        note: record.note
      };
    });

    // 按时间倒序排列
    enrichedRecords.sort((a, b) => new Date(b.borrowedAt) - new Date(a.borrowedAt));

    res.json({
      success: true,
      data: enrichedRecords
    });
  } catch (error) {
    console.error('获取构筑借用记录错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 归还构筑
router.post('/:teamId/deck-borrow-records/:recordId/return', protect, async (req, res) => {
  try {
    const { teamId, recordId } = req.params;

    const memberCheck = await checkTeamMember(req.user, teamId);
    if (!memberCheck.isMember) {
      return res.status(403).json({ message: '您不是该战队成员' });
    }

    const team = memberCheck.team;
    const recordIndex = team.deckBorrowRecords?.findIndex(r => r._id.toString() === recordId);
    
    if (recordIndex === -1) {
      return res.status(404).json({ message: '借用记录不存在' });
    }

    const borrowRecord = team.deckBorrowRecords[recordIndex];

    if (borrowRecord.status !== 'borrowed') {
      return res.status(400).json({ message: '该构筑已归还' });
    }

    // 检查权限：只有借用人、队长或管理员可以归还
    const isOwner = borrowRecord.borrowedBy.toString() === req.user._id.toString();
    if (!isOwner && !memberCheck.isManager) {
      return res.status(403).json({ message: '只有借用人、队长或管理员可以归还构筑' });
    }

    // 更新借用记录
    borrowRecord.status = 'returned';
    borrowRecord.returnedAt = new Date();

    // 恢复共享构筑
    const sharedDeck = team.sharedDecks?.find(
      sd => sd.deck.toString() === borrowRecord.deck.toString()
    );

    if (sharedDeck) {
      sharedDeck.isAvailable = true;
      sharedDeck.borrowedBy = undefined;
      sharedDeck.borrowedAt = undefined;
      sharedDeck.returnDate = undefined;
    }

    await team.save();

    res.json({
      success: true,
      message: '构筑已成功归还'
    });
  } catch (error) {
    console.error('归还构筑错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取我的构筑借用记录
router.get('/:teamId/decks/my-borrows', protect, async (req, res) => {
  try {
    const { teamId } = req.params;

    const memberCheck = await checkTeamMember(req.user, teamId);
    if (!memberCheck.isMember) {
      return res.status(403).json({ message: '您不是该战队成员' });
    }

    const team = await Team.findById(teamId);

    const myBorrows = team.sharedDecks.filter(
      sd => sd.borrowedBy?.toString() === req.user._id.toString()
    );

    const decks = await Deck.find({
      _id: { $in: myBorrows.map(b => b.deck) }
    });

    const enrichedDecks = decks.map(deck => {
      const sharedInfo = myBorrows.find(
        si => si.deck.toString() === deck._id.toString()
      );
      return {
        ...deck.toObject(),
        borrowedAt: sharedInfo?.borrowedAt,
        returnDate: sharedInfo?.returnDate
      };
    });

    res.json({
      success: true,
      data: enrichedDecks
    });
  } catch (error) {
    console.error('获取我的构筑借用记录错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

module.exports = router;
