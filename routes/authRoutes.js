const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const validation = require('../middleware/validation');
const auth = require('../middleware/auth');

// Public routes
router.get('/register', authController.showRegister);
router.post('/register', 
  validation.validateRegistration,
  validation.handleValidationErrors,
  authController.register
);

router.get('/login', authController.showLogin);
router.post('/login', 
  validation.validateLogin,
  validation.handleValidationErrors,
  authController.login
);

// Protected routes
router.get('/profile', auth.isAuthenticated, authController.showProfile);
router.get('/logout', authController.logout);

module.exports = router;