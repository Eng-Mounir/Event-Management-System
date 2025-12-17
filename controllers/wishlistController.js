// const { Wishlist, Event } = require('../models/associations');

// module.exports = {
//   // Add to wishlist
//   addToWishlist: async (req, res) => {
//     try {
//       const { eventId } = req.params;
      
//       // Check if already in wishlist
//       const existing = await Wishlist.findOne({
//         where: {
//           eventId,
//           userId: req.session.user.userId
//         }
//       });

//       if (existing) {
//         req.flash('info', 'Event already in wishlist');
//         return res.redirect('back');
//       }

//       // Add to wishlist
//       await Wishlist.create({
//         eventId,
//         userId: req.session.user.userId
//       });

//       req.flash('success', 'Added to wishlist');
//       res.redirect('back');
//     } catch (error) {
//       console.error(error);
//       req.flash('error', 'Failed to add to wishlist');
//       res.redirect('back');
//     }
//   },

//   // Remove from wishlist
//   removeFromWishlist: async (req, res) => {
//     try {
//       const { eventId } = req.params;
      
//       await Wishlist.destroy({
//         where: {
//           eventId,
//           userId: req.session.user.userId
//         }
//       });

//       req.flash('success', 'Removed from wishlist');
//       res.redirect('back');
//     } catch (error) {
//       console.error(error);
//       req.flash('error', 'Failed to remove from wishlist');
//       res.redirect('back');
//     }
//   },

//   // Show user's wishlist
//   showWishlist: async (req, res) => {
//     try {
//       const wishlistItems = await Wishlist.findAll({
//         where: { userId: req.session.user.userId },
//         include: [{
//           model: Event,
//           as: 'event',
//           attributes: ['eventId', 'title', 'date', 'venue', 'price', 'imageUrl']
//         }],
//         order: [['addedDate', 'DESC']]
//       });

//       res.render('wishlist/index', {
//         title: 'My Wishlist',
//         wishlistItems,
//         user: req.session.user
//       });
//     } catch (error) {
//       console.error(error);
//       req.flash('error', 'Unable to load wishlist');
//       res.redirect('/');
//     }
//   }
// };


const { Wishlist, Event, User } = require('../models/associations');

module.exports = {
  // Add to wishlist
  addToWishlist: async (req, res) => {
    try {
      const { eventId } = req.params;
      
      // Check if event exists
      const event = await Event.findByPk(eventId);
      if (!event) {
        req.flash('error', 'Event not found');
        return res.redirect('back');
      }

      // Check if already in wishlist
      const existing = await Wishlist.findOne({
        where: {
          eventId,
          userId: req.session.user.userId
        }
      });

      if (existing) {
        req.flash('info', 'Event already in wishlist');
        return res.redirect('back');
      }

      // Add to wishlist
      await Wishlist.create({
        eventId,
        userId: req.session.user.userId
      });

      req.flash('success', 'Added to wishlist');
      res.redirect('back');
    } catch (error) {
      console.error(error);
      req.flash('error', 'Failed to add to wishlist');
      res.redirect('back');
    }
  },

  // Remove from wishlist
  removeFromWishlist: async (req, res) => {
    try {
      const { eventId } = req.params;
      
      await Wishlist.destroy({
        where: {
          eventId,
          userId: req.session.user.userId
        }
      });

      req.flash('success', 'Removed from wishlist');
      res.redirect('back');
    } catch (error) {
      console.error(error);
      req.flash('error', 'Failed to remove from wishlist');
      res.redirect('back');
    }
  },

  // Clear all wishlist items
  clearWishlist: async (req, res) => {
    try {
      await Wishlist.destroy({
        where: {
          userId: req.session.user.userId
        }
      });

      req.flash('success', 'Wishlist cleared successfully');
      res.redirect('/wishlist');
    } catch (error) {
      console.error(error);
      req.flash('error', 'Failed to clear wishlist');
      res.redirect('/wishlist');
    }
  },

  // Show user's wishlist
  showWishlist: async (req, res) => {
    try {
      const wishlistItems = await Wishlist.findAll({
        where: { userId: req.session.user.userId },
        include: [{
          model: Event,
          as: 'event',
          include: [{
            model: User,
            as: 'organizer',
            attributes: ['name', 'email']
          }]
        }],
        order: [['addedDate', 'DESC']]
      });

      res.render('wishlist/index', {
        title: 'My Wishlist',
        wishlistItems,
        user: req.session.user
      });
    } catch (error) {
      console.error(error);
      req.flash('error', 'Unable to load wishlist');
      res.redirect('/');
    }
  }
};