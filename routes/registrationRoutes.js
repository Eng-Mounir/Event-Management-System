const express = require('express');
const router = express.Router();
const registrationController = require('../controllers/registrationController');
const auth = require('../middleware/auth');

// Protected routes
router.get('/events/:eventId/register', 
  auth.isAuthenticated,
  registrationController.showRegistrationForm
);

router.post('/events/:eventId/register', 
  auth.isAuthenticated,
  registrationController.processRegistration
);

router.get('/users/registrations', 
  auth.isAuthenticated,
  registrationController.showUserRegistrations
);

router.post('/registrations/:registrationId/cancel', 
  auth.isAuthenticated,
  registrationController.cancelRegistration
);

module.exports = router;