const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// Import models
const { Event, Registration, Wishlist, Review, User } = require('../models/associations');
const { Op } = require('sequelize');

// Dashboard route
router.get('/dashboard', auth.isAuthenticated, async (req, res) => {
  try {
    // Get user's real data
    const userId = req.session.user.userId;
    
    // 1. Count events attended (past registrations) - FIXED with 'as'
    const eventsAttended = await Registration.count({
      include: [{
        model: Event,
        as: 'event',
        where: {
          date: { [Op.lt]: new Date() }
        }
      }],
      where: { userId }
    });
    
    // 2. Count upcoming registrations - FIXED with 'as'
    const upcomingEvents = await Registration.count({
      include: [{
        model: Event,
        as: 'event',
        where: {
          date: { [Op.gte]: new Date() }
        }
      }],
      where: { userId }
    });
    
    // 3. Count wishlisted events
    const wishlistedEvents = await Wishlist.count({
      where: { userId }
    });
    
    // 4. Count reviews given
    const reviewsGiven = await Review.count({
      where: { userId }
    });
    
    // 5. Get upcoming event registrations with details - FIXED with 'as'
    const upcomingRegistrations = await Registration.findAll({
      where: { userId },
      include: [{
        model: Event,
        as: 'event',
        where: {
          date: { [Op.gte]: new Date() }
        },
        include: [{
          model: User,
          as: 'organizer',
          attributes: ['name', 'email']
        }]
      }],
      order: [[{ model: Event, as: 'event' }, 'date', 'ASC']],
      limit: 5
    });
    
    // 6. Get past event registrations - FIXED with 'as'
    const pastRegistrations = await Registration.findAll({
      where: { userId },
      include: [{
        model: Event,
        as: 'event',
        where: {
          date: { [Op.lt]: new Date() }
        }
      }],
      order: [[{ model: Event, as: 'event' }, 'date', 'DESC']],
      limit: 5
    });
    
    // 7. Get organizer's own events (if organizer)
    let myEvents = [];
    if (req.session.user.role === 'organizer') {
      myEvents = await Event.findAll({
        where: {
          organizerId: userId
        },
        order: [['date', 'DESC']],
        limit: 5
      });
    }
    
    // 8. Get recent activity (combine registrations, wishlists, reviews)
    const recentActivity = [];
    
    // Add recent registrations to activity - FIXED with correct column name
    const recentRegistrations = await Registration.findAll({
      where: { userId },
      include: [{
        model: Event,
        as: 'event',
        attributes: ['title', 'eventId']
      }],
      order: [['bookingDate', 'DESC']],  // CHANGED: registrationDate → bookingDate
      limit: 3
    });
    
    recentRegistrations.forEach(reg => {
      if (reg.event) {
        recentActivity.push({
          type: 'registration',
          message: `Registered for ${reg.event.title}`,
          date: reg.bookingDate,  // CHANGED: registrationDate → bookingDate
          icon: 'check-circle-fill',
          color: 'success'
        });
      }
    });
    
    // Add recent wishlists to activity - FIXED with correct column name
    const recentWishlists = await Wishlist.findAll({
      where: { userId },
      include: [{
        model: Event,
        as: 'event',
        attributes: ['title', 'eventId']
      }],
      order: [['addedDate', 'DESC']],  // This is correct based on your model
      limit: 3
    });
    
    recentWishlists.forEach(wish => {
      if (wish.event) {
        recentActivity.push({
          type: 'wishlist',
          message: `Added ${wish.event.title} to Wishlist`,
          date: wish.addedDate,  // This is correct based on your model
          icon: 'heart-fill',
          color: 'warning'
        });
      }
    });
    
    // Add recent reviews to activity - FIXED with correct column name
    const recentReviews = await Review.findAll({
      where: { userId },
      include: [{
        model: Event,
        as: 'event',
        attributes: ['title', 'eventId']
      }],
      order: [['reviewDate', 'DESC']],  // CHANGED: createdAt → reviewDate (or use createdAt if you prefer)
      limit: 3
    });
    
    recentReviews.forEach(review => {
      if (review.event) {
        recentActivity.push({
          type: 'review',
          message: `Reviewed ${review.event.title}`,
          date: review.reviewDate,  // CHANGED: createdAt → reviewDate
          icon: 'star-fill',
          color: 'primary'
        });
      }
    });
    
    // Sort activity by date (most recent first)
    recentActivity.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    res.render('dashboard', {
      title: 'Dashboard',
      active: 'dashboard',
      user: req.session.user,
      stats: {
        eventsAttended: eventsAttended || 0,
        upcomingEvents: upcomingEvents || 0,
        wishlistedEvents: wishlistedEvents || 0,
        reviewsGiven: reviewsGiven || 0
      },
      upcomingRegistrations: upcomingRegistrations || [],
      pastRegistrations: pastRegistrations || [],
      myEvents: myEvents || [],
      recentActivity: recentActivity.slice(0, 5) || []
    });
    
  } catch (error) {
    console.error('Dashboard error:', error);
    req.flash('error', 'Unable to load dashboard');
    res.redirect('/');
  }
});
// Add this route before module.exports in dashboardRoutes.js
router.get('/dashboard/stats', auth.isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.userId;
    
    const eventsAttended = await Registration.count({
      include: [{
        model: Event,
        as: 'event',
        where: {
          date: { [Op.lt]: new Date() }
        }
      }],
      where: { userId }
    });
    
    const upcomingEvents = await Registration.count({
      include: [{
        model: Event,
        as: 'event',
        where: {
          date: { [Op.gte]: new Date() }
        }
      }],
      where: { userId }
    });
    
    const wishlistedEvents = await Wishlist.count({
      where: { userId }
    });
    
    const reviewsGiven = await Review.count({
      where: { userId }
    });
    
    res.json({
      eventsAttended,
      upcomingEvents,
      wishlistedEvents,
      reviewsGiven
    });
    
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Unable to fetch stats' });
  }
});
module.exports = router;