const express = require('express');
const router = express.Router();
const taskerController = require('../controllers/taskerController');
const { authenticateToken, requireAuth } = require('../middleware/auth');

// Public search endpoint - no auth required
router.post('/search-nearby', taskerController.searchNearbyUsers);

// Address management - requires auth
router.post('/address', authenticateToken, requireAuth, taskerController.createAddress);
router.get('/address', authenticateToken, requireAuth, taskerController.getAddressesByUserId);
router.put('/address/:address_id', authenticateToken, requireAuth, taskerController.updateAddress);
router.delete('/address/:address_id', authenticateToken, requireAuth, taskerController.deleteAddress);

module.exports = router;