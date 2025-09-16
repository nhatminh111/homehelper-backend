-- Bảng Services
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Services' AND xtype='U')
CREATE TABLE Services (
    service_id INT IDENTITY(1,1) PRIMARY KEY,
    service_name NVARCHAR(255) NOT NULL,
    description NVARCHAR(MAX),
    base_price DECIMAL(10,2),
    category NVARCHAR(100),
    unit NVARCHAR(50),
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE()
);

-- Bảng Posts
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Posts' AND xtype='U')
CREATE TABLE Posts (
    post_id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    title NVARCHAR(255) NOT NULL,
    content NVARCHAR(MAX),
    post_date DATETIME DEFAULT GETDATE(),
    status NVARCHAR(50) DEFAULT N'Chờ xử lý' CHECK (status IN (N'Chờ xử lý', N'Đã phê duyệt', N'Bị từ chối')),
    related_booking_id INT,
    photo_urls NVARCHAR(MAX), 
    likes INT DEFAULT 0,
    comments_count INT DEFAULT 0,
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE()
);

-- Bảng PostLikes
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='PostLikes' AND xtype='U')
CREATE TABLE PostLikes (
    post_like_id INT IDENTITY(1,1) PRIMARY KEY,
    post_id INT NOT NULL,
    user_id INT NOT NULL,
    liked_at DATETIME DEFAULT GETDATE(),
    UNIQUE (post_id, user_id)
);

-- Bảng Comments
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Comments' AND xtype='U')
CREATE TABLE Comments (
    comment_id INT IDENTITY(1,1) PRIMARY KEY,
    post_id INT NOT NULL,
    user_id INT NOT NULL,
    parent_comment_id INT NULL,
    content NVARCHAR(MAX) NOT NULL,
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE()
);

-- Bảng PostServices
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='PostServices' AND xtype='U')
CREATE TABLE PostServices (
    post_service_id INT IDENTITY(1,1) PRIMARY KEY,
    post_id INT NOT NULL,
    service_id INT NOT NULL,
    desired_price DECIMAL(10,2),
    notes NVARCHAR(MAX),
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE()
);

-- Thêm ràng buộc FK
ALTER TABLE Posts ADD CONSTRAINT FK_Posts_Users FOREIGN KEY (user_id) REFERENCES Users(user_id);
ALTER TABLE Posts ADD CONSTRAINT FK_Posts_Bookings FOREIGN KEY (related_booking_id) REFERENCES Bookings(booking_id);

ALTER TABLE PostLikes ADD CONSTRAINT FK_PostLikes_Posts FOREIGN KEY (post_id) REFERENCES Posts(post_id) ON DELETE CASCADE;
ALTER TABLE PostLikes ADD CONSTRAINT FK_PostLikes_Users FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE;

ALTER TABLE Comments ADD CONSTRAINT FK_Comments_Posts FOREIGN KEY (post_id) REFERENCES Posts(post_id) ON DELETE CASCADE;
ALTER TABLE Comments ADD CONSTRAINT FK_Comments_Users FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE;
ALTER TABLE Comments ADD CONSTRAINT FK_Comments_Parent FOREIGN KEY (parent_comment_id) REFERENCES Comments(comment_id) ON DELETE CASCADE;

ALTER TABLE PostServices ADD CONSTRAINT FK_PostServices_Posts FOREIGN KEY (post_id) REFERENCES Posts(post_id) ON DELETE CASCADE;
ALTER TABLE PostServices ADD CONSTRAINT FK_PostServices_Services FOREIGN KEY (service_id) REFERENCES Services(service_id) ON DELETE CASCADE;

-- Indexes
CREATE INDEX idx_posts_user_id ON Posts(user_id);
CREATE INDEX idx_posts_status ON Posts(status);
CREATE INDEX idx_posts_post_date ON Posts(post_date);
CREATE INDEX idx_posts_likes ON Posts(likes);

CREATE INDEX idx_post_likes_post_id ON PostLikes(post_id);
CREATE INDEX idx_post_likes_user_id ON PostLikes(user_id);
CREATE INDEX idx_post_likes_liked_at ON PostLikes(liked_at);

CREATE INDEX idx_comments_post_id ON Comments(post_id);
CREATE INDEX idx_comments_user_id ON Comments(user_id);
CREATE INDEX idx_comments_parent_comment_id ON Comments(parent_comment_id);
CREATE INDEX idx_comments_created_at ON Comments(created_at);

CREATE INDEX idx_post_services_post_id ON PostServices(post_id);
CREATE INDEX idx_post_services_service_id ON PostServices(service_id);
CREATE INDEX idx_post_services_desired_price ON PostServices(desired_price);

-- Insert dữ liệu mẫu cho Services
IF NOT EXISTS (SELECT * FROM Services)
BEGIN
    INSERT INTO Services (service_name, description, base_price, category, unit) VALUES
    (N'Dọn dẹp nhà cửa', N'Dịch vụ dọn dẹp toàn bộ ngôi nhà', 200000, N'Cleaning', N'lần'),
    (N'Lau cửa sổ', N'Dịch vụ lau cửa sổ trong và ngoài', 150000, N'Cleaning', N'lần'),
    (N'Dọn dẹp văn phòng', N'Dịch vụ dọn dẹp văn phòng làm việc', 300000, N'Cleaning', N'lần'),
    (N'Giặt ủi', N'Dịch vụ giặt và ủi quần áo', 100000, N'Laundry', N'kg'),
    (N'Nấu ăn', N'Dịch vụ nấu ăn tại nhà', 250000, N'Cooking', N'bữa'),
    (N'Chăm sóc trẻ em', N'Dịch vụ chăm sóc và trông trẻ', 400000, N'Childcare', N'giờ'),
    (N'Chăm sóc người già', N'Dịch vụ chăm sóc người cao tuổi', 350000, N'Elderly Care', N'giờ'),
    (N'Bảo vệ', N'Dịch vụ bảo vệ tài sản', 500000, N'Security', N'ngày');
END;

-- Trigger cập nhật likes
IF NOT EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_update_post_likes_count')
EXEC('
CREATE TRIGGER trg_update_post_likes_count
ON PostLikes
AFTER INSERT
AS
BEGIN
    UPDATE Posts
    SET likes = (SELECT COUNT(*) FROM PostLikes WHERE post_id = (SELECT post_id FROM inserted))
    WHERE post_id = (SELECT post_id FROM inserted);
END
');

IF NOT EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_update_post_likes_count_delete')
EXEC('
CREATE TRIGGER trg_update_post_likes_count_delete
ON PostLikes
AFTER DELETE
AS
BEGIN
    UPDATE Posts
    SET likes = (SELECT COUNT(*) FROM PostLikes WHERE post_id = (SELECT post_id FROM deleted))
    WHERE post_id = (SELECT post_id FROM deleted);
END
');

-- Trigger cập nhật comments
IF NOT EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_update_post_comments_count')
EXEC('
CREATE TRIGGER trg_update_post_comments_count
ON Comments
AFTER INSERT
AS
BEGIN
    UPDATE Posts
    SET comments_count = (SELECT COUNT(*) FROM Comments WHERE post_id = (SELECT post_id FROM inserted) AND parent_comment_id IS NULL)
    WHERE post_id = (SELECT post_id FROM inserted);
END
');

IF NOT EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_update_post_comments_count_delete')
EXEC('
CREATE TRIGGER trg_update_post_comments_count_delete
ON Comments
AFTER DELETE
AS
BEGIN
    UPDATE Posts
    SET comments_count = (SELECT COUNT(*) FROM Comments WHERE post_id = (SELECT post_id FROM deleted) AND parent_comment_id IS NULL)
    WHERE post_id = (SELECT post_id FROM deleted);
END
');

-- Cập nhật số lượng likes và comments cho các posts hiện có
UPDATE Posts SET likes = (SELECT COUNT(*) FROM PostLikes WHERE post_id = Posts.post_id);
UPDATE Posts SET comments_count = (SELECT COUNT(*) FROM Comments WHERE post_id = Posts.post_id AND parent_comment_id IS NULL);

PRINT N'✅ SQL Server Database setup hoàn thành!';
