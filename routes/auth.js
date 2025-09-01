const express = require('express');
const router = express.Router();
const { 
  register, 
  login, 
  getCurrentUser, 
  changePassword, 
  forgotPassword, 
  resetPassword 
} = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

// POST /api/auth/register - Đăng ký user mới
router.post('/register', register);

// POST /api/auth/login - Đăng nhập
router.post('/login', login);

// POST /api/auth/forgot-password - Quên password
router.post('/forgot-password', forgotPassword);

// POST /api/auth/reset-password - Reset password
router.post('/reset-password', resetPassword);

// GET /api/auth/me - Lấy thông tin user hiện tại (cần xác thực)
router.get('/me', authenticateToken, getCurrentUser);

// POST /api/auth/change-password - Đổi password (cần xác thực)
router.post('/change-password', authenticateToken, changePassword);

module.exports = router;
