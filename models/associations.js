const User = require('./User');
const Event = require('./Event');
const Registration = require('./Registration');
const Wishlist = require('./Wishlist');
const Review = require('./Review');
const Notification = require('./Notification');
const sequelize = require('../config/database');
// User Associations
User.hasMany(Event, { foreignKey: 'organizerId', as: 'organizedEvents' });
User.hasMany(Registration, { foreignKey: 'userId', as: 'registrations' });
User.hasMany(Wishlist, { foreignKey: 'userId', as: 'wishlists' });
User.hasMany(Review, { foreignKey: 'userId', as: 'reviews' });
User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications' });

// Event Associations
Event.belongsTo(User, { foreignKey: 'organizerId', as: 'organizer' });
Event.hasMany(Registration, { foreignKey: 'eventId', as: 'registrations' });
Event.hasMany(Wishlist, { foreignKey: 'eventId', as: 'wishlistedBy' });
Event.hasMany(Review, { foreignKey: 'eventId', as: 'reviews' });

// Registration Associations
Registration.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Registration.belongsTo(Event, { foreignKey: 'eventId', as: 'event' });

// Wishlist Associations
Wishlist.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Wishlist.belongsTo(Event, { foreignKey: 'eventId', as: 'event' });

// Review Associations
Review.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Review.belongsTo(Event, { foreignKey: 'eventId', as: 'event' });

module.exports = {
  User,
  Event,
  Registration,
  Wishlist,
  Review,
  Notification
};