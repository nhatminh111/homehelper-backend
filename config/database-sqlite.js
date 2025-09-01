const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Đường dẫn đến file database SQLite
const dbPath = path.join(__dirname, '../database/homehelper.db');

// Tạo kết nối database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Lỗi kết nối SQLite:', err.message);
  } else {
    console.log('✅ Kết nối SQLite thành công!');
    console.log(`📊 Database: ${dbPath}`);
    
    // Tạo bảng users nếu chưa có
    createTables();
  }
});

// Hàm tạo các bảng cần thiết
function createTables() {
  const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'Customer',
      phone TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;

  db.run(createUsersTable, (err) => {
    if (err) {
      console.error('❌ Lỗi tạo bảng users:', err.message);
    } else {
      console.log('✅ Bảng users đã sẵn sàng');
    }
  });
}

// Hàm kết nối database
async function connectDB() {
  return new Promise((resolve, reject) => {
    db.get("SELECT 1", (err) => {
      if (err) {
        reject(err);
      } else {
        resolve(db);
      }
    });
  });
}

// Hàm đóng kết nối
async function closeDB() {
  return new Promise((resolve) => {
    db.close((err) => {
      if (err) {
        console.error('❌ Lỗi đóng kết nối database:', err.message);
      } else {
        console.log('🔌 Đã đóng kết nối database');
      }
      resolve();
    });
  });
}

// Hàm thực thi query
async function executeQuery(query, params = []) {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve({ recordset: rows });
      }
    });
  });
}

// Hàm thực thi query trả về 1 row
async function executeQueryOne(query, params = []) {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve({ recordset: [row] });
      }
    });
  });
}

// Hàm thực thi query insert/update/delete
async function executeNonQuery(query, params = []) {
  return new Promise((resolve, reject) => {
    db.run(query, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ 
          rowsAffected: this.changes,
          insertId: this.lastID 
        });
      }
    });
  });
}

module.exports = {
  connectDB,
  closeDB,
  executeQuery,
  executeQueryOne,
  executeNonQuery,
  db
};











