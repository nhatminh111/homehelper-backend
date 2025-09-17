const Tasker = require("../models/Tasker");

class TaskerController {
  static async getAll(req, res) {
    try {
      const { search = "", serviceId = "" } = req.query;
      const taskers = await Tasker.findAll(search, serviceId);
      res.json(Array.isArray(taskers) ? taskers : []); // ✅ luôn trả về mảng
    } catch (error) {
      console.error("Lỗi getAll taskers:", error);
      res.status(500).json({ error: error.message });
    }
  }

  // Lấy tasker theo id kèm reviews
  static async getById(req, res) {
    const { id } = req.params;
    try {
      const tasker = await Tasker.findByIdWithReviews(id);
      if (!tasker) {
        return res.status(404).json({ message: "Tasker not found" });
      }
      res.json(tasker);
    } catch (error) {
      console.error("Lỗi getById tasker:", error);
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = TaskerController;
