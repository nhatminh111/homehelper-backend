const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Tạo JWT token
const generateToken = (userId, role) => {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
};

// Đăng ký user mới
const register = async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;

    // Validation
    if (!name || !email || !password || !role) {
      return res.status(400).json({
        error: 'Thiếu thông tin bắt buộc',
        required: ['name', 'email', 'password', 'role']
      });
    }

    // Kiểm tra email đã tồn tại
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        error: 'Email đã được sử dụng'
      });
    }

    // Kiểm tra role hợp lệ
    const validRoles = ['Admin', 'Tasker', 'Customer', 'Guest'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        error: 'Role không hợp lệ',
        validRoles
      });
    }

    // Tạo user mới
    const newUser = await User.create({
      name,
      email,
      password,
      role,
      phone
    });

    // Tạo token
    const token = generateToken(newUser.user_id, newUser.role);

    // Trả về response (không bao gồm password)
    res.status(201).json({
      message: 'Đăng ký thành công!',
      user: {
        user_id: newUser.user_id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        phone: newUser.phone,
        created_at: newUser.created_at
      },
      token
    });

  } catch (error) {
    console.error('❌ Lỗi đăng ký:', error);
    res.status(500).json({
      error: 'Lỗi server nội bộ',
      message: error.message
    });
  }
};

// Đăng nhập
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        error: 'Thiếu email hoặc password'
      });
    }

    // Tìm user theo email
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({
        error: 'Email hoặc password không đúng'
      });
    }

    // Kiểm tra password
    const isValidPassword = await User.verifyPassword(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Email hoặc password không đúng'
      });
    }

    // Tạo token
    const token = generateToken(user.user_id, user.role);

    // Trả về response
    res.status(200).json({
      message: 'Đăng nhập thành công!',
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        cccd_status: user.cccd_status,
        created_at: user.created_at
      },
      token
    });

  } catch (error) {
    console.error('❌ Lỗi đăng nhập:', error);
    res.status(500).json({
      error: 'Lỗi server nội bộ',
      message: error.message
    });
  }
};

// Lấy thông tin user hiện tại
const getCurrentUser = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        error: 'Không tìm thấy user'
      });
    }

    res.status(200).json({
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        cccd_status: user.cccd_status,
        cccd_url: user.cccd_url,
        created_at: user.created_at,
        updated_at: user.updated_at
      }
    });

  } catch (error) {
    console.error('❌ Lỗi lấy thông tin user:', error);
    res.status(500).json({
      error: 'Lỗi server nội bộ',
      message: error.message
    });
  }
};

// Đổi password
const changePassword = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;

    // Validation
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Thiếu thông tin bắt buộc'
      });
    }

    // Lấy user với password
    const user = await User.findByEmail(req.user.email);
    if (!user) {
      return res.status(404).json({
        error: 'Không tìm thấy user'
      });
    }

    // Kiểm tra password hiện tại
    const isValidPassword = await User.verifyPassword(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(400).json({
        error: 'Password hiện tại không đúng'
      });
    }

    // Cập nhật password mới
    await User.updatePassword(userId, newPassword);

    res.status(200).json({
      message: 'Đổi password thành công!'
    });

  } catch (error) {
    console.error('❌ Lỗi đổi password:', error);
    res.status(500).json({
      error: 'Lỗi server nội bộ',
      message: error.message
    });
  }
};

// Quên password (gửi email reset)
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'Vui lòng nhập email'
      });
    }

    // Kiểm tra email tồn tại
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(404).json({
        error: 'Email không tồn tại trong hệ thống'
      });
    }

    // TODO: Gửi email reset password
    // Trong thực tế, bạn sẽ gửi email với link reset

    res.status(200).json({
      message: 'Đã gửi email reset password. Vui lòng kiểm tra hộp thư của bạn.'
    });

  } catch (error) {
    console.error('❌ Lỗi quên password:', error);
    res.status(500).json({
      error: 'Lỗi server nội bộ',
      message: error.message
    });
  }
};

// Reset password
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        error: 'Thiếu thông tin bắt buộc'
      });
    }

    // TODO: Verify token và reset password
    // Trong thực tế, bạn sẽ verify JWT token từ email

    res.status(200).json({
      message: 'Reset password thành công!'
    });

  } catch (error) {
    console.error('❌ Lỗi reset password:', error);
    res.status(500).json({
      error: 'Lỗi server nội bộ',
      message: error.message
    });
  }
};

module.exports = {
  register,
  login,
  getCurrentUser,
  changePassword,
  forgotPassword,
  resetPassword
};
