const express = require('express');
const router = express.Router();
const wishlistController = require('../controllers/wishlistController');
const auth = require('../middleware/auth');

// Protected routes
router.get('/wishlist', 
  auth.isAuthenticated,
  wishlistController.showWishlist
);

router.post('/events/:eventId/wishlist/add', 
  auth.isAuthenticated,
  wishlistController.addToWishlist
);

router.post('/events/:eventId/wishlist/remove', 
  auth.isAuthenticated,
  wishlistController.removeFromWishlist
);
// Clear all wishlist items
router.post('/wishlist/clear', 
  auth.isAuthenticated,
  wishlistController.clearWishlist
);
module.exports = router;