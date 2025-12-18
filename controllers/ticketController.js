const { Op } = require('sequelize');
const { Registration, Event, User } = require('../models/associations');

module.exports = {
  // Show user's tickets
  showTickets: async (req, res) => {
    try {
      const userId = req.session.user.userId;
      const page = parseInt(req.query.page) || 1;
      const limit = 10;
      const offset = (page - 1) * limit;
      
      // Get user's registrations with event details
      const { count, rows: registrations } = await Registration.findAndCountAll({
        where: { 
          userId,
          status: 'confirmed',
          paymentStatus: 'completed'
        },
        include: [{
          model: Event,
          as: 'event',
          attributes: ['title', 'date', 'time', 'venue', 'city', 'address', 'imageUrl', 'eventId', 'category']
        }],
        order: [['bookingDate', 'DESC']],
        limit,
        offset
      });
      
      // Calculate statistics
      const now = new Date();
      let totalSpent = 0;
      let confirmedTickets = 0;
      let upcomingEvents = 0;
      let pastEvents = 0;
      
      registrations.forEach(reg => {
        totalSpent += parseFloat(reg.totalAmount) || 0;
        confirmedTickets++;
        
        const eventDate = new Date(reg.event.date);
        if (eventDate > now) {
          upcomingEvents++;
        } else {
          pastEvents++;
        }
      });
      
      // Format tickets data
      const tickets = registrations.map(reg => ({
        registrationId: reg.registrationId,
        event: reg.event,
        ticketQuantity: reg.ticketQuantity,
        totalAmount: parseFloat(reg.totalAmount) || 0,
        status: reg.status,
        paymentStatus: reg.paymentStatus,
        paymentMethod: reg.paymentMethod,
        paymentDetails: reg.paymentDetails,
        bookingDate: reg.bookingDate
      }));
      
      // Render tickets page
      res.render('users/tickets', {
        title: 'My Tickets - EventHub',
        tickets,
        totalSpent,
        stats: {
          totalTickets: count,
          confirmedTickets,
          upcomingEvents,
          pastEvents
        },
        user: req.session.user,
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        active: 'tickets'
      });
      
    } catch (error) {
      console.error('Tickets page error:', error);
      req.flash('error', 'Unable to load tickets');
      res.redirect('/dashboard');
    }
  },
  
  // Download ticket as PDF
  downloadTicket: async (req, res) => {
    try {
      const { registrationId } = req.params;
      const userId = req.session.user.userId;
      
      // Verify ticket belongs to user
      const registration = await Registration.findByPk(registrationId, {
        include: [{
          model: Event,
          as: 'event'
        }]
      });
      
      if (!registration || registration.userId !== userId) {
        return res.status(403).json({ 
          success: false, 
          message: 'Unauthorized access' 
        });
      }
      
      // For now, return a simple response
      // In production, you would generate a PDF using pdfkit or puppeteer
      res.json({
        success: true,
        message: 'PDF generation coming soon',
        pdfUrl: '/api/tickets/generate-pdf' // Placeholder
      });
      
    } catch (error) {
      console.error('Download ticket error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to download ticket' 
      });
    }
  },
  
  // Cancel ticket
  cancelTicket: async (req, res) => {
    try {
      const { registrationId } = req.params;
      const userId = req.session.user.userId;
      
      // Verify ticket belongs to user
      const registration = await Registration.findByPk(registrationId, {
        include: [{
          model: Event,
          as: 'event'
        }]
      });
      
      if (!registration || registration.userId !== userId) {
        return res.status(403).json({ 
          success: false, 
          message: 'Unauthorized access' 
        });
      }
      
      // Check if cancellation is allowed
      const eventDate = new Date(registration.event.date);
      const now = new Date();
      const hoursUntilEvent = (eventDate - now) / (1000 * 60 * 60);
      
      if (hoursUntilEvent < 24) {
        return res.status(400).json({ 
          success: false, 
          message: 'Cancellation not allowed within 24 hours of event' 
        });
      }
      
      if (registration.status === 'cancelled') {
        return res.status(400).json({ 
          success: false, 
          message: 'Ticket is already cancelled' 
        });
      }
      
      // Update registration status
      await registration.update({
        status: 'cancelled',
        paymentStatus: 'refunded'
      });
      
      // Return seats to event
      await registration.event.increment('availableSeats', { 
        by: registration.ticketQuantity 
      });
      
      res.json({ 
        success: true, 
        message: 'Ticket cancelled successfully' 
      });
      
    } catch (error) {
      console.error('Cancel ticket error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to cancel ticket' 
      });
    }
  },
  
  // Get single ticket details
  getTicketDetails: async (req, res) => {
    try {
      const { registrationId } = req.params;
      const userId = req.session.user.userId;
      
      const registration = await Registration.findByPk(registrationId, {
        include: [{
          model: Event,
          as: 'event',
          attributes: ['title', 'date', 'time', 'venue', 'city', 'address', 'imageUrl']
        }]
      });
      
      if (!registration || registration.userId !== userId) {
        return res.status(403).json({ 
          success: false, 
          message: 'Unauthorized access' 
        });
      }
      
      res.json({
        success: true,
        ticket: {
          registrationId: registration.registrationId,
          event: registration.event,
          ticketQuantity: registration.ticketQuantity,
          totalAmount: registration.totalAmount,
          status: registration.status,
          paymentStatus: registration.paymentStatus,
          paymentMethod: registration.paymentMethod,
          paymentDetails: registration.paymentDetails ? JSON.parse(registration.paymentDetails) : null,
          bookingDate: registration.bookingDate
        }
      });
      
    } catch (error) {
      console.error('Get ticket details error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to get ticket details' 
      });
    }
  }
};