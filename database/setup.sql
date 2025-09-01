-- Tạo database HomeHelperDB
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'HomeHelperDB')
BEGIN
    CREATE DATABASE HomeHelperDB;
END
GO

USE HomeHelperDB;
GO

-- Tạo bảng Users
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Users]') AND type in (N'U'))
BEGIN
    CREATE TABLE Users (
        user_id INT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(255) NOT NULL,
        email NVARCHAR(255) NOT NULL UNIQUE,
        password NVARCHAR(255) NOT NULL,
        role NVARCHAR(20) NOT NULL CHECK (role IN ('Admin', 'Tasker', 'Customer', 'Guest')),
        phone NVARCHAR(20),
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        cccd_url NVARCHAR(255),
        cccd_status NVARCHAR(20) DEFAULT 'Chờ xử lý' CHECK (cccd_status IN ('Chờ xử lý', 'Đã xác minh', 'Bị từ chối')),
        cccd_uploaded_at DATETIME2,
        cccd_verified_at DATETIME2,
        cccd_verified_by INT,
        CONSTRAINT FK_Users_VerifiedBy FOREIGN KEY (cccd_verified_by) REFERENCES Users(user_id)
    );
END
GO

-- Tạo index cho email để tìm kiếm nhanh
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Users_Email')
BEGIN
    CREATE INDEX IX_Users_Email ON Users(email);
END
GO

-- Tạo index cho role
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Users_Role')
BEGIN
    CREATE INDEX IX_Users_Role ON Users(role);
END
GO

-- Tạo stored procedure để tạo user mới
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_CreateUser]') AND type in (N'P', N'PC'))
BEGIN
    EXEC('
        CREATE PROCEDURE sp_CreateUser
            @name NVARCHAR(255),
            @email NVARCHAR(255),
            @password NVARCHAR(255),
            @role NVARCHAR(20),
            @phone NVARCHAR(20) = NULL
        AS
        BEGIN
            SET NOCOUNT ON;
            
            BEGIN TRY
                INSERT INTO Users (name, email, password, role, phone)
                VALUES (@name, @email, @password, @role, @phone);
                
                SELECT SCOPE_IDENTITY() AS user_id;
            END TRY
            BEGIN CATCH
                THROW;
            END CATCH
        END
    ');
END
GO

-- Tạo stored procedure để tìm user theo email
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_FindUserByEmail]') AND type in (N'P', N'PC'))
BEGIN
    EXEC('
        CREATE PROCEDURE sp_FindUserByEmail
            @email NVARCHAR(255)
        AS
        BEGIN
            SET NOCOUNT ON;
            
            SELECT user_id, name, email, password, role, phone, 
                   created_at, updated_at, cccd_url, cccd_status, 
                   cccd_uploaded_at, cccd_verified_at
            FROM Users 
            WHERE email = @email;
        END
    ');
END
GO

-- Tạo stored procedure để tìm user theo ID
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_FindUserById]') AND type in (N'P', N'PC'))
BEGIN
    EXEC('
        CREATE PROCEDURE sp_FindUserById
            @userId INT
        AS
        BEGIN
            SET NOCOUNT ON;
            
            SELECT user_id, name, email, role, phone, 
                   created_at, updated_at, cccd_url, cccd_status, 
                   cccd_uploaded_at, cccd_verified_at
            FROM Users 
            WHERE user_id = @userId;
        END
    ');
END
GO

-- Tạo stored procedure để cập nhật user
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_UpdateUser]') AND type in (N'P', N'PC'))
BEGIN
    EXEC('
        CREATE PROCEDURE sp_UpdateUser
            @userId INT,
            @name NVARCHAR(255) = NULL,
            @phone NVARCHAR(20) = NULL,
            @cccd_url NVARCHAR(255) = NULL,
            @cccd_status NVARCHAR(20) = NULL
        AS
        BEGIN
            SET NOCOUNT ON;
            
            BEGIN TRY
                UPDATE Users 
                SET name = ISNULL(@name, name),
                    phone = ISNULL(@phone, phone),
                    cccd_url = ISNULL(@cccd_url, cccd_url),
                    cccd_status = ISNULL(@cccd_status, cccd_status),
                    updated_at = GETDATE()
                WHERE user_id = @userId;
                
                IF @@ROWCOUNT = 0
                    THROW 50000, ''User không tồn tại'', 1;
            END TRY
            BEGIN CATCH
                THROW;
            END CATCH
        END
    ');
END
GO

-- Tạo stored procedure để cập nhật password
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_UpdatePassword]') AND type in (N'P', N'PC'))
BEGIN
    EXEC('
        CREATE PROCEDURE sp_UpdatePassword
            @userId INT,
            @newPassword NVARCHAR(255)
        AS
        BEGIN
            SET NOCOUNT ON;
            
            BEGIN TRY
                UPDATE Users 
                SET password = @newPassword, 
                    updated_at = GETDATE()
                WHERE user_id = @userId;
                
                IF @@ROWCOUNT = 0
                    THROW 50000, ''User không tồn tại'', 1;
            END TRY
            BEGIN CATCH
                THROW;
            END CATCH
        END
    ');
END
GO

-- Tạo stored procedure để lấy danh sách users với phân trang
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_GetUsers]') AND type in (N'P', N'PC'))
BEGIN
    EXEC('
        CREATE PROCEDURE sp_GetUsers
            @page INT = 1,
            @limit INT = 10,
            @role NVARCHAR(20) = NULL,
            @search NVARCHAR(255) = NULL
        AS
        BEGIN
            SET NOCOUNT ON;
            
            DECLARE @offset INT = (@page - 1) * @limit;
            DECLARE @whereClause NVARCHAR(MAX) = '''';
            DECLARE @sql NVARCHAR(MAX);
            
            -- Xây dựng WHERE clause
            IF @role IS NOT NULL
                SET @whereClause = @whereClause + '' WHERE role = '''''' + @role + '''''';
                
            IF @search IS NOT NULL
            BEGIN
                IF @whereClause = ''''
                    SET @whereClause = '' WHERE (name LIKE ''''%'' + @search + ''%'''' OR email LIKE ''''%'' + @search + ''%'''')'';
                ELSE
                    SET @whereClause = @whereClause + '' AND (name LIKE ''''%'' + @search + ''%'''' OR email LIKE ''''%'' + @search + ''%'''')'';
            END
            
            -- Query chính
            SET @sql = ''
                SELECT user_id, name, email, role, phone, created_at, updated_at, cccd_status
                FROM Users 
                '' + @whereClause + ''
                ORDER BY created_at DESC
                OFFSET '' + CAST(@offset AS NVARCHAR(10)) + '' ROWS
                FETCH NEXT '' + CAST(@limit AS NVARCHAR(10)) + '' ROWS ONLY;
                
                SELECT COUNT(*) AS total FROM Users '' + @whereClause + '';'';
            
            EXEC sp_executesql @sql;
        END
    ');
END
GO

PRINT '✅ Database setup hoàn thành!';
PRINT '📊 Database: HomeHelperDB';
PRINT '👥 Bảng Users đã được tạo';
PRINT '🔧 Các stored procedures đã được tạo';
PRINT '';
PRINT '📝 Hướng dẫn sử dụng:';
PRINT '1. Chạy file này trong SQL Server Management Studio';
PRINT '2. Cập nhật file .env với thông tin database của bạn';
PRINT '3. Chạy npm run dev để khởi động server';
