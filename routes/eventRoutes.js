const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const auth = require('../middleware/auth');
const validation = require('../middleware/validation');

// Public routes
router.get('/', eventController.showAllEvents);
router.get('/:eventId', eventController.showEvent);

// Protected routes for organizers/admins
router.get('/create', auth.isAuthenticated, auth.isOrganizer, eventController.showCreateForm);
router.post('/create', 
  auth.isAuthenticated,
  auth.isOrganizer,
  validation.validateEvent,
  eventController.createEvent
);

// Edit routes
router.get('/:eventId/edit', 
  auth.isAuthenticated,
  auth.isEventOwner,
  eventController.showEditForm
);

// Use lenient validation for updates
router.put('/:eventId', 
  auth.isAuthenticated,
  auth.isEventOwner,
  validation.validateEventUpdate,  // Use update-specific validation
  eventController.updateEvent
);

// Delete route
router.delete('/:eventId', 
  auth.isAuthenticated,
  auth.isEventOwner,
  eventController.deleteEvent
);

// Manage route
router.get('/:eventId/manage',
  auth.isAuthenticated,
  auth.isEventOwner,
  eventController.manageEvent
);

// Memento undo/redo routes
router.post('/:eventId/undo', 
  auth.isAuthenticated, 
  auth.isEventOwner, 
  eventController.undoEventChange
);

router.post('/:eventId/redo', 
  auth.isAuthenticated, 
  auth.isEventOwner, 
  eventController.redoEventChange
);

router.post('/:eventId/clear-history', 
  auth.isAuthenticated, 
  auth.isEventOwner, 
  eventController.clearEventHistory
);

// Export attendees
router.get('/:eventId/export-attendees', 
  auth.isAuthenticated, 
  auth.isEventOwner, 
  eventController.exportAttendees
);

// Toggle event status
router.post('/:eventId/toggle-status', 
  auth.isAuthenticated, 
  auth.isEventOwner, 
  eventController.toggleEventStatus
);
// Debug route
router.get('/:eventId/debug-memento', 
  auth.isAuthenticated, 
  auth.isEventOwner, 
  eventController.debugMemento
);
router.get('/:eventId/test-singleton', 
  auth.isAuthenticated, 
  auth.isEventOwner, 
  eventController.testMementoSingleton
);
module.exports = router;