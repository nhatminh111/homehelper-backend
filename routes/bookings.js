const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const { canRateTasker } = require("../controllers/bookingController");

// GET /api/bookings/:taskerId/can-rate
router.get("/:taskerId/can-rate", authenticateToken, canRateTasker);

module.exports = router;
