// models/Rating.js
const { executeQuery } = require("../config/database");

class Rating {
  // Tạo rating mới
  // models/Rating.js
  static async getByTaskerId(taskerId) {
    const query = `
    SELECT 
      r.rating_id,
      u.name AS reviewer_name,
      r.rating,
      r.comment AS text,
      r.created_at AS date,
      s.name AS service_name
    FROM Ratings r
    JOIN Users u ON r.reviewer_id = u.user_id
    JOIN Bookings b ON r.booking_id = b.booking_id
    JOIN Services s ON b.service_id = s.service_id
    WHERE r.reviewee_id = @param1
    ORDER BY r.created_at DESC
  `;

    const result = await executeQuery(query, [taskerId]);
    const rows = result?.recordset || [];

    const reviews = rows.map((r) => ({
      id: r.rating_id,
      name: r.reviewer_name || "Ẩn danh",
      rating: r.rating || 0,
      text: r.text || "",
      date: r.date,
    }));

    const total = reviews.length;
    const ratingsCount = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((r) => {
      ratingsCount[r.rating] = (ratingsCount[r.rating] || 0) + 1;
    });

    const average = total
      ? Number(
          (reviews.reduce((sum, r) => sum + r.rating, 0) / total).toFixed(1)
        )
      : 0;

    return { reviews, average, total, ratingsCount };
  }
  static async create({
    booking_id,
    reviewer_id,
    reviewee_id,
    rating,
    comment,
  }) {
    const query = `
      INSERT INTO Ratings (booking_id, reviewer_id, reviewee_id, rating, comment, created_at)
      OUTPUT INSERTED.*
      VALUES (@param1, @param2, @param3, @param4, @param5, GETDATE())
    `;
    const params = [booking_id, reviewer_id, reviewee_id, rating, comment];
    const result = await executeQuery(query, params);
    return result.recordset[0];
  }
}

module.exports = Rating;
