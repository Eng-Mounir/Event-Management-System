const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const { isAuthenticated } = require('../middleware/auth');

// Ticket routes
router.get('/users/tickets', isAuthenticated, ticketController.showTickets);
router.post('/api/tickets/:registrationId/download', isAuthenticated, ticketController.downloadTicket);
router.post('/api/tickets/:registrationId/cancel', isAuthenticated, ticketController.cancelTicket);
router.get('/api/tickets/:registrationId', isAuthenticated, ticketController.getTicketDetails);

module.exports = router;