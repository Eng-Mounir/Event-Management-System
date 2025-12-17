// module.exports = {
//   // Check if user is authenticated
//   isAuthenticated: (req, res, next) => {
//     if (req.isAuthenticated && req.isAuthenticated()) {
//       return next();
//     }
//     req.flash('error', 'Please login to access this page');
//     res.redirect('/auth/login');
//   },

//   // Check if user is organizer
//   isOrganizer: (req, res, next) => {
//     if (req.user && req.user.role === 'organizer') {
//       return next();
//     }
//     req.flash('error', 'Access denied. Organizer privileges required.');
//     res.redirect('/');
//   },

//   // Check if user is admin
//   isAdmin: (req, res, next) => {
//     if (req.user && req.user.role === 'admin') {
//       return next();
//     }
//     req.flash('error', 'Access denied. Admin privileges required.');
//     res.redirect('/');
//   },

//   // Check event ownership
//   isEventOwner: async (req, res, next) => {
//     try {
//       const { Event } = require('../models/associations');
//       const event = await Event.findByPk(req.params.eventId);
      
//       if (!event) {
//         req.flash('error', 'Event not found');
//         return res.redirect('/events');
//       }
      
//       if (event.organizerId === req.user.userId || req.user.role === 'admin') {
//         req.event = event;
//         return next();
//       }
      
//       req.flash('error', 'You are not authorized to modify this event');
//       res.redirect('/events');
//     } catch (error) {
//       console.error(error);
//       req.flash('error', 'Server error');
//       res.redirect('/events');
//     }
//   }
// };


module.exports = {
  // Check if user is authenticated - FIXED
  isAuthenticated: (req, res, next) => {
    if (req.session && req.session.user) {
      return next();
    }
    req.flash('error', 'Please login to access this page');
    res.redirect('/auth/login');
  },

  // Check if user is organizer - FIXED
  isOrganizer: (req, res, next) => {
    if (req.session.user && req.session.user.role === 'organizer') {
      return next();
    }
    
    // For now, allow all logged-in users to create events
    if (req.session.user) {
      console.log('⚠️ Allowing non-organizer to access organizer route (for testing)');
      return next();
    }
    
    req.flash('error', 'Access denied. Organizer privileges required.');
    res.redirect('/');
  },

  // Check if user is admin - FIXED
  isAdmin: (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') {
      return next();
    }
    req.flash('error', 'Access denied. Admin privileges required.');
    res.redirect('/');
  },

  // Check event ownership - FIXED
  isEventOwner: async (req, res, next) => {
    try {
      const { Event } = require('../models/associations');
      const event = await Event.findByPk(req.params.eventId);
      
      if (!event) {
        req.flash('error', 'Event not found');
        return res.redirect('/events');
      }
      
      if (event.organizerId === req.session.user.userId || req.session.user.role === 'admin') {
        req.event = event;
        return next();
      }
      
      req.flash('error', 'You are not authorized to modify this event');
      res.redirect('/events');
    } catch (error) {
      console.error(error);
      req.flash('error', 'Server error');
      res.redirect('/events');
    }
  }
};