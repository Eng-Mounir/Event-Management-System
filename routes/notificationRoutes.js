const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const auth = require('../middleware/auth');

// Protected routes
router.get('/notifications', 
  auth.isAuthenticated,
  notificationController.getUserNotifications
);

router.post('/notifications/:notificationId/read', 
  auth.isAuthenticated,
  notificationController.markAsRead
);

router.delete('/notifications/:notificationId', 
  auth.isAuthenticated,
  notificationController.deleteNotification
);

// Admin route to trigger reminders (for testing)
router.post('/admin/send-reminders', 
  auth.isAuthenticated,
  auth.isAdmin,
  async (req, res) => {
    await notificationController.sendEventReminders();
    req.flash('success', 'Reminders sent successfully');
    res.redirect('/admin');
  }
);

module.exports = router;