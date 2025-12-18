const { Op } = require('sequelize');
const { Event, Registration, User } = require('../models/associations');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Helper function moved to TOP LEVEL - can be called anywhere
async function handleSuccessfulPayment(paymentIntent, req, res, event, quantity, amount) {
  try {
    // Check if registration already exists
    const existingRegistration = await Registration.findOne({
      where: {
        eventId: event.eventId,
        userId: req.session.user.userId,
        status: { [Op.notIn]: ['cancelled', 'refunded'] }
      }
    });
    
    if (existingRegistration) {
      return res.status(400).json({
        success: false,
        message: 'You are already registered for this event'
      });
    }
    
    // Create registration record
    const registration = await Registration.create({
      eventId: event.eventId,
      userId: req.session.user.userId,
      ticketQuantity: quantity,
      totalAmount: parseFloat(amount),
      paymentMethod: 'credit_card',
      paymentId: paymentIntent.id,
      status: 'confirmed',
      paymentStatus: 'completed',
      bookingDate: new Date(),
      paymentDetails: JSON.stringify({
        paymentIntentId: paymentIntent.id,
        chargeId: paymentIntent.latest_charge,
        paymentMethod: paymentIntent.payment_method_types?.[0] || 'card',
        receiptEmail: paymentIntent.receipt_email,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency
      })
    });
    
    // Update available seats
    await event.decrement('availableSeats', { by: quantity });
    
    // Return success response
    return {
      success: true,
      requiresAction: false,
      registrationId: registration.registrationId,
      redirectUrl: `/payments/success?registrationId=${registration.registrationId}`,
      message: 'Payment successful!'
    };
    
  } catch (error) {
    console.error('Payment success handling error:', error);
    throw error;
  }
}

module.exports = {
  // Show checkout page
  showCheckoutPage: async (req, res) => {
    try {
      const { eventId, quantity = 1 } = req.query;
      
      const event = await Event.findByPk(eventId);
      
      if (!event) {
        req.flash('error', 'Event not found');
        return res.redirect('/events');
      }
      
      if (event.availableSeats < quantity) {
        req.flash('error', `Only ${event.availableSeats} seats available`);
        return res.redirect(`/events/${eventId}`);
      }
      
      // Safely calculate total amount
      const eventPrice = parseFloat(event.price) || 0;
      const totalAmount = (eventPrice * quantity).toFixed(2);
      
      res.render('payments/checkout', {
        title: 'Complete Payment',
        event,
        quantity: parseInt(quantity),
        totalAmount,
        user: req.session.user,
        stripePublicKey: process.env.STRIPE_PUBLIC_KEY
      });
    } catch (error) {
      console.error('Checkout page error:', error);
      req.flash('error', 'Unable to load checkout page');
      res.redirect('/events');
    }
  },

  // Process Stripe payment
  processStripePayment: async (req, res) => {
    try {
      const { eventId, quantity, paymentMethodId, amount, email, name } = req.body;
      const event = await Event.findByPk(eventId);
      
      if (!event) {
        return res.status(404).json({ success: false, message: 'Event not found' });
      }
      
      // Check availability
      if (event.availableSeats < quantity) {
        return res.status(400).json({ 
          success: false, 
          message: `Only ${event.availableSeats} seats available` 
        });
      }
      
      const amountInCents = Math.round(parseFloat(amount) * 100);
      
      // Create Payment Intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: 'usd',
        payment_method: paymentMethodId,
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never'
        },
        confirm: true,
        description: `Registration for ${event.title}`,
        metadata: {
          eventId: event.eventId,
          userId: req.session.user.userId,
          quantity: quantity,
          userEmail: email,
          userName: name
        },
        receipt_email: email,
      });
      
      console.log('Payment Intent Status:', paymentIntent.status);
      
      // Handle different Payment Intent statuses
      if (paymentIntent.status === 'requires_action' || paymentIntent.status === 'requires_confirmation') {
        // 3D Secure authentication required
        res.json({
          success: true,
          requiresAction: true,
          clientSecret: paymentIntent.client_secret,
          message: 'Authentication required'
        });
      } else if (paymentIntent.status === 'succeeded') {
        // Payment succeeded immediately
        const result = await handleSuccessfulPayment(paymentIntent, req, res, event, quantity, amount);
        res.json(result);
      } else if (paymentIntent.status === 'processing') {
        // Payment is processing
        res.json({
          success: true,
          requiresAction: false,
          message: 'Payment is processing. You will receive a confirmation email shortly.',
          redirectUrl: `/payments/processing?payment_intent=${paymentIntent.id}`
        });
      } else {
        // Handle other statuses
        res.json({
          success: false,
          message: `Unexpected payment status: ${paymentIntent.status}`
        });
      }
      
    } catch (error) {
      console.error('Stripe payment error:', error);
      res.status(500).json({
        success: false,
        message: 'Payment failed: ' + error.message
      });
    }
  },
  
  // Show success page
  showSuccessPage: async (req, res) => {
    try {
      const { registrationId } = req.query;
      
      const registration = await Registration.findByPk(registrationId, {
        include: [{
          model: Event,
          as: 'event',
             attributes: [
          'title', 
          'date', 
          'time', 
          'venue',  // Venue name
          'address', // Street address
          'city',    // City
          'imageUrl'
        ]
        }]
      });
      
      if (!registration) {
        req.flash('error', 'Registration not found');
        return res.redirect('/events');
      }
      
      // Check authorization
      if (registration.userId !== req.session.user.userId) {
        req.flash('error', 'Unauthorized');
        return res.redirect('/events');
      }
      
      res.render('payments/success', {
        title: 'Payment Successful',
        registration,
        event: registration.event,
        user: req.session.user
      });
      
    } catch (error) {
      console.error('Success page error:', error);
      req.flash('error', 'Unable to load success page');
      res.redirect('/events');
    }
  },
  
  // Show processing page (for payments that are still processing)
  showProcessingPage: async (req, res) => {
    try {
      const { payment_intent } = req.query;
      
      if (!payment_intent) {
        return res.redirect('/events');
      }
      
      res.render('payments/processing', {
        title: 'Payment Processing',
        paymentIntentId: payment_intent,
        user: req.session.user
      });
    } catch (error) {
      console.error('Processing page error:', error);
      req.flash('error', 'Unable to load processing page');
      res.redirect('/events');
    }
  },
  
  // Confirm 3D Secure payment
  confirmPayment: async (req, res) => {
    try {
      const { paymentIntentId } = req.body;
      
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status === 'succeeded') {
        // Get metadata from payment intent
        const { eventId, userId, quantity } = paymentIntent.metadata;
        const event = await Event.findByPk(eventId);
        const amount = (paymentIntent.amount / 100).toFixed(2);
        
        // Check if registration already exists
        const existingRegistration = await Registration.findOne({
          where: {
            eventId: eventId,
            userId: userId,
            status: { [Op.notIn]: ['cancelled', 'refunded'] }
          }
        });
        
        if (existingRegistration) {
          return res.status(400).json({
            success: false,
            message: 'You are already registered for this event'
          });
        }
        
        // Create registration
        const registration = await Registration.create({
          eventId,
          userId,
          ticketQuantity: parseInt(quantity),
          totalAmount: amount,
          paymentMethod: 'credit_card',
          paymentId: paymentIntent.id,
          status: 'confirmed',
          paymentStatus: 'completed',
          bookingDate: new Date()
        });
        
        // Update available seats
        await event.decrement('availableSeats', { by: parseInt(quantity) });
        
        res.json({
          success: true,
          registrationId: registration.registrationId,
          redirectUrl: `/payments/success?registrationId=${registration.registrationId}`
        });
      } else {
        res.status(400).json({
          success: false,
          message: `Payment not completed. Status: ${paymentIntent.status}`
        });
      }
      
    } catch (error) {
      console.error('Payment confirmation error:', error);
      res.status(500).json({
        success: false,
        message: 'Payment confirmation failed'
      });
    }
  },
  
  // Check payment status (for processing payments)
  checkPaymentStatus: async (req, res) => {
    try {
      const { paymentIntentId } = req.query;
      
      if (!paymentIntentId) {
        return res.status(400).json({ success: false, message: 'Payment Intent ID required' });
      }
      
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status === 'succeeded') {
        // Get metadata and check if registration exists
        const { eventId, userId, quantity } = paymentIntent.metadata;
        
        // Look for existing registration
        const registration = await Registration.findOne({
          where: {
            eventId: eventId,
            userId: userId,
            paymentId: paymentIntent.id
          }
        });
        
        if (registration) {
          res.json({
            success: true,
            status: 'succeeded',
            redirectUrl: `/payments/success?registrationId=${registration.registrationId}`
          });
        } else {
          // Create registration if it doesn't exist
          const event = await Event.findByPk(eventId);
          const amount = (paymentIntent.amount / 100).toFixed(2);
          const newRegistration = await Registration.create({
            eventId,
            userId,
            ticketQuantity: parseInt(quantity),
            totalAmount: amount,
            paymentMethod: 'credit_card',
            paymentId: paymentIntent.id,
            status: 'confirmed',
            paymentStatus: 'completed',
            bookingDate: new Date()
          });
          
          res.json({
            success: true,
            status: 'succeeded',
            redirectUrl: `/payments/success?registrationId=${newRegistration.registrationId}`
          });
        }
      } else {
        res.json({
          success: true,
          status: paymentIntent.status,
          message: `Payment is still ${paymentIntent.status}`
        });
      }
    } catch (error) {
      console.error('Check payment status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check payment status'
      });
    }
  }
};