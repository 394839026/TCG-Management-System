const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

// @route   GET /api/dashboard
// @desc    受保护的仪表板路由示例
// @access  Private
router.get('/', protect, (req, res) => {
  res.json({
    success: true,
    message: `欢迎 ${req.user.username}! 这是受保护的路由。`,
    user: {
      id: req.user._id,
      username: req.user.username,
      email: req.user.email
    }
  });
});

module.exports = router;
