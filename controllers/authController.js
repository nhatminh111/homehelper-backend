const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const { OAuth2Client } = require('google-auth-library');

// In-memory token stores (replace with DB storage for production)
const resetTokens = new Map(); // email -> token

async function createTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE, SMTP_TLS_REJECT_UNAUTHORIZED, SMTP_IGNORE_TLS, NODE_ENV } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.warn('⚠️ SMTP not configured, emails will be logged to console.');
    return null;
  }
  const port = Number(SMTP_PORT || 587);
  const secure = typeof SMTP_SECURE !== 'undefined'
    ? String(SMTP_SECURE).toLowerCase() === 'true'
    : port === 465;
  const rejectUnauthorized = typeof SMTP_TLS_REJECT_UNAUTHORIZED !== 'undefined'
    ? String(SMTP_TLS_REJECT_UNAUTHORIZED).toLowerCase() === 'true'
    : true;
  const ignoreTLS = typeof SMTP_IGNORE_TLS !== 'undefined'
    ? String(SMTP_IGNORE_TLS).toLowerCase() === 'true'
    : false;

  const transportConfig = {
    host: SMTP_HOST,
    port,
    secure,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    tls: { rejectUnauthorized },
    ignoreTLS
  };

  if (NODE_ENV === 'development') {
    console.log('✉️ SMTP config:', {
      host: transportConfig.host,
      port: transportConfig.port,
      secure: transportConfig.secure,
      ignoreTLS: transportConfig.ignoreTLS,
      tls: transportConfig.tls
    });
  }

  return nodemailer.createTransport(transportConfig);
}

async function sendEmail({ to, subject, html }) {
  const transporter = await createTransporter();
  if (!transporter) {
    console.log(`\n📧 Mock email to: ${to}\nSubject: ${subject}\n${html}\n`);
    return true;
  }
  const from = process.env.MAIL_FROM || 'HomeHelper <no-reply@homehelper.local>';
  await transporter.sendMail({ from, to, subject, html });
  return true;
}

// Tạo JWT token
const generateToken = (userId, role) => {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
};

// Google OAuth client (lazy init)
let googleClient = null;
function getGoogleClient() {
  if (!googleClient) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      throw new Error('GOOGLE_CLIENT_ID is not configured');
    }
    googleClient = new OAuth2Client(clientId);
  }
  return googleClient;
}

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

    // Tạo token ngay sau khi đăng ký thành công
    const token = generateToken(newUser.user_id, newUser.role);

    // Trả về response với token để user có thể đăng nhập luôn
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

    // Bỏ kiểm tra email verification - cho phép đăng nhập luôn

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

    // Tạo token reset và gửi email
    const token = crypto.randomBytes(32).toString('hex');
    resetTokens.set(email, token);
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

    await sendEmail({
      to: email,
      subject: 'Reset your HomeHelper password',
      html: `<p>Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu của bạn.</p><p>Nhấn vào liên kết sau để đặt lại mật khẩu: <a href="${resetUrl}">Đặt lại mật khẩu</a></p><p>Nếu bạn không yêu cầu, có thể bỏ qua email này.</p>`
    });

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
    const { email, token, newPassword } = req.body;

    if (!email || !token || !newPassword) {
      return res.status(400).json({
        error: 'Thiếu thông tin bắt buộc'
      });
    }
    const stored = resetTokens.get(email);
    if (!stored || stored !== token) {
      return res.status(400).json({ error: 'Token không hợp lệ hoặc đã hết hạn' });
    }

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy user' });
    }

    await User.updatePassword(user.user_id, newPassword);
    resetTokens.delete(email);

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

// Xác minh email
const verifyEmail = async (req, res) => {
  try {
    const { email, token } = req.query;
    if (!email || !token) {
      return res.status(400).json({ error: 'Thiếu tham số' });
    }
    const stored = verificationTokens.get(email);
    if (!stored || stored !== token) {
      return res.status(400).json({ error: 'Token không hợp lệ hoặc đã hết hạn' });
    }
    
    // Cập nhật trạng thái email đã xác minh
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy user' });
    }
    
    // Cập nhật trạng thái email đã xác minh trong memory
    emailVerificationStatus.set(email, { verified: true, userId: user.user_id });
    
    // Xóa token verification
    verificationTokens.delete(email);
    
    // Tạo JWT token sau khi xác minh thành công
    const authToken = generateToken(user.user_id, user.role);
    
    res.status(200).json({ 
      message: 'Xác minh email thành công! Bạn có thể đăng nhập ngay bây giờ.',
      token: authToken,
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        created_at: user.created_at
      }
    });
  } catch (error) {
    console.error('❌ Lỗi xác minh email:', error);
    res.status(500).json({ error: 'Lỗi server nội bộ', message: error.message });
  }
};

module.exports = {
  register,
  login,
  getCurrentUser,
  changePassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
  // Google login handler will be attached below
};

// Đăng nhập với Google
module.exports.loginWithGoogle = async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ error: 'Thiếu idToken' });
    }

    const client = getGoogleClient();
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();
    const email = payload.email;
    const name = payload.name || payload.given_name || 'Google User';

    // Tìm user theo email
    let user = await User.findByEmail(email);

    // Nếu chưa có thì tạo user mới với role mặc định 'Customer'
    if (!user) {
      const tempPassword = crypto.randomBytes(16).toString('hex');
      const newUser = await User.create({
        name,
        email,
        password: tempPassword,
        role: 'Customer',
        phone: null
      });
      user = newUser;
    }

    const token = generateToken(user.user_id, user.role);

    res.status(200).json({
      message: 'Đăng nhập Google thành công!',
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone || null,
        created_at: user.created_at || new Date()
      },
      token
    });
  } catch (error) {
    console.error('❌ Lỗi đăng nhập Google:', error);
    res.status(500).json({ error: 'Lỗi server nội bộ', message: error.message });
  }
};
