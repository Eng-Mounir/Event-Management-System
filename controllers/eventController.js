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
const eventMementoManager = require('../patterns/EventMemento');

module.exports = {
  // Show all events
  showAllEvents: async (req, res) => {
    try {
      const { category, search, date } = req.query;
      const where = { status: 'upcoming' };

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

  // Show create event form
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

      if (!title || !description || !category || !date || !time || !venue || !address || !city || !capacity) {
        req.flash('error', 'Please fill all required fields');
        return res.redirect('/events/create');
      }

      const eventDate = new Date(`${date}T${time}`);
      if (eventDate < new Date()) {
        req.flash('error', 'Event date must be in the future');
        return res.redirect('/events/create');
      }

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

      if (registrationDeadline) {
        eventData.registrationDeadline = new Date(registrationDeadline);
      }

      const newEvent = await Event.create(eventData);
      
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
      }

      req.flash('success', 'Event created successfully!');
      res.redirect(`/events/${newEvent.eventId}`);
    } catch (error) {
      console.error('❌ Create event error:', error);
      req.flash('error', 'Failed to create event: ' + error.message);
      res.redirect('/events/create');
    }
  },

  // In eventController.js - showEditForm function
showEditForm: async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.eventId);
    
    if (!event) {
      req.flash('error', 'Event not found');
      return res.redirect('/events');
    }

    if (event.organizerId !== req.session.user.userId && req.session.user.role !== 'admin') {
      req.flash('error', 'Unauthorized to edit this event');
      return res.redirect(`/events/${event.eventId}`);
    }

    // DEBUG: Check Memento state before saving
    console.log('🔍 Current Memento state for event', event.eventId);
    console.log('📊 Current history:', eventMementoManager.getHistory(event.eventId));
    console.log('↩️  Can undo:', eventMementoManager.canUndo(event.eventId));
    console.log('↪️  Can redo:', eventMementoManager.canRedo(event.eventId));
    
    // Check if we need to save current state to Memento
    // Only save if this is a fresh edit session (not coming from undo/redo)
    if (!req.query.fromUndoRedo) {
      const currentHistory = eventMementoManager.getHistory(event.eventId);
      const shouldSave = currentHistory.length === 0 || 
                        !currentHistory[currentHistory.length - 1].isCurrent;
      
      if (shouldSave) {
        console.log('💾 Saving current state to Memento...');
        eventMementoManager.saveState(event.eventId, {
          ...event.dataValues,
          timestamp: new Date()
        });
        console.log('✅ State saved. New history:', eventMementoManager.getHistory(event.eventId));
      }
    }
    
    const eventDate = new Date(event.date);
    const formattedDate = eventDate.toISOString().split('T')[0];
    const formattedTime = event.time || '19:00';
    
    // Get Memento history
    const history = eventMementoManager.getHistory(event.eventId);
    const canUndo = eventMementoManager.canUndo(event.eventId);
    const canRedo = eventMementoManager.canRedo(event.eventId);

    // DEBUG output
    console.log('📈 Final Memento stats:');
    console.log('   Total versions:', history.length);
    console.log('   Current index:', history.findIndex(h => h.isCurrent));
    console.log('   Can undo:', canUndo);
    console.log('   Can redo:', canRedo);

    res.render('events/edit', {
      title: 'Edit Event',
      event: {
        ...event.dataValues,
        date: formattedDate,
        time: formattedTime
      },
      user: req.session.user,
      categories: ['concert', 'conference', 'workshop', 'sports', 'festival', 'exhibition'],
      mementoHistory: history,
      canUndo: canUndo,
      canRedo: canRedo
    });
  } catch (error) {
    console.error(error);
    req.flash('error', 'Unable to load event');
    res.redirect('/events');
  }
},

  // ✅ Send event reminders function
  sendEventReminders: async () => {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const dayAfterTomorrow = new Date(tomorrow);
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

      console.log('🕒 Looking for events between:', tomorrow, 'and', dayAfterTomorrow);

      const events = await Event.findAll({
        where: {
          date: {
            [Op.between]: [tomorrow, dayAfterTomorrow]
          },
          status: 'upcoming'
        },
        include: [{
          model: Registration,
          as: 'registrations',
          where: { status: 'confirmed' },
          required: false,
          include: [{
            model: User,
            as: 'user'
          }]
        }]
      });

      console.log(`🔍 Found ${events.length} events scheduled for tomorrow`);

      const notificationManager = NotificationManager.getInstance();
      let totalRemindersSent = 0;

      for (const event of events) {
        console.log(`📅 Processing event: ${event.title} (ID: ${event.eventId})`);
        
        if (event.registrations && event.registrations.length > 0) {
          console.log(`   👥 ${event.registrations.length} confirmed registrations found`);
          
          for (const registration of event.registrations) {
            if (registration.user && registration.user.email) {
              console.log(`   📧 Sending reminder to: ${registration.user.email}`);
              
              await notificationManager.notify('EVENT_REMINDER', {
                eventId: event.eventId,
                title: event.title,
                userEmail: registration.user.email
              });
              
              totalRemindersSent++;
              console.log(`   ✅ Reminder queued for: ${registration.user.email}`);
            } else {
              console.log(`   ⚠️  User object or email missing for registration ID: ${registration.registrationId}`);
            }
          }
        } else {
          console.log(`   ℹ️  No confirmed registrations for this event`);
        }
      }

      console.log(`🎉 Total reminders sent: ${totalRemindersSent} from ${events.length} events`);
      return { 
        success: true, 
        totalEvents: events.length, 
        totalReminders: totalRemindersSent 
      };
    } catch (error) {
      console.error('❌ Error in sendEventReminders:', error);
      console.error('❌ Error details:', error.message);
      console.error('❌ Error stack:', error.stack);
      return { 
        success: false, 
        error: error.message 
      };
    }
  },

  // Enhanced updateEvent with Memento
  updateEvent: async (req, res) => {
    try {
      const event = await Event.findByPk(req.params.eventId);
      
      if (!event) {
        req.flash('error', 'Event not found');
        return res.redirect('/events');
      }

      if (event.organizerId !== req.session.user.userId && req.session.user.role !== 'admin') {
        req.flash('error', 'Unauthorized to update this event');
        return res.redirect(`/events/${event.eventId}`);
      }

      const { 
        title, description, category, date, time, venue, 
        address, city, capacity, price, imageUrl, status, registrationDeadline 
      } = req.body;

      if (capacity && capacity < event.registrations) {
        req.flash('error', `Capacity cannot be less than current registrations (${event.registrations})`);
        return res.redirect(`/events/${event.eventId}/edit`);
      }

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
      
      // Save new state to Memento
      eventMementoManager.saveState(event.eventId, event.dataValues);
      
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
      res.redirect(`/events/${event.eventId}/manage`);
      
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

      if (event.organizerId !== req.session.user.userId && req.session.user.role !== 'admin') {
        req.flash('error', 'Unauthorized to delete this event');
        return res.redirect(`/events/${event.eventId}`);
      }

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

  // Enhanced manage event with Memento functionality
  manageEvent: async (req, res) => {
    try {
      const event = await Event.findByPk(req.params.eventId, {
        include: [
          {
            model: Registration,
            as: 'registrations',
            include: [{
              model: User,
              as: 'user',
              attributes: ['name', 'email']
            }]
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

      if (event.organizerId !== req.session.user.userId && req.session.user.role !== 'admin') {
        req.flash('error', 'Unauthorized to manage this event');
        return res.redirect(`/events/${event.eventId}`);
      }

      const totalRegistrations = event.registrations.length;
      const confirmedRegistrations = event.registrations.filter(r => r.status === 'confirmed').length;
      const totalRevenue = event.registrations
        .filter(r => r.status === 'confirmed')
        .reduce((sum, reg) => sum + parseFloat(reg.totalAmount || 0), 0);

      // Get Memento history for this event
      const history = eventMementoManager.getHistory(event.eventId);
      const canUndo = eventMementoManager.canUndo(event.eventId);
      const canRedo = eventMementoManager.canRedo(event.eventId);

      res.render('events/manage', {
        title: `Manage ${event.title}`,
        event,
        registrations: event.registrations,
        reviews: event.reviews,
        stats: {
          totalRegistrations,
          confirmedRegistrations,
          pendingRegistrations: totalRegistrations - confirmedRegistrations,
          totalRevenue: totalRevenue.toFixed(2),
          seatsFilled: event.capacity - event.availableSeats,
          seatsAvailable: event.availableSeats,
          fillPercentage: ((event.capacity - event.availableSeats) / event.capacity * 100).toFixed(1),
          averageRating: event.reviews.length > 0 
            ? event.reviews.reduce((sum, review) => sum + review.rating, 0) / event.reviews.length 
            : 0,
          totalReviews: event.reviews.length
        },
        mementoHistory: history,
        canUndo: canUndo,
        canRedo: canRedo,
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
  },
// In eventController.js - undoEventChange function
undoEventChange: async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const event = await Event.findByPk(eventId);
    
    if (!event) {
      req.flash('error', 'Event not found');
      return res.redirect('/events');
    }

    if (event.organizerId !== req.session.user.userId && req.session.user.role !== 'admin') {
      req.flash('error', 'Unauthorized to manage this event');
      return res.redirect(`/events/${event.eventId}`);
    }

    console.log('↩️  Attempting undo for event:', eventId);
    console.log('📊 Before undo - Can undo:', eventMementoManager.canUndo(eventId));
    console.log('📊 Before undo - History:', eventMementoManager.getHistory(eventId));
    
    const previousState = eventMementoManager.undo(eventId);
    
    if (previousState) {
      console.log('✅ Got previous state:', previousState);
      await event.update(previousState);
      req.flash('success', 'Undo successful! Previous state restored.');
      
      // Redirect back to edit page with a flag
      res.redirect(`/events/${eventId}/edit?fromUndoRedo=true`);
    } else {
      console.log('❌ No previous state available');
      req.flash('info', 'No more undo history available.');
      res.redirect(`/events/${eventId}/edit`);
    }
  } catch (error) {
    console.error('❌ Undo error:', error);
    req.flash('error', 'Unable to undo changes: ' + error.message);
    res.redirect(`/events/${req.params.eventId}/edit`);
  }
},

// In eventController.js - redoEventChange function
redoEventChange: async (req, res) => {
  try {
    const eventId = req.params.eventId;
    console.log(`↪️  Attempting redo for event: ${eventId}`);
    
    // Debug manager state
    eventMementoManager.dumpCaretakers();
    
    const event = await Event.findByPk(eventId);
    
    if (!event) {
      req.flash('error', 'Event not found');
      return res.redirect('/events');
    }

    if (event.organizerId !== req.session.user.userId && req.session.user.role !== 'admin') {
      req.flash('error', 'Unauthorized to manage this event');
      return res.redirect(`/events/${event.eventId}`);
    }

    // Get next state
    const nextState = eventMementoManager.redo(eventId);
    
    if (nextState) {
      console.log(`✅ Got next state for event ${eventId}`);
      
      // Update the database
      await event.update(nextState);
      
      // RELOAD the event to get updated data
      const updatedEvent = await Event.findByPk(eventId);
      
      // Format for template
      const eventDate = new Date(updatedEvent.date);
      const formattedDate = eventDate.toISOString().split('T')[0];
      const formattedTime = updatedEvent.time || '19:00';
      
      // Get updated Memento history
      const history = eventMementoManager.getHistory(eventId);
      const canUndo = eventMementoManager.canUndo(eventId);
      const canRedo = eventMementoManager.canRedo(eventId);
      
      // Show success message
      req.flash('success', 'Redo successful! Next state restored.');
      
      // RENDER instead of redirect to show the actual changes
      res.render('events/edit', {
        title: 'Edit Event',
        event: {
          ...updatedEvent.dataValues,
          date: formattedDate,
          time: formattedTime
        },
        user: req.session.user,
        categories: ['concert', 'conference', 'workshop', 'sports', 'festival', 'exhibition'],
        mementoHistory: history,
        canUndo: canUndo,
        canRedo: canRedo,
        success: 'Redo successful! Changes applied.'
      });
    } else {
      console.log(`❌ No next state available for event ${eventId}`);
      req.flash('info', 'No more redo history available.');
      res.redirect(`/events/${eventId}/edit`);
    }
  } catch (error) {
    console.error('❌ Redo error:', error);
    req.flash('error', 'Unable to redo changes: ' + error.message);
    res.redirect(`/events/${req.params.eventId}/edit`);
  }
},
// In eventController.js
getCurrentEventData: async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    res.json({
      ...event.dataValues,
      date: new Date(event.date).toISOString().split('T')[0],
      time: event.time
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
},
// Add this to your eventController.js
testMementoSingleton: async (req, res) => {
  try {
    // Get the manager twice to see if it's the same instance
    const manager1 = require('../patterns/EventMemento');
    const manager2 = require('../patterns/EventMemento');
    
    const debug1 = manager1.debug ? manager1.debug() : { error: 'No debug method' };
    const debug2 = manager2.debug ? manager2.debug() : { error: 'No debug method' };
    
    res.json({
      sameInstance: manager1 === manager2,
      manager1: debug1,
      manager2: debug2,
      manager1Type: typeof manager1,
      manager2Type: typeof manager2
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
},
  // Clear Memento history
  clearEventHistory: async (req, res) => {
    try {
      const eventId = req.params.eventId;
      const event = await Event.findByPk(eventId);
      
      if (!event) {
        req.flash('error', 'Event not found');
        return res.redirect('/events');
    }

      if (event.organizerId !== req.session.user.userId && req.session.user.role !== 'admin') {
        req.flash('error', 'Unauthorized to manage this event');
        return res.redirect(`/events/${event.eventId}`);
      }

      eventMementoManager.clearHistory(eventId);
      req.flash('success', 'Event history cleared successfully!');
      
      res.redirect(`/events/${eventId}/manage`);
    } catch (error) {
      console.error('❌ Clear history error:', error);
      req.flash('error', 'Unable to clear history');
      res.redirect(`/events/${req.params.eventId}/manage`);
    }
  },

  // Export attendees data
  exportAttendees: async (req, res) => {
    try {
      const event = await Event.findByPk(req.params.eventId, {
        include: [{
          model: Registration,
          as: 'registrations',
          where: { status: 'confirmed' },
          required: false,
          include: [{
            model: User,
            as: 'user',
            attributes: ['name', 'email', 'phone']
          }]
        }]
      });

      if (!event) {
        req.flash('error', 'Event not found');
        return res.redirect('/events');
      }

      if (event.organizerId !== req.session.user.userId && req.session.user.role !== 'admin') {
        req.flash('error', 'Unauthorized to export data');
        return res.redirect(`/events/${event.eventId}/manage`);
      }

      // Generate CSV
      let csv = 'Name,Email,Phone,Tickets,Amount,Booking Date\n';
      event.registrations.forEach(reg => {
        csv += `"${reg.user.name}","${reg.user.email}","${reg.user.phone || ''}","${reg.ticketQuantity}","${reg.totalAmount}","${reg.bookingDate}"\n`;
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=attendees-${event.eventId}-${Date.now()}.csv`);
      res.send(csv);
    } catch (error) {
      console.error('❌ Export error:', error);
      req.flash('error', 'Unable to export attendees');
      res.redirect(`/events/${req.params.eventId}/manage`);
    }
  },
  // Debug Memento state
debugMemento: async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const history = eventMementoManager.getHistory(eventId);
    const canUndo = eventMementoManager.canUndo(eventId);
    const canRedo = eventMementoManager.canRedo(eventId);
    
    res.json({
      eventId,
      history,
      canUndo,
      canRedo,
      totalVersions: history.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

};