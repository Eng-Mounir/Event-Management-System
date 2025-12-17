const { Review, Event, Registration } = require('../models/associations');

module.exports = {
  // Show review form
  showReviewForm: async (req, res) => {
    try {
      const event = await Event.findByPk(req.params.eventId);
      
      if (!event) {
        req.flash('error', 'Event not found');
        return res.redirect('/events');
      }

      // Check if user attended the event
      const registration = await Registration.findOne({
        where: {
          eventId: event.eventId,
          userId: req.session.user.userId,
          status: 'attended'
        }
      });

      if (!registration && req.session.user.role !== 'admin') {
        req.flash('error', 'You must attend the event to leave a review');
        return res.redirect(`/events/${event.eventId}`);
      }

      res.render('reviews/create', {
        title: 'Leave a Review',
        event,
        user: req.session.user
      });
    } catch (error) {
      console.error(error);
      req.flash('error', 'Unable to load review form');
      res.redirect('/events');
    }
  },

  // Submit review
  submitReview: async (req, res) => {
    try {
      const { eventId } = req.params;
      const { rating, comment } = req.body;

      // Check if already reviewed
      const existingReview = await Review.findOne({
        where: {
          eventId,
          userId: req.session.user.userId
        }
      });

      if (existingReview) {
        req.flash('error', 'You have already reviewed this event');
        return res.redirect(`/events/${eventId}`);
      }

      // Create review
      await Review.create({
        eventId,
        userId: req.session.user.userId,
        rating: parseInt(rating),
        comment
      });

      req.flash('success', 'Review submitted successfully!');
      res.redirect(`/events/${eventId}`);
    } catch (error) {
      console.error(error);
      req.flash('error', 'Failed to submit review');
      res.redirect(`/events/${req.params.eventId}/review`);
    }
  },

  // Delete review
  deleteReview: async (req, res) => {
    try {
      const review = await Review.findByPk(req.params.reviewId);

      if (!review) {
        req.flash('error', 'Review not found');
        return res.redirect('back');
      }

      // Check authorization
      if (review.userId !== req.session.user.userId && 
          req.session.user.role !== 'admin') {
        req.flash('error', 'Unauthorized');
        return res.redirect('back');
      }

      await review.destroy();
      req.flash('success', 'Review deleted');
      res.redirect('back');
    } catch (error) {
      console.error(error);
      req.flash('error', 'Failed to delete review');
      res.redirect('back');
    }
  }
};