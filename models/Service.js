const { executeQuery } = require("../config/database");

class Service {
  static async findAll() {
    const query = `
      SELECT service_id, name, description
      FROM Services
      ORDER BY name ASC
    `;
    const result = await executeQuery(query);
    return result.recordset || [];
  }
}

module.exports = Service;
