// const { Registration, Event } = require('../models/associations');
// const { NotificationManager } = require('../controllers/notificationController');
// module.exports = {
    
//   // Show registration form
//   showRegistrationForm: async (req, res) => {
//     try {
//       const event = await Event.findByPk(req.params.eventId);
      
//       if (!event) {
//         req.flash('error', 'Event not found');
//         return res.redirect('/events');
//       }

//       if (event.availableSeats <= 0) {
//         req.flash('error', 'No seats available');
//         return res.redirect(`/events/${event.eventId}`);
//       }

//       res.render('registrations/create', {
//         title: 'Register for Event',
//         event,
//         user: req.session.user
//       });
//     } catch (error) {
//       console.error(error);
//       req.flash('error', 'Unable to load registration form');
//       res.redirect('/events');
//     }
//   },

//   // Process registration
//   processRegistration: async (req, res) => {
//     try {
//       const { eventId } = req.params;
//       const { ticketQuantity } = req.body;
      
//       const event = await Event.findByPk(eventId);
      
//       if (!event) {
//         req.flash('error', 'Event not found');
//         return res.redirect('/events');
//       }

//       // Check seat availability
//       if (event.availableSeats < ticketQuantity) {
//         req.flash('error', 'Not enough seats available');
//         return res.redirect(`/events/${eventId}/register`);
//       }

//       // Calculate total
//       const totalAmount = event.price * ticketQuantity;

//       // Create registration
//       const registration = await Registration.create({
//         eventId,
//         userId: req.session.user.userId,
//         ticketQuantity: parseInt(ticketQuantity),
//         totalAmount,
//         status: 'confirmed',
//         paymentStatus: 'completed'
//       });

//       // Update available seats
//       event.availableSeats -= ticketQuantity;
//       await event.save();

//       req.flash('success', 'Registration successful! Check your email for confirmation.');
//       res.redirect(`/users/registrations`);
//     } catch (error) {
//       console.error(error);
//       req.flash('error', 'Registration failed');
//       res.redirect(`/events/${req.params.eventId}/register`);
//     }
//   },

//   // Show user's registrations
//   showUserRegistrations: async (req, res) => {
//     try {
//       const registrations = await Registration.findAll({
//         where: { userId: req.session.user.userId },
//         include: [{
//           model: Event,
//           as: 'event',
//           attributes: ['title', 'date', 'venue', 'imageUrl']
//         }],
//         order: [['bookingDate', 'DESC']]
//       });

//       res.render('registrations/index', {
//         title: 'My Registrations',
//         active: 'registrations',
//         registrations,
//         user: req.session.user
//       });
//     } catch (error) {
//       console.error(error);
//       req.flash('error', 'Unable to load registrations');
//       res.redirect('/');
//     }
//   },

//   // Cancel registration
//   cancelRegistration: async (req, res) => {
//     try {
//       const registration = await Registration.findByPk(req.params.registrationId, {
//         include: [{
//           model: Event,
//           as: 'event'
//         }]
//       });

//       if (!registration) {
//         req.flash('error', 'Registration not found');
//         return res.redirect('/users/registrations');
//       }

//       // Check authorization
//       if (registration.userId !== req.session.user.userId) {
//         req.flash('error', 'Unauthorized');
//         return res.redirect('/users/registrations');
//       }

//       // Update registration status
//       registration.status = 'cancelled';
//       await registration.save();

//       // Return seats to event
//       const event = registration.event;
//       event.availableSeats += registration.ticketQuantity;
//       await event.save();

//       req.flash('success', 'Registration cancelled successfully');
//       res.redirect('/users/registrations');
//     } catch (error) {
//       console.error(error);
//       req.flash('error', 'Failed to cancel registration');
//       res.redirect('/users/registrations');
//     }
//   }
// };
const { Registration, Event } = require('../models/associations');
const { NotificationManager } = require('../controllers/notificationController');

