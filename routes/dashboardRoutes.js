const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// Import models
const { Event, Registration, Wishlist, Review, User, Notification } = require('../models/associations');
const { Op } = require('sequelize');

// Dashboard route
router.get('/dashboard', auth.isAuthenticated, async (req, res) => {
  try {
    // Get user's real data
    const userId = req.session.user.userId;
    
    // 1. Get recent tickets from confirmed payments (last 5)
    const recentTickets = await Registration.findAll({
      where: { 
        userId: userId,
        status: 'confirmed',
        paymentStatus: 'completed'
      },
      include: [{
        model: Event,
        as: 'event',
        attributes: ['eventId', 'title', 'date', 'time', 'venue', 'city', 'imageUrl', 'category']
      }],
      order: [['bookingDate', 'DESC']],
      limit: 5
    });
    
    // 2. Calculate total spent on tickets
    const totalSpentResult = await Registration.sum('totalAmount', {
      where: { 
        userId: userId, 
        status: 'confirmed',
        paymentStatus: 'completed'
      }
    });
    const totalSpent = totalSpentResult || 0;
    
    // 3. Count events attended (past registrations)
    const eventsAttended = await Registration.count({
      include: [{
        model: Event,
        as: 'event',
        where: {
          date: { [Op.lt]: new Date() }
        }
      }],
      where: { 
        userId,
        status: 'confirmed',
        paymentStatus: 'completed'
      }
    });
    
    // 4. Count upcoming registrations
    const upcomingEvents = await Registration.count({
      include: [{
        model: Event,
        as: 'event',
        where: {
          date: { [Op.gte]: new Date() }
        }
      }],
      where: { 
        userId,
        status: 'confirmed',
        paymentStatus: 'completed'
      }
    });
    
    // 5. Count wishlisted events
    const wishlistedEvents = await Wishlist.count({
      where: { userId }
    });
    
    // 6. Count reviews given
    const reviewsGiven = await Review.count({
      where: { userId }
    });
    
    // 7. Count total registrations
    const totalRegistrations = await Registration.count({
      where: { 
        userId,
        status: 'confirmed',
        paymentStatus: 'completed'
      }
    });
    
    // 8. Get unread notification count
    const unreadNotificationCount = await Notification.count({
      where: { 
        userId: userId, 
        isRead: false 
      }
    });
    
    // 9. Get upcoming event registrations with details
    const upcomingRegistrations = await Registration.findAll({
      where: { 
        userId,
        status: 'confirmed',
        paymentStatus: 'completed'
      },
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
    
    // 10. Get past event registrations
    const pastRegistrations = await Registration.findAll({
      where: { 
        userId,
        status: 'confirmed',
        paymentStatus: 'completed'
      },
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
    
    // 11. Get organizer's own events (if organizer)
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
    
    // 12. Get recent activity
    const recentActivity = [];
    
    // Add recent registrations to activity
    const recentRegistrations = await Registration.findAll({
      where: { 
        userId,
        status: 'confirmed',
        paymentStatus: 'completed'
      },
      include: [{
        model: Event,
        as: 'event',
        attributes: ['title', 'eventId']
      }],
      order: [['bookingDate', 'DESC']],
      limit: 3
    });
    
    recentRegistrations.forEach(reg => {
      if (reg.event) {
        recentActivity.push({
          type: 'registration',
          message: `Purchased ticket for ${reg.event.title}`,
          date: reg.bookingDate,
          icon: 'ticket-perforated',
          color: 'success'
        });
      }
    });
    
    // Add recent wishlists to activity
    const recentWishlists = await Wishlist.findAll({
      where: { userId },
      include: [{
        model: Event,
        as: 'event',
        attributes: ['title', 'eventId']
      }],
      order: [['addedDate', 'DESC']],
      limit: 3
    });
    
    recentWishlists.forEach(wish => {
      if (wish.event) {
        recentActivity.push({
          type: 'wishlist',
          message: `Added ${wish.event.title} to Wishlist`,
          date: wish.addedDate,
          icon: 'heart',
          color: 'danger'
        });
      }
    });
    
    // Add recent reviews to activity
    const recentReviews = await Review.findAll({
      where: { userId },
      include: [{
        model: Event,
        as: 'event',
        attributes: ['title', 'eventId']
      }],
      order: [['reviewDate', 'DESC']],
      limit: 3
    });
    
    recentReviews.forEach(review => {
      if (review.event) {
        recentActivity.push({
          type: 'review',
          message: `Reviewed ${review.event.title}`,
          date: review.reviewDate,
          icon: 'star',
          color: 'warning'
        });
      }
    });
    
    // Sort activity by date (most recent first)
    recentActivity.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Render dashboard with all data
    res.render('dashboard', {
      title: 'Dashboard - EventHub',
      active: 'dashboard',
      user: req.session.user,
      recentTickets: recentTickets || [],
      totalSpent: totalSpent,
      stats: {
        eventsAttended: eventsAttended || 0,
        upcomingEvents: upcomingEvents || 0,
        wishlistedEvents: wishlistedEvents || 0,
        reviewsGiven: reviewsGiven || 0,
        totalRegistrations: totalRegistrations || 0,
        unreadNotifications: unreadNotificationCount || 0
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

// Dashboard stats API (optional)
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
      where: { 
        userId,
        status: 'confirmed',
        paymentStatus: 'completed'
      }
    });
    
    const upcomingEvents = await Registration.count({
      include: [{
        model: Event,
        as: 'event',
        where: {
          date: { [Op.gte]: new Date() }
        }
      }],
      where: { 
        userId,
        status: 'confirmed',
        paymentStatus: 'completed'
      }
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