# 🏠 HomeHelper Backend API

Backend API cho ứng dụng HomeHelper - Dịch vụ giúp việc nhà sử dụng Node.js và SQL Server.

## 🚀 Tính năng chính

- ✅ **Authentication**: Đăng ký, đăng nhập, JWT token
- ✅ **User Management**: Quản lý người dùng với role-based access
- ✅ **SQL Server Integration**: Kết nối và tương tác với SQL Server
- ✅ **Security**: Bảo mật với bcrypt, helmet, CORS
- ✅ **Validation**: Kiểm tra dữ liệu đầu vào
- ✅ **Error Handling**: Xử lý lỗi toàn cục

## 🛠️ Công nghệ sử dụng

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: SQL Server
- **Authentication**: JWT + bcrypt
- **Security**: Helmet, CORS
- **Logging**: Morgan

## 📋 Yêu cầu hệ thống

- Node.js 16+ 
- SQL Server 2019+
- npm hoặc yarn

## ⚙️ Cài đặt

### 1. Clone và cài đặt dependencies

```bash
# Clone repository
git clone <your-repo-url>
cd homehelper-backend

# Cài đặt dependencies
npm install
```

### 2. Cấu hình database

#### Bước 1: Tạo database
Chạy file `database/setup.sql` trong SQL Server Management Studio để:
- Tạo database `HomeHelperDB`
- Tạo bảng `Users`
- Tạo các stored procedures cần thiết

#### Bước 2: Cấu hình kết nối
Tạo file `.env` từ `env.txt` và cập nhật thông tin:

```env
# Database Configuration
DB_SERVER=localhost
DB_DATABASE=HomeHelperDB
DB_USER=sa
DB_PASSWORD=YourPassword123
DB_PORT=1433

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=24h

# Server Configuration
PORT=5000
NODE_ENV=development
```

### 3. Khởi động server

```bash
# Development mode (với nodemon)
npm run dev

# Production mode
npm start
```

Server sẽ chạy tại: `http://localhost:5000`

## 📚 API Endpoints

### Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/register` | Đăng ký user mới | ❌ |
| POST | `/api/auth/login` | Đăng nhập | ❌ |
| POST | `/api/auth/forgot-password` | Quên password (gửi email) | ❌ |
| POST | `/api/auth/reset-password` | Reset password (qua email) | ❌ |
| GET | `/api/auth/verify-email` | Xác minh email | ❌ |
| GET | `/api/auth/me` | Lấy thông tin user hiện tại | ✅ |
| POST | `/api/auth/change-password` | Đổi password | ✅ |

### Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Kiểm tra trạng thái server |

## 🔐 Authentication

### Đăng ký (Register)

```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "Nguyễn Văn A",
  "email": "nguyenvana@example.com",
  "password": "password123",
  "role": "Customer",
  "phone": "0123456789"
}
```

**Response:**
```json
{
  "message": "Đăng ký thành công!",
  "user": {
    "user_id": 1,
    "name": "Nguyễn Văn A",
    "email": "nguyenvana@example.com",
    "role": "Customer",
    "phone": "0123456789",
    "created_at": "2024-01-01T00:00:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Đăng nhập (Login)

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "nguyenvana@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "message": "Đăng nhập thành công!",
  "user": {
    "user_id": 1,
    "name": "Nguyễn Văn A",
    "email": "nguyenvana@example.com",
    "role": "Customer",
    "phone": "0123456789",
    "cccd_status": "Chờ xử lý",
    "created_at": "2024-01-01T00:00:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Sử dụng JWT Token

Để truy cập các endpoint cần xác thực, thêm header:

```http
Authorization: Bearer <your-jwt-token>
```

## 🗄️ Database Schema

### Bảng Users

| Field | Type | Description |
|-------|------|-------------|
| user_id | INT | Primary Key, Auto Increment |
| name | NVARCHAR(255) | Tên người dùng |
| email | NVARCHAR(255) | Email (unique) |
| password | NVARCHAR(255) | Password đã hash |
| role | NVARCHAR(20) | Role: Admin, Tasker, Customer, Guest |
| phone | NVARCHAR(20) | Số điện thoại |
| created_at | DATETIME2 | Thời gian tạo |
| updated_at | DATETIME2 | Thời gian cập nhật |
| cccd_url | NVARCHAR(255) | URL CCCD |
| cccd_status | NVARCHAR(20) | Trạng thái CCCD |
| cccd_uploaded_at | DATETIME2 | Thời gian upload CCCD |
| cccd_verified_at | DATETIME2 | Thời gian xác minh CCCD |
| cccd_verified_by | INT | User ID người xác minh |

## 🧪 Testing API

### Sử dụng Postman

1. **Đăng ký user mới:**
   - Method: `POST`
   - URL: `http://localhost:5000/api/auth/register`
   - Body (raw JSON):
   ```json
   {
     "name": "Test User",
     "email": "test@example.com",
     "password": "test123",
     "role": "Customer",
     "phone": "0987654321"
   }
   ```

2. **Đăng nhập:**
   - Method: `POST`
   - URL: `http://localhost:5000/api/auth/login`
   - Body (raw JSON):
   ```json
   {
     "email": "test@example.com",
     "password": "test123"
   }
   ```

3. **Lấy thông tin user:**
   - Method: `GET`
   - URL: `http://localhost:5000/api/auth/me`
   - Headers: `Authorization: Bearer <token>`

### Sử dụng cURL

```bash
# Đăng ký
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"test123","role":"Customer"}'

# Đăng nhập
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

## 🚨 Troubleshooting

### Lỗi kết nối database

1. **Kiểm tra SQL Server:**
   - SQL Server đang chạy
   - Port 1433 mở
   - Authentication mode: SQL Server and Windows Authentication

2. **Kiểm tra thông tin kết nối:**
   - Server name/IP
   - Username/password
   - Database name

3. **Kiểm tra firewall:**
   - Port 1433 được mở

### Lỗi JWT

1. **Token expired:** Đăng nhập lại
2. **Invalid token:** Kiểm tra format `Bearer <token>`
3. **Secret key:** Đảm bảo JWT_SECRET trong .env

## 📁 Cấu trúc thư mục

```
homehelper-backend/
├── config/
│   └── database.js          # Cấu hình kết nối SQL Server
├── controllers/
│   └── authController.js    # Xử lý authentication
├── middleware/
│   └── auth.js             # Middleware xác thực
├── models/
│   └── User.js             # Model User
├── routes/
│   └── auth.js             # Routes authentication
├── database/
│   └── setup.sql           # SQL setup database
├── uploads/                 # Thư mục upload files
├── .env                     # Biến môi trường
├── package.json            # Dependencies
├── server.js               # Entry point
└── README.md               # Hướng dẫn này
```

## 🔄 Development

### Scripts

```bash
npm run dev      # Khởi động với nodemon (development)
npm start        # Khởi động production
npm test         # Chạy tests (chưa implement)
```

### Logs

Server sẽ hiển thị logs chi tiết:
- ✅ Kết nối database thành công
- 🚀 Server khởi động
- 📝 API requests (Morgan)
- ❌ Lỗi và exceptions

## 📝 TODO

- [ ] Implement email verification
- [ ] Add password reset functionality
- [ ] Add user profile management
- [ ] Implement file upload for CCCD
- [ ] Add rate limiting
- [ ] Add API documentation (Swagger)
- [ ] Add unit tests
- [ ] Add integration tests

## 🤝 Contributing

1. Fork repository
2. Tạo feature branch
3. Commit changes
4. Push to branch
5. Tạo Pull Request

## 📄 License

ISC License

## 📞 Support

Nếu có vấn đề, vui lòng tạo issue hoặc liên hệ team development.

---

**Happy Coding! 🎉**
