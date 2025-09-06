const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Notification = require('../models/Notification');

class SocketHandler {
  constructor(io) {
    this.io = io;
    this.connectedUsers = new Map(); // Map<userId, socketId>
    this.userSockets = new Map(); // Map<socketId, userId>
    this.typingUsers = new Map(); // Map<conversationId, Set<userId>>
    this.joinedRooms = new Map(); // Map<socketId, Set<roomName>>
    this.readThrottle = new Map(); // Map<userId:conversationId, timestamp>
    
    this.setupMiddleware();
    this.setupEventHandlers();
  }

  // Middleware xác thực JWT cho Socket.IO
  setupMiddleware() {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Không có token xác thực'));
        }

        // Phải dùng đúng cùng JWT_SECRET với authController để tránh sai lệch sau đăng nhập
        if (!process.env.JWT_SECRET) {
          return next(new Error('JWT_SECRET chưa được cấu hình'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.user_id ?? decoded.userId;
        const user = await User.findById(userId);
        
        if (!user) {
          return next(new Error('User không tồn tại'));
        }

        socket.userId = userId;
        socket.user = user;
        next();
      } catch (error) {
        next(new Error('Token không hợp lệ'));
      }
    });
  }

  // Thiết lập các event handlers
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      
      // Lưu thông tin kết nối
      this.connectedUsers.set(socket.userId, socket.id);
      this.userSockets.set(socket.id, socket.userId);
      this.joinedRooms.set(socket.id, new Set());

      // Gửi thông báo user online
      this.broadcastUserStatus(socket.userId, 'online');

      // Event: Join conversation room
      socket.on('join_conversation', (data) => this.handleJoinConversation(socket, data));
      
      // Event: Leave conversation room
      socket.on('leave_conversation', (data) => this.handleLeaveConversation(socket, data));
      
      // Event: Send message
      socket.on('send_message', (data) => this.handleSendMessage(socket, data));
      
      // Event: Typing indicator
      socket.on('typing_start', (data) => this.handleTypingStart(socket, data));
      socket.on('typing_stop', (data) => this.handleTypingStop(socket, data));
      
      // Event: Message read
      socket.on('message_read', (data) => this.handleMessageRead(socket, data));
      
      // Event: Notification read
      socket.on('notification_read', (data) => this.handleNotificationRead(socket, data));
      
      // Event: Disconnect
      socket.on('disconnect', () => this.handleDisconnect(socket));
    });
  }

  // Xử lý join conversation room
  async handleJoinConversation(socket, data) {
    try {
      const { conversationId } = data;
      
      if (!conversationId) {
        socket.emit('error', { message: 'Thiếu conversationId' });
        return;
      }

      // Kiểm tra user có trong cuộc trò chuyện không
      const isParticipant = await Conversation.isParticipant(conversationId, socket.userId);
      if (!isParticipant) {
        socket.emit('error', { message: 'Bạn không có quyền truy cập cuộc trò chuyện này' });
        return;
      }

      // Join room
      const room = `conversation_${conversationId}`;
      const rooms = this.joinedRooms.get(socket.id) || new Set();
      if (rooms.has(room)) {
        return; // tránh join trùng
      }
      socket.join(room);
      rooms.add(room);
      this.joinedRooms.set(socket.id, rooms);
      
      // Gửi thông báo user đã join
      socket.to(`conversation_${conversationId}`).emit('user_joined', {
        userId: socket.userId,
        userName: socket.user.name,
        conversationId
      });

      
    } catch (error) {
      console.error('Lỗi join conversation:', error);
      socket.emit('error', { message: 'Lỗi join conversation' });
    }
  }

  // Xử lý leave conversation room
  async handleLeaveConversation(socket, data) {
    try {
      const { conversationId } = data;
      
      if (!conversationId) {
        socket.emit('error', { message: 'Thiếu conversationId' });
        return;
      }

      // Leave room
      const room = `conversation_${conversationId}`;
      const rooms = this.joinedRooms.get(socket.id) || new Set();
      if (!rooms.has(room)) {
        return; // đã rời trước đó
      }
      socket.leave(room);
      rooms.delete(room);
      this.joinedRooms.set(socket.id, rooms);
      
      // Gửi thông báo user đã leave
      socket.to(`conversation_${conversationId}`).emit('user_left', {
        userId: socket.userId,
        userName: socket.user.name,
        conversationId
      });

      
    } catch (error) {
      console.error('Lỗi leave conversation:', error);
      socket.emit('error', { message: 'Lỗi leave conversation' });
    }
  }

  // Xử lý gửi tin nhắn
  async handleSendMessage(socket, data) {
    try {
      const { conversationId, content, messageType = 'text', replyToMessageId } = data;
      
      if (!conversationId || !content) {
        socket.emit('error', { message: 'Thiếu thông tin bắt buộc' });
        return;
      }

      // Kiểm tra user có trong cuộc trò chuyện không
      const isParticipant = await Conversation.isParticipant(conversationId, socket.userId);
      if (!isParticipant) {
        socket.emit('error', { message: 'Bạn không có quyền gửi tin nhắn trong cuộc trò chuyện này' });
        return;
      }

      // Tạo tin nhắn
      const messageData = {
        conversation_id: conversationId,
        sender_id: socket.userId,
        content: content.trim(),
        message_type: messageType,
        reply_to_message_id: replyToMessageId
      };

      const message = await Message.create(messageData);

      // Gửi tin nhắn đến tất cả user trong room
      this.io.to(`conversation_${conversationId}`).emit('new_message', {
        message,
        conversationId
      });

      // Lấy danh sách participants để gửi thông báo
      const conversation = await Conversation.findById(conversationId);
      const otherParticipants = conversation.participants
        .filter(p => p.user_id !== socket.userId)
        .map(p => p.user_id);

      // Tạo thông báo cho các participants khác
      for (const participantId of otherParticipants) {
        try {
          await Notification.createMessageNotification(
            conversationId,
            socket.userId,
            participantId,
            content
          );

          // Gửi thông báo real-time nếu user đang online
          const participantSocketId = this.connectedUsers.get(participantId);
          if (participantSocketId) {
            this.io.to(participantSocketId).emit('new_notification', {
              type: 'message',
              conversationId,
              senderId: socket.userId,
              senderName: socket.user.name,
              content: content.length > 100 ? content.substring(0, 100) + '...' : content
            });
          }
        } catch (notificationError) {
          console.error('Lỗi tạo thông báo:', notificationError);
        }
      }

      
    } catch (error) {
      console.error('Lỗi gửi tin nhắn:', error);
      socket.emit('error', { message: 'Lỗi gửi tin nhắn' });
    }
  }

  // Xử lý typing start
  handleTypingStart(socket, data) {
    try {
      const { conversationId } = data;
      
      if (!conversationId) {
        return;
      }

      // Thêm user vào danh sách đang typing
      if (!this.typingUsers.has(conversationId)) {
        this.typingUsers.set(conversationId, new Set());
      }
      this.typingUsers.get(conversationId).add(socket.userId);

      // Gửi thông báo typing đến các user khác trong room
      socket.to(`conversation_${conversationId}`).emit('user_typing', {
        userId: socket.userId,
        userName: socket.user.name,
        conversationId,
        isTyping: true
      });

      // Tự động dừng typing sau 3 giây
      setTimeout(() => {
        this.handleTypingStop(socket, { conversationId });
      }, 3000);
    } catch (error) {
      console.error('Lỗi typing start:', error);
    }
  }

  // Xử lý typing stop
  handleTypingStop(socket, data) {
    try {
      const { conversationId } = data;
      
      if (!conversationId) {
        return;
      }

      // Xóa user khỏi danh sách đang typing
      if (this.typingUsers.has(conversationId)) {
        this.typingUsers.get(conversationId).delete(socket.userId);
        
        // Nếu không còn ai typing, xóa conversation khỏi map
        if (this.typingUsers.get(conversationId).size === 0) {
          this.typingUsers.delete(conversationId);
        }
      }

      // Gửi thông báo dừng typing đến các user khác trong room
      socket.to(`conversation_${conversationId}`).emit('user_typing', {
        userId: socket.userId,
        userName: socket.user.name,
        conversationId,
        isTyping: false
      });
    } catch (error) {
      console.error('Lỗi typing stop:', error);
    }
  }

  // Xử lý message read
  async handleMessageRead(socket, data) {
    try {
      const { conversationId } = data;
      
      if (!conversationId) {
        return;
      }

      // Throttle read events để tránh spam log/sự kiện
      const key = `${socket.userId}:${conversationId}`;
      const now = Date.now();
      const last = this.readThrottle.get(key) || 0;
      // Throttle mạnh hơn: tối đa 1 lần / 5s cho mỗi user-conversation
      if (now - last < 5000) {
        return;
      }
      this.readThrottle.set(key, now);

      // Cập nhật thời gian đọc cuối
      await Conversation.updateLastRead(conversationId, socket.userId);

      // Gửi thông báo đã đọc đến các user khác
      socket.to(`conversation_${conversationId}`).emit('message_read', {
        userId: socket.userId,
        userName: socket.user.name,
        conversationId,
        readAt: new Date()
      });
      // Không log để tránh spam terminal
    } catch (error) {
      console.error('Lỗi message read:', error);
    }
  }

  // Xử lý notification read
  async handleNotificationRead(socket, data) {
    try {
      const { notificationId } = data;
      
      if (!notificationId) {
        return;
      }

      // Đánh dấu thông báo đã đọc
      await Notification.markAsRead(notificationId);

      
    } catch (error) {
      console.error('Lỗi notification read:', error);
    }
  }

  // Xử lý disconnect
  handleDisconnect(socket) {
    try {
      
      
      // Xóa khỏi danh sách kết nối
      this.connectedUsers.delete(socket.userId);
      this.userSockets.delete(socket.id);

      // Gửi thông báo user offline
      this.broadcastUserStatus(socket.userId, 'offline');

      // Xóa khỏi tất cả typing sessions
      for (const [conversationId, typingSet] of this.typingUsers.entries()) {
        if (typingSet.has(socket.userId)) {
          typingSet.delete(socket.userId);
          if (typingSet.size === 0) {
            this.typingUsers.delete(conversationId);
          }
        }
      }
    } catch (error) {
      console.error('Lỗi disconnect:', error);
    }
  }

  // Broadcast user status
  broadcastUserStatus(userId, status) {
    this.io.emit('user_status_changed', {
      userId,
      status,
      timestamp: new Date()
    });
  }

  // Gửi thông báo đến user cụ thể
  sendNotificationToUser(userId, notification) {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      this.io.to(socketId).emit('new_notification', notification);
    }
  }

  // Gửi thông báo đến nhiều user
  sendNotificationToUsers(userIds, notification) {
    userIds.forEach(userId => {
      this.sendNotificationToUser(userId, notification);
    });
  }

  // Lấy danh sách user đang online
  getOnlineUsers() {
    return Array.from(this.connectedUsers.keys());
  }

  // Kiểm tra user có online không
  isUserOnline(userId) {
    return this.connectedUsers.has(userId);
  }
}

module.exports = SocketHandler;
