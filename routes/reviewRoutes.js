const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const auth = require('../middleware/auth');
const validation = require('../middleware/validation');

// Protected routes
router.get('/events/:eventId/review', 
  auth.isAuthenticated,
  reviewController.showReviewForm
);

router.post('/events/:eventId/review', 
  auth.isAuthenticated,
  validation.validateReview,
  validation.handleValidationErrors,
  reviewController.submitReview
);

router.delete('/reviews/:reviewId', 
  auth.isAuthenticated,
  reviewController.deleteReview
);

module.exports = router;