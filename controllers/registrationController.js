const { Registration, Event } = require('../models/associations');

module.exports = {
  // Show registration form
  showRegistrationForm: async (req, res) => {
    try {
      const event = await Event.findByPk(req.params.eventId);
      
      if (!event) {
        req.flash('error', 'Event not found');
        return res.redirect('/events');
      }

      if (event.availableSeats <= 0) {
        req.flash('error', 'No seats available');
        return res.redirect(`/events/${event.eventId}`);
      }

      res.render('registrations/create', {
        title: 'Register for Event',
        event,
        user: req.session.user
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
      const { ticketQuantity } = req.body;
      
      const event = await Event.findByPk(eventId);
      
      if (!event) {
        req.flash('error', 'Event not found');
        return res.redirect('/events');
      }

      // Check seat availability
      if (event.availableSeats < ticketQuantity) {
        req.flash('error', 'Not enough seats available');
        return res.redirect(`/events/${eventId}/register`);
      }

      // Calculate total
      const totalAmount = event.price * ticketQuantity;

      // Create registration
      const registration = await Registration.create({
        eventId,
        userId: req.session.user.userId,
        ticketQuantity: parseInt(ticketQuantity),
        totalAmount,
        status: 'confirmed',
        paymentStatus: 'completed'
      });

      // Update available seats
      event.availableSeats -= ticketQuantity;
      await event.save();

      req.flash('success', 'Registration successful! Check your email for confirmation.');
      res.redirect(`/users/registrations`);
    } catch (error) {
      console.error(error);
      req.flash('error', 'Registration failed');
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
          attributes: ['title', 'date', 'venue', 'imageUrl']
        }],
        order: [['bookingDate', 'DESC']]
      });

      res.render('registrations/index', {
        title: 'My Registrations',
        active: 'registrations',
        registrations,
        user: req.session.user
      });
    } catch (error) {
      console.error(error);
      req.flash('error', 'Unable to load registrations');
      res.redirect('/');
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

      // Update registration status
      registration.status = 'cancelled';
      await registration.save();

      // Return seats to event
      const event = registration.event;
      event.availableSeats += registration.ticketQuantity;
      await event.save();

      req.flash('success', 'Registration cancelled successfully');
      res.redirect('/users/registrations');
    } catch (error) {
      console.error(error);
      req.flash('error', 'Failed to cancel registration');
      res.redirect('/users/registrations');
    }
  }
};