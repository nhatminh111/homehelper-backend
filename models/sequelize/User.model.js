*** Begin Patch
*** Add File: homehelper-backend/models/sequelize/User.model.js
+const { DataTypes } = require('sequelize');
+const { sequelize } = require('../../config/sequelize');
+
+// Sequelize model for Users table
+const UserModel = sequelize.define('Users', {
+  user_id: {
+    type: DataTypes.INTEGER,
+    primaryKey: true,
+    autoIncrement: true
+  },
+  name: {
+    type: DataTypes.STRING(255),
+    allowNull: false
+  },
+  email: {
+    type: DataTypes.STRING(255),
+    allowNull: false,
+    unique: true
+  },
+  password: {
+    type: DataTypes.STRING(255),
+    allowNull: false
+  },
+  role: {
+    type: DataTypes.STRING(50),
+    allowNull: false,
+    defaultValue: 'Customer'
+  },
+  phone: {
+    type: DataTypes.STRING(50),
+    allowNull: true
+  },
+  cccd_status: {
+    type: DataTypes.STRING(50),
+    allowNull: true
+  },
+  cccd_url: {
+    type: DataTypes.STRING(1024),
+    allowNull: true
+  }
+});
+
+module.exports = UserModel;
+
*** End Patch