module.exports = {
  // Show registration form
  showRegistrationForm: async (req, res) => {
    try {
      const event = await Event.findByPk(req.params.eventId);
      
      if (!event) {
        req.flash('error', 'Event not found');
        return res.redirect('/events');
      }

      // Check if event registration is open
      if (event.registrationDeadline && new Date() > new Date(event.registrationDeadline)) {
        req.flash('error', 'Registration deadline has passed');
        return res.redirect(`/events/${event.eventId}`);
      }

      if (event.status !== 'upcoming') {
        req.flash('error', `Event is ${event.status}. Registration is not available.`);
        return res.redirect(`/events/${event.eventId}`);
      }

      if (event.availableSeats <= 0) {
        req.flash('error', 'No seats available');
        return res.redirect(`/events/${event.eventId}`);
      }

      // Check if user is already registered
      const existingRegistration = await Registration.findOne({
        where: {
          eventId: event.eventId,
          userId: req.session.user.userId,
          status: { [Op.in]: ['confirmed', 'pending'] }
        }
      });

      if (existingRegistration) {
        req.flash('error', 'You are already registered for this event');
        return res.redirect(`/events/${event.eventId}`);
      }

      res.render('registrations/create', {
        title: 'Register for Event',
        event,
        user: req.session.user,
        maxTickets: Math.min(event.availableSeats, 10) // Limit to 10 tickets max
      });
    } catch (error) {
      console.error(error);
      req.flash('error', 'Unable to load registration form');
      res.redirect('/events');
    }
  },

  // Process registration
  processRegistration: async (req, res) => {
    try {
      const { eventId } = req.params;
      const { ticketQuantity, paymentMethod = 'credit_card' } = req.body;
      
      const event = await Event.findByPk(eventId);
      
      if (!event) {
        req.flash('error', 'Event not found');
        return res.redirect('/events');
      }

      // Validate ticket quantity
      const ticketQty = parseInt(ticketQuantity) || 1;
      if (ticketQty < 1) {
        req.flash('error', 'Ticket quantity must be at least 1');
        return res.redirect(`/events/${eventId}/register`);
      }

      // Check seat availability
      if (event.availableSeats < ticketQty) {
        req.flash('error', `Only ${event.availableSeats} seat(s) available`);
        return res.redirect(`/events/${eventId}/register`);
      }

      // Check if event registration is open
      if (event.registrationDeadline && new Date() > new Date(event.registrationDeadline)) {
        req.flash('error', 'Registration deadline has passed');
        return res.redirect(`/events/${eventId}`);
      }

      if (event.status !== 'upcoming') {
        req.flash('error', `Event is ${event.status}. Registration is not available.`);
        return res.redirect(`/events/${eventId}`);
      }

      // Check if user is already registered
      const existingRegistration = await Registration.findOne({
        where: {
          eventId,
          userId: req.session.user.userId,
          status: { [Op.in]: ['confirmed', 'pending'] }
        }
      });

      if (existingRegistration) {
        req.flash('error', 'You are already registered for this event');
        return res.redirect(`/events/${eventId}`);
      }

      // Calculate total
      const totalAmount = event.price * ticketQty;

      // Create registration
      const registration = await Registration.create({
        eventId,
        userId: req.session.user.userId,
        ticketQuantity: ticketQty,
        totalAmount,
        status: 'confirmed',
        paymentMethod,
        paymentStatus: 'completed',
        bookingDate: new Date()
      });

      // Update available seats
      event.availableSeats -= ticketQty;
      await event.save();

      // Send registration confirmation notification
      try {
        const notificationManager = NotificationManager.getInstance();
        await notificationManager.notify('REGISTRATION_CONFIRMED', {
          userId: req.session.user.userId,
          eventId: event.eventId,
          eventTitle: event.title
        });
        console.log('✅ Registration confirmation notification sent');
      } catch (notifError) {
        console.error('❌ Notification error:', notifError);
        // Don't fail the registration if notification fails
      }

      req.flash('success', 'Registration successful! Your ticket has been confirmed.');
      res.redirect(`/users/registrations/${registration.registrationId}`);
    } catch (error) {
      console.error('❌ Registration error:', error);
      req.flash('error', 'Registration failed: ' + error.message);
      res.redirect(`/events/${req.params.eventId}/register`);
    }
  },

  // Show user's registrations
  showUserRegistrations: async (req, res) => {
    try {
      const registrations = await Registration.findAll({
        where: { userId: req.session.user.userId },
        include: [{
          model: Event,
          as: 'event',
          attributes: ['title', 'date', 'time', 'venue', 'imageUrl', 'status', 'city']
        }],
        order: [['bookingDate', 'DESC']]
      });

      // Categorize registrations
      const now = new Date();
      const upcoming = [];
      const past = [];
      const cancelled = [];

      registrations.forEach(reg => {
        if (reg.status === 'cancelled') {
          cancelled.push(reg);
        } else if (new Date(reg.event.date) < now) {
          past.push(reg);
        } else {
          upcoming.push(reg);
        }
      });

      res.render('registrations/index', {
        title: 'My Registrations',
        active: 'registrations',
        upcoming,
        past,
        cancelled,
        user: req.session.user
      });
    } catch (error) {
      console.error(error);
      req.flash('error', 'Unable to load registrations');
      res.redirect('/');
    }
  },

  // Show single registration/ticket
  showRegistration: async (req, res) => {
    try {
      const registration = await Registration.findByPk(req.params.registrationId, {
        include: [{
          model: Event,
          as: 'event',
          attributes: ['title', 'date', 'time', 'venue', 'address', 'city', 'imageUrl', 'organizerId']
        }]
      });

      if (!registration) {
        req.flash('error', 'Registration not found');
        return res.redirect('/users/registrations');
      }

      // Check authorization
      if (registration.userId !== req.session.user.userId) {
        req.flash('error', 'Unauthorized');
        return res.redirect('/users/registrations');
      }

      // Format for ticket display
      const ticketData = {
        registrationId: registration.registrationId,
        eventTitle: registration.event.title,
        date: new Date(registration.event.date).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        time: registration.event.time,
        venue: registration.event.venue,
        address: registration.event.address,
        city: registration.event.city,
        ticketQuantity: registration.ticketQuantity,
        totalAmount: registration.totalAmount.toFixed(2),
        bookingDate: new Date(registration.bookingDate).toLocaleDateString('en-US'),
        status: registration.status,
        qrCodeData: `EVENT-${registration.eventId}-USER-${registration.userId}-REG-${registration.registrationId}`
      };

      res.render('registrations/show', {
        title: `Ticket: ${registration.event.title}`,
        registration: ticketData,
        user: req.session.user
      });
    } catch (error) {
      console.error(error);
      req.flash('error', 'Unable to load registration details');
      res.redirect('/users/registrations');
    }
  },

  // Cancel registration
  cancelRegistration: async (req, res) => {
    try {
      const registration = await Registration.findByPk(req.params.registrationId, {
        include: [{
          model: Event,
          as: 'event'
        }]
      });

      if (!registration) {
        req.flash('error', 'Registration not found');
        return res.redirect('/users/registrations');
      }

      // Check authorization
      if (registration.userId !== req.session.user.userId) {
        req.flash('error', 'Unauthorized');
        return res.redirect('/users/registrations');
      }

      // Check if cancellation is allowed (e.g., not too close to event)
      const eventDate = new Date(registration.event.date);
      const now = new Date();
      const hoursUntilEvent = (eventDate - now) / (1000 * 60 * 60);

      if (hoursUntilEvent < 24) {
        req.flash('error', 'Cancellation not allowed within 24 hours of the event');
        return res.redirect('/users/registrations');
      }

      if (registration.status === 'cancelled') {
        req.flash('error', 'Registration is already cancelled');
        return res.redirect('/users/registrations');
      }

      // Update registration status
      registration.status = 'cancelled';
      registration.paymentStatus = 'refunded';
      await registration.save();

      // Return seats to event
      const event = registration.event;
      event.availableSeats += registration.ticketQuantity;
      await event.save();

      req.flash('success', 'Registration cancelled successfully. Seats have been released.');
      res.redirect('/users/registrations');
    } catch (error) {
      console.error(error);
      req.flash('error', 'Failed to cancel registration');
      res.redirect('/users/registrations');
    }
  },

  // Download ticket as PDF (placeholder - implement with PDF library)
  downloadTicket: async (req, res) => {
    try {
      const registration = await Registration.findByPk(req.params.registrationId, {
        include: [{
          model: Event,
          as: 'event',
          attributes: ['title', 'date', 'time', 'venue', 'city']
        }]
      });

      if (!registration) {
        req.flash('error', 'Registration not found');
        return res.redirect('/users/registrations');
      }

      // Check authorization
      if (registration.userId !== req.session.user.userId) {
        req.flash('error', 'Unauthorized');
        return res.redirect('/users/registrations');
      }

      // For now, redirect to ticket page
      // TODO: Implement PDF generation with a library like pdfkit or puppeteer
      req.flash('info', 'PDF download feature coming soon! For now, use the ticket page.');
      res.redirect(`/users/registrations/${registration.registrationId}`);
    } catch (error) {
      console.error(error);
      req.flash('error', 'Unable to download ticket');
      res.redirect('/users/registrations');
    }
  },

  // Check registration status
  checkRegistration: async (req, res) => {
    try {
      const { eventId } = req.params;
      const registration = await Registration.findOne({
        where: {
          eventId,
          userId: req.session.user.userId,
          status: { [Op.in]: ['confirmed', 'pending'] }
        },
        include: [{
          model: Event,
          as: 'event',
          attributes: ['title', 'date']
        }]
      });

      res.json({
        isRegistered: !!registration,
        registration: registration ? {
          status: registration.status,
          ticketQuantity: registration.ticketQuantity,
          eventTitle: registration.event.title,
          eventDate: registration.event.date
        } : null
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Unable to check registration' });
    }
  }
};