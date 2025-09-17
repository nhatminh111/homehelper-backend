// const express = require("express");
// const router = express.Router();
// const ServiceController = require("../controllers/serviceController");

// router.get("/", ServiceController.getAll);

// module.exports = router;
const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');

// Get all services
router.get('/', serviceController.getAllServices);

// Get service by ID
router.get('/:id', serviceController.getServiceById);

module.exports = router;
