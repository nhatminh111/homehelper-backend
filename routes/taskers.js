const express = require("express");
const router = express.Router();
const TaskerController = require("../controllers/taskerController");

// GET /api/taskers
router.get("/", TaskerController.getAll);

// GET /api/taskers/:id
router.get("/:id", TaskerController.getById);

module.exports = router;
