const { Event, Registration, Wishlist, Review, User } = require('../models/associations');
const { Op } = require('sequelize');

module.exports = {
  // Show all events
  showAllEvents: async (req, res) => {
    try {
      const { category, search, date } = req.query;
      const where = {};

      // Apply filters
      if (category) where.category = category;
      if (search) {
        where[Op.or] = [
          { title: { [Op.like]: `%${search}%` } },
          { description: { [Op.like]: `%${search}%` } },
          { venue: { [Op.like]: `%${search}%` } }
        ];
      }
      if (date) {
        const startDate = new Date(date);
        const endDate = new Date(date);
        endDate.setDate(endDate.getDate() + 1);
        where.date = { [Op.between]: [startDate, endDate] };
      }

      // Get events
      const events = await Event.findAll({
        where,
        include: [{
          model: User,
          as: 'organizer',
          attributes: ['name', 'email']
        }],
        order: [['date', 'ASC']]
      });

      res.render('events/index', {
        title: 'Events',
        active: 'events', 
        events,
        user: req.session.user,
        filters: { category, search, date }
      });
    } catch (error) {
      console.error(error);
      req.flash('error', 'Unable to load events');
      res.redirect('/');
    }
  },

  // Show single event
  showEvent: async (req, res) => {
    try {
      const event = await Event.findByPk(req.params.eventId, {
        include: [
          {
            model: User,
            as: 'organizer',
            attributes: ['name', 'email', 'phone']
          },
          {
            model: Review,
            as: 'reviews',
            include: [{
              model: User,
              as: 'user',
              attributes: ['name']
            }]
          }
        ]
      });

      if (!event) {
        req.flash('error', 'Event not found');
        return res.redirect('/events');
      }

      // Check if user has wishlisted this event
      let isWishlisted = false;
      if (req.session.user) {
        const wishlistItem = await Wishlist.findOne({
          where: {
            eventId: event.eventId,
            userId: req.session.user.userId
          }
        });
        isWishlisted = !!wishlistItem;
      }

      // Check if user is registered
      let isRegistered = false;
      if (req.session.user) {
        const registration = await Registration.findOne({
          where: {
            eventId: event.eventId,
            userId: req.session.user.userId,
            status: 'confirmed'
          }
        });
        isRegistered = !!registration;
      }

      res.render('events/show', {
        title: event.title,
        event,
        isWishlisted,
        isRegistered,
        user: req.session.user
      });
    } catch (error) {
      console.error(error);
      req.flash('error', 'Unable to load event');
      res.redirect('/events');
    }
  },

  // Show create event form (organizer only)
  showCreateForm: (req, res) => {
    res.render('events/create', {
      title: 'Create Event',
      user: req.session.user
    });
  },

  // Create event
  createEvent: async (req, res) => {
    try {
      const eventData = {
        ...req.body,
        organizerId: req.session.user.userId,
        availableSeats: req.body.capacity
      };

      const event = await Event.create(eventData);
      req.flash('success', 'Event created successfully!');
      res.redirect(`/events/${event.eventId}`);
    } catch (error) {
      console.error(error);
      req.flash('error', 'Failed to create event');
      res.redirect('/events/create');
    }
  },

  // Show edit event form
  showEditForm: async (req, res) => {
    try {
      const event = await Event.findByPk(req.params.eventId);
      
      if (!event) {
        req.flash('error', 'Event not found');
        return res.redirect('/events');
      }

      // Check authorization
      if (event.organizerId !== req.session.user.userId && 
          req.session.user.role !== 'admin') {
        req.flash('error', 'Unauthorized');
        return res.redirect('/events');
      }

      res.render('events/edit', {
        title: 'Edit Event',
        event,
        user: req.session.user
      });
    } catch (error) {
      console.error(error);
      req.flash('error', 'Unable to load event');
      res.redirect('/events');
    }
  },

  // Update event
  updateEvent: async (req, res) => {
    try {
      const event = await Event.findByPk(req.params.eventId);
      
      if (!event) {
        req.flash('error', 'Event not found');
        return res.redirect('/events');
      }

      // Check authorization
      if (event.organizerId !== req.session.user.userId && 
          req.session.user.role !== 'admin') {
        req.flash('error', 'Unauthorized');
        return res.redirect('/events');
      }

      await event.update(req.body);
      req.flash('success', 'Event updated successfully!');
      res.redirect(`/events/${event.eventId}`);
    } catch (error) {
      console.error(error);
      req.flash('error', 'Failed to update event');
      res.redirect(`/events/${req.params.eventId}/edit`);
    }
  },

  // Delete event
  deleteEvent: async (req, res) => {
    try {
      const event = await Event.findByPk(req.params.eventId);
      
      if (!event) {
        req.flash('error', 'Event not found');
        return res.redirect('/events');
      }

      // Check authorization
      if (event.organizerId !== req.session.user.userId && 
          req.session.user.role !== 'admin') {
        req.flash('error', 'Unauthorized');
        return res.redirect('/events');
      }

      await event.destroy();
      req.flash('success', 'Event deleted successfully!');
      res.redirect('/events');
    } catch (error) {
      console.error(error);
      req.flash('error', 'Failed to delete event');
      res.redirect('/events');
    }
  }
};