const Service = require("../models/Service");

class ServiceController {
  static async getAll(req, res) {
    try {
      const services = await Service.findAll();
      res.json(services);
    } catch (error) {
      console.error("Lỗi getAll services:", error);
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = ServiceController;
