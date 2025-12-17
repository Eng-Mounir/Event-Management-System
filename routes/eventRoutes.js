const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const auth = require('../middleware/auth');
const validation = require('../middleware/validation');
// Protected routes for organizers/admins
router.get('/create', auth.isAuthenticated, auth.isOrganizer, eventController.showCreateForm);
router.post('/create', 
  auth.isAuthenticated,
  auth.isOrganizer,
  validation.validateEvent,
  validation.handleValidationErrors,
  eventController.createEvent
);
// Public routes
router.get('/', eventController.showAllEvents);
router.get('/:eventId', eventController.showEvent);



router.get('/:eventId/edit', 
  auth.isAuthenticated,
  eventController.showEditForm
);

router.put('/:eventId', 
  auth.isAuthenticated,
  validation.validateEvent,
  validation.handleValidationErrors,
  eventController.updateEvent
);

router.delete('/:eventId', 
  auth.isAuthenticated,
  eventController.deleteEvent
);

module.exports = router;