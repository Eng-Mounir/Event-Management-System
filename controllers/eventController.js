// const { Event, Registration, Wishlist, Review, User } = require('../models/associations');
// const { Op } = require('sequelize');

// module.exports = {
//   // Show all events
//   showAllEvents: async (req, res) => {
//     try {
//       const { category, search, date } = req.query;
//       const where = {};

//       // Apply filters
//       if (category) where.category = category;
//       if (search) {
//         where[Op.or] = [
//           { title: { [Op.like]: `%${search}%` } },
//           { description: { [Op.like]: `%${search}%` } },
//           { venue: { [Op.like]: `%${search}%` } }
//         ];
//       }
//       if (date) {
//         const startDate = new Date(date);
//         const endDate = new Date(date);
//         endDate.setDate(endDate.getDate() + 1);
//         where.date = { [Op.between]: [startDate, endDate] };
//       }

//       // Get events
//       const events = await Event.findAll({
//         where,
//         include: [{
//           model: User,
//           as: 'organizer',
//           attributes: ['name', 'email']
//         }],
//         order: [['date', 'ASC']]
//       });

//       res.render('events/index', {
//         title: 'Events',
//         active: 'events', 
//         events,
//         user: req.session.user,
//         filters: { category, search, date }
//       });
//     } catch (error) {
//       console.error(error);
//       req.flash('error', 'Unable to load events');
//       res.redirect('/');
//     }
//   },

//   // Show single event
//   showEvent: async (req, res) => {
//     try {
//       const event = await Event.findByPk(req.params.eventId, {
//         include: [
//           {
//             model: User,
//             as: 'organizer',
//             attributes: ['name', 'email', 'phone']
//           },
//           {
//             model: Review,
//             as: 'reviews',
//             include: [{
//               model: User,
//               as: 'user',
//               attributes: ['name']
//             }]
//           }
//         ]
//       });

//       if (!event) {
//         req.flash('error', 'Event not found');
//         return res.redirect('/events');
//       }

//       // Check if user has wishlisted this event
//       let isWishlisted = false;
//       if (req.session.user) {
//         const wishlistItem = await Wishlist.findOne({
//           where: {
//             eventId: event.eventId,
//             userId: req.session.user.userId
//           }
//         });
//         isWishlisted = !!wishlistItem;
//       }

//       // Check if user is registered
//       let isRegistered = false;
//       if (req.session.user) {
//         const registration = await Registration.findOne({
//           where: {
//             eventId: event.eventId,
//             userId: req.session.user.userId,
//             status: 'confirmed'
//           }
//         });
//         isRegistered = !!registration;
//       }

//       res.render('events/show', {
//         title: event.title,
//         event,
//         isWishlisted,
//         isRegistered,
//         user: req.session.user
//       });
//     } catch (error) {
//       console.error(error);
//       req.flash('error', 'Unable to load event');
//       res.redirect('/events');
//     }
//   },

//   // Show create event form (organizer only)
//   showCreateForm: (req, res) => {
//     res.render('events/create', {
//       title: 'Create Event',
//       user: req.session.user
//     });
//   },

//   // Create event
//   createEvent: async (req, res) => {
//     try {
//       const eventData = {
//         ...req.body,
//         organizerId: req.session.user.userId,
//         availableSeats: req.body.capacity
//       };

//       const event = await Event.create(eventData);
//       req.flash('success', 'Event created successfully!');
//       res.redirect(`/events/${event.eventId}`);
//     } catch (error) {
//       console.error(error);
//       req.flash('error', 'Failed to create event');
//       res.redirect('/events/create');
//     }
//   },

//   // Show edit event form
//   showEditForm: async (req, res) => {
//     try {
//       const event = await Event.findByPk(req.params.eventId);
      
//       if (!event) {
//         req.flash('error', 'Event not found');
//         return res.redirect('/events');
//       }

//       // Check authorization
//       if (event.organizerId !== req.session.user.userId && 
//           req.session.user.role !== 'admin') {
//         req.flash('error', 'Unauthorized');
//         return res.redirect('/events');
//       }

//       res.render('events/edit', {
//         title: 'Edit Event',
//         event,
//         user: req.session.user
//       });
//     } catch (error) {
//       console.error(error);
//       req.flash('error', 'Unable to load event');
//       res.redirect('/events');
//     }
//   },

//   // Update event
//   updateEvent: async (req, res) => {
//     try {
//       const event = await Event.findByPk(req.params.eventId);
      
//       if (!event) {
//         req.flash('error', 'Event not found');
//         return res.redirect('/events');
//       }

//       // Check authorization
//       if (event.organizerId !== req.session.user.userId && 
//           req.session.user.role !== 'admin') {
//         req.flash('error', 'Unauthorized');
//         return res.redirect('/events');
//       }

//       await event.update(req.body);
//       req.flash('success', 'Event updated successfully!');
//       res.redirect(`/events/${event.eventId}`);
//     } catch (error) {
//       console.error(error);
//       req.flash('error', 'Failed to update event');
//       res.redirect(`/events/${req.params.eventId}/edit`);
//     }
//   },

//   // Delete event
//   deleteEvent: async (req, res) => {
//     try {
//       const event = await Event.findByPk(req.params.eventId);
      
//       if (!event) {
//         req.flash('error', 'Event not found');
//         return res.redirect('/events');
//       }

//       // Check authorization
//       if (event.organizerId !== req.session.user.userId && 
//           req.session.user.role !== 'admin') {
//         req.flash('error', 'Unauthorized');
//         return res.redirect('/events');
//       }

//       await event.destroy();
//       req.flash('success', 'Event deleted successfully!');
//       res.redirect('/events');
//     } catch (error) {
//       console.error(error);
//       req.flash('error', 'Failed to delete event');
//       res.redirect('/events');
//     }
//   }
// };


const { Event, Registration, Wishlist, Review, User } = require('../models/associations');
const { Op } = require('sequelize');
const { NotificationManager } = require('../controllers/notificationController');

module.exports = {
  // Show all events
  showAllEvents: async (req, res) => {
    try {
      const { category, search, date } = req.query;
      const where = { status: 'upcoming' }; // Only show upcoming events by default

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
      let userRegistration = null;
      if (req.session.user) {
        userRegistration = await Registration.findOne({
          where: {
            eventId: event.eventId,
            userId: req.session.user.userId,
            status: 'confirmed'
          }
        });
        isRegistered = !!userRegistration;
      }

      // Get similar events (same category)
      const similarEvents = await Event.findAll({
        where: {
          category: event.category,
          eventId: { [Op.ne]: event.eventId },
          status: 'upcoming',
          date: { [Op.gte]: new Date() }
        },
        limit: 4,
        order: [['date', 'ASC']]
      });

      // Get reviews stats
      const reviews = event.reviews || [];
      const averageRating = reviews.length > 0 
        ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
        : 0;

      res.render('events/show', {
        title: event.title,
        event,
        isWishlisted,
        isRegistered,
        userRegistration,
        similarEvents,
        reviews,
        averageRating,
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
      user: req.session.user,
      categories: ['concert', 'conference', 'workshop', 'sports', 'festival', 'exhibition']
    });
  },

  // Create event
  createEvent: async (req, res) => {
    try {
      const { 
        title, description, category, date, time, venue, 
        address, city, capacity, price, imageUrl, registrationDeadline 
      } = req.body;

      // Validate required fields
      if (!title || !description || !category || !date || !time || !venue || !address || !city || !capacity) {
        req.flash('error', 'Please fill all required fields');
        return res.redirect('/events/create');
      }

      // Validate date is in future
      const eventDate = new Date(`${date}T${time}`);
      if (eventDate < new Date()) {
        req.flash('error', 'Event date must be in the future');
        return res.redirect('/events/create');
      }

      // Validate capacity
      if (capacity < 1) {
        req.flash('error', 'Capacity must be at least 1');
        return res.redirect('/events/create');
      }

      const eventData = {
        title,
        description,
        category,
        date: eventDate,
        time,
        venue,
        address,
        city,
        capacity: parseInt(capacity),
        availableSeats: parseInt(capacity),
        price: parseFloat(price) || 0,
        imageUrl: imageUrl || '/images/default-event.jpg',
        organizerId: req.session.user.userId,
        status: 'upcoming'
      };

      // Add registration deadline if provided
      if (registrationDeadline) {
        eventData.registrationDeadline = new Date(registrationDeadline);
      }

      const newEvent = await Event.create(eventData);
      
      // Send notification about new event
      try {
        const notificationManager = NotificationManager.getInstance();
        await notificationManager.notify('EVENT_CREATED', {
          eventId: newEvent.eventId,
          title: newEvent.title,
          category: newEvent.category
        });
        console.log('✅ Event creation notification sent');
      } catch (notifError) {
        console.error('❌ Notification error:', notifError);
        // Don't fail the event creation if notification fails
      }

      req.flash('success', 'Event created successfully!');
      res.redirect(`/events/${newEvent.eventId}`);
    } catch (error) {
      console.error('❌ Create event error:', error);
      req.flash('error', 'Failed to create event: ' + error.message);
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
      if (event.organizerId !== req.session.user.userId && req.session.user.role !== 'admin') {
        req.flash('error', 'Unauthorized to edit this event');
        return res.redirect(`/events/${event.eventId}`);
      }

      // Format date and time for form inputs
      const eventDate = new Date(event.date);
      const formattedDate = eventDate.toISOString().split('T')[0];
      const formattedTime = event.time || '19:00';

      res.render('events/edit', {
        title: 'Edit Event',
        event: {
          ...event.dataValues,
          date: formattedDate,
          time: formattedTime
        },
        user: req.session.user,
        categories: ['concert', 'conference', 'workshop', 'sports', 'festival', 'exhibition']
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
      if (event.organizerId !== req.session.user.userId && req.session.user.role !== 'admin') {
        req.flash('error', 'Unauthorized to update this event');
        return res.redirect(`/events/${event.eventId}`);
      }

      const { 
        title, description, category, date, time, venue, 
        address, city, capacity, price, imageUrl, status, registrationDeadline 
      } = req.body;

      // Validate capacity if changed
      if (capacity && capacity < event.registrations) {
        req.flash('error', `Capacity cannot be less than current registrations (${event.registrations})`);
        return res.redirect(`/events/${event.eventId}/edit`);
      }

      // Update available seats if capacity changed
      let availableSeats = event.availableSeats;
      if (capacity && capacity !== event.capacity) {
        const capacityDiff = parseInt(capacity) - event.capacity;
        availableSeats = event.availableSeats + capacityDiff;
      }

      const updateData = {
        title: title || event.title,
        description: description || event.description,
        category: category || event.category,
        date: date ? new Date(`${date}T${time || event.time}`) : event.date,
        time: time || event.time,
        venue: venue || event.venue,
        address: address || event.address,
        city: city || event.city,
        capacity: capacity ? parseInt(capacity) : event.capacity,
        availableSeats,
        price: price ? parseFloat(price) : event.price,
        imageUrl: imageUrl || event.imageUrl,
        status: status || event.status,
        registrationDeadline: registrationDeadline ? new Date(registrationDeadline) : event.registrationDeadline
      };

      await event.update(updateData);
      
      // Send notification about event update
      try {
        const notificationManager = NotificationManager.getInstance();
        await notificationManager.notify('EVENT_UPDATED', {
          eventId: event.eventId,
          title: event.title
        });
        console.log('✅ Event update notification sent');
      } catch (notifError) {
        console.error('❌ Notification error:', notifError);
      }

      req.flash('success', 'Event updated successfully!');
      res.redirect(`/events/${event.eventId}`);
    } catch (error) {
      console.error('❌ Update event error:', error);
      req.flash('error', 'Failed to update event: ' + error.message);
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
      if (event.organizerId !== req.session.user.userId && req.session.user.role !== 'admin') {
        req.flash('error', 'Unauthorized to delete this event');
        return res.redirect(`/events/${event.eventId}`);
      }

      // Check if there are registrations
      const registrationsCount = await Registration.count({
        where: { eventId: event.eventId, status: 'confirmed' }
      });

      if (registrationsCount > 0) {
        req.flash('error', `Cannot delete event with ${registrationsCount} active registration(s). Cancel registrations first.`);
        return res.redirect(`/events/${event.eventId}`);
      }

      await event.destroy();
      req.flash('success', 'Event deleted successfully!');
      res.redirect('/events');
    } catch (error) {
      console.error(error);
      req.flash('error', 'Failed to delete event');
      res.redirect(`/events/${req.params.eventId}`);
    }
  },

  // Manage event (organizer view)
  manageEvent: async (req, res) => {
    try {
      const event = await Event.findByPk(req.params.eventId, {
        include: [{
          model: Registration,
          as: 'registrations',
          include: [{
            model: User,
            as: 'user',
            attributes: ['name', 'email']
          }]
        }]
      });

      if (!event) {
        req.flash('error', 'Event not found');
        return res.redirect('/events');
      }

      // Check authorization
      if (event.organizerId !== req.session.user.userId && req.session.user.role !== 'admin') {
        req.flash('error', 'Unauthorized to manage this event');
        return res.redirect(`/events/${event.eventId}`);
      }

      // Calculate stats
      const totalRegistrations = event.registrations.length;
      const confirmedRegistrations = event.registrations.filter(r => r.status === 'confirmed').length;
      const totalRevenue = event.registrations
        .filter(r => r.status === 'confirmed')
        .reduce((sum, reg) => sum + parseFloat(reg.totalAmount || 0), 0);

      res.render('events/manage', {
        title: `Manage ${event.title}`,
        event,
        registrations: event.registrations,
        stats: {
          totalRegistrations,
          confirmedRegistrations,
          pendingRegistrations: totalRegistrations - confirmedRegistrations,
          totalRevenue: totalRevenue.toFixed(2),
          seatsFilled: event.capacity - event.availableSeats,
          seatsAvailable: event.availableSeats,
          fillPercentage: ((event.capacity - event.availableSeats) / event.capacity * 100).toFixed(1)
        },
        user: req.session.user
      });
    } catch (error) {
      console.error(error);
      req.flash('error', 'Unable to load event management');
      res.redirect('/events');
    }
  },

  // Toggle event status
  toggleEventStatus: async (req, res) => {
    try {
      const event = await Event.findByPk(req.params.eventId);
      
      if (!event) {
        req.flash('error', 'Event not found');
        return res.redirect('/events');
      }

      // Check authorization
      if (event.organizerId !== req.session.user.userId && req.session.user.role !== 'admin') {
        req.flash('error', 'Unauthorized to update this event');
        return res.redirect(`/events/${event.eventId}`);
      }

      const newStatus = event.status === 'upcoming' ? 'cancelled' : 'upcoming';
      await event.update({ status: newStatus });

      req.flash('success', `Event ${newStatus === 'cancelled' ? 'cancelled' : 'reactivated'} successfully!`);
      res.redirect(`/events/${event.eventId}/manage`);
    } catch (error) {
      console.error(error);
      req.flash('error', 'Failed to update event status');
      res.redirect(`/events/${req.params.eventId}/manage`);
    }
  }
};