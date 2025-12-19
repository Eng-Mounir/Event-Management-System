// controllers/paymentController.js - WITH FIXED IMPORTS
const { Op } = require('sequelize');
const { Event, Registration, User } = require('../models/associations');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { PaymentFactory } = require('../patterns/paymentStrategies'); // FIXED: patterns not pattern

// PayPal SDK
const checkoutNodeJssdk = require('@paypal/checkout-server-sdk');

function getPayPalClient() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    throw new Error('PayPal credentials not found in environment variables');
  }
  
  console.log('PayPal Client ID starts with:', clientId.substring(0, 10));
  
  const environment = new checkoutNodeJssdk.core.SandboxEnvironment(clientId, clientSecret);
  return new checkoutNodeJssdk.core.PayPalHttpClient(environment);
}

// Helper function for successful payments
async function handleSuccessfulPayment(paymentData, req, res, event, quantity, amount, paymentMethod = 'credit_card') {
  try {
    const userId = req.session.user.userId;
    
    // Check if registration already exists
    const existingRegistration = await Registration.findOne({
      where: {
        eventId: event.eventId,
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
    
    // Create registration record
    const registration = await Registration.create({
      eventId: event.eventId,
      userId: userId,
      ticketQuantity: quantity,
      totalAmount: parseFloat(amount),
      paymentMethod: paymentMethod,
      paymentId: paymentMethod === 'credit_card' ? paymentData.id : paymentData.purchase_units[0].payments.captures[0].id,
      status: 'confirmed',
      paymentStatus: 'completed',
      bookingDate: new Date(),
      paymentDetails: JSON.stringify(paymentData)
    });
    
    // Update available seats
    await event.decrement('availableSeats', { by: quantity });
    
    // Send notifications
    try {
      const { NotificationManager } = require('./notificationController');
      const notificationManager = NotificationManager.getInstance();
      const user = await User.findByPk(userId);
      
      // Send registration confirmation notification
      await notificationManager.notify('REGISTRATION_CONFIRMED', {
        userId: userId,
        userEmail: user.email,
        eventTitle: event.title,
        eventDate: event.date.toLocaleDateString(),
        eventTime: event.time,
        eventVenue: event.venue,
        ticketQuantity: quantity,
        totalAmount: amount,
        registrationId: registration.registrationId
      });
      
      // Send payment success notification
      await notificationManager.notify('PAYMENT_SUCCESS', {
        userId: userId,
        userEmail: user.email,
        eventTitle: event.title,
        amount: amount,
        transactionId: registration.paymentId,
        registrationId: registration.registrationId
      });
      
      console.log('✅ Payment notifications sent successfully');
      
    } catch (notifError) {
      console.error('❌ Notification error:', notifError);
    }
    
    // Return success response
    return {
      success: true,
      requiresAction: false,
      registrationId: registration.registrationId,
      redirectUrl: `/payments/success?registrationId=${registration.registrationId}`,
      message: 'Payment successful! Check your email for confirmation.'
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
        stripePublicKey: process.env.STRIPE_PUBLIC_KEY,
        paypalClientId: process.env.PAYPAL_CLIENT_ID
      });
    } catch (error) {
      console.error('Checkout page error:', error);
      req.flash('error', 'Unable to load checkout page');
      res.redirect('/events');
    }
  },

  // Process Stripe payment (original function - keep for backward compatibility)
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
        res.json({
          success: true,
          requiresAction: true,
          clientSecret: paymentIntent.client_secret,
          message: 'Authentication required'
        });
      } else if (paymentIntent.status === 'succeeded') {
        const result = await handleSuccessfulPayment(paymentIntent, req, res, event, quantity, amount);
        res.json(result);
      } else if (paymentIntent.status === 'processing') {
        res.json({
          success: true,
          requiresAction: false,
          message: 'Payment is processing. You will receive a confirmation email shortly.',
          redirectUrl: `/payments/processing?payment_intent=${paymentIntent.id}`
        });
      } else {
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
  
  // PayPal create order (original function)
  createPayPalOrder: async (req, res) => {
    try {
      const { eventId, quantity, amount } = req.body;
      console.log('Creating PayPal order for event:', eventId, 'amount:', amount);
      
      const event = await Event.findByPk(eventId);
      
      if (!event) {
        return res.status(404).json({ success: false, message: 'Event not found' });
      }
      
      if (event.availableSeats < quantity) {
        return res.status(400).json({ 
          success: false, 
          message: `Only ${event.availableSeats} seats available` 
        });
      }
      
      // Get PayPal client
      const client = getPayPalClient();
      
      // Create order request
      const request = new checkoutNodeJssdk.orders.OrdersCreateRequest();
      request.prefer("return=representation");
      request.requestBody({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: 'USD',
            value: amount
          },
          description: `Registration for ${event.title}`,
          custom_id: `event_${eventId}_user_${req.session.user.userId}_quantity_${quantity}`,
          invoice_id: `EVENT-${eventId}-${Date.now()}`
        }]
      });
      
      console.log('Sending PayPal order request...');
      const order = await client.execute(request);
      console.log('PayPal order created:', order.result.id);
      
      res.json({
        success: true,
        id: order.result.id,
        status: order.result.status
      });
      
    } catch (error) {
      console.error('PayPal create order error:', error.message);
      console.error('Error stack:', error.stack);
      res.status(500).json({
        success: false,
        message: 'Failed to create PayPal order: ' + error.message
      });
    }
  },

  capturePayPalOrder: async (req, res) => {
    try {
      const { orderId } = req.params;
      console.log('Capturing PayPal order:', orderId);
      
      // Get PayPal client
      const client = getPayPalClient();
      
      const request = new checkoutNodeJssdk.orders.OrdersCaptureRequest(orderId);
      request.prefer("return=representation");
      
      console.log('Sending PayPal capture request...');
      const capture = await client.execute(request);
      console.log('PayPal capture result:', capture.result.status);
      
      if (capture.result.status === 'COMPLETED') {
        // Extract details from custom_id
        const customId = capture.result.purchase_units[0].custom_id;
        console.log('Custom ID from PayPal:', customId);
        
        // Parse: event_{eventId}_user_{userId}_quantity_{quantity}
        const parts = customId.split('_');
        if (parts.length < 6) {
          throw new Error('Invalid custom_id format from PayPal');
        }
        
        const eventId = parts[1];
        const userId = parts[3];
        const quantity = parts[5];
        
        const event = await Event.findByPk(eventId);
        if (!event) {
          throw new Error('Event not found');
        }
        
        const amount = capture.result.purchase_units[0].amount.value;
        
        // Call your existing handleSuccessfulPayment function
        const result = await handleSuccessfulPayment(
          capture.result, 
          req, 
          res, 
          event, 
          parseInt(quantity), 
          amount,
          'paypal'
        );
        
        res.json(result);
      } else {
        res.status(400).json({
          success: false,
          message: `Payment not completed. Status: ${capture.result.status}`
        });
      }
      
    } catch (error) {
      console.error('PayPal capture error:', error.message);
      console.error('Error stack:', error.stack);
      res.status(500).json({
        success: false,
        message: 'Failed to capture PayPal payment: ' + error.message
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
          attributes: ['title', 'date', 'time', 'venue', 'address', 'city', 'imageUrl']
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
  
  // Show processing page
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
        const { eventId, userId, quantity, userEmail, userName } = paymentIntent.metadata;
        const event = await Event.findByPk(eventId);
        const amount = (paymentIntent.amount / 100).toFixed(2);
        
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
        
        await event.decrement('availableSeats', { by: parseInt(quantity) });
        
        try {
          const { NotificationManager } = require('./notificationController');
          const notificationManager = NotificationManager.getInstance();
          
          await notificationManager.notify('REGISTRATION_CONFIRMED', {
            userId: userId,
            userEmail: userEmail,
            eventTitle: event.title,
            eventDate: event.date.toLocaleDateString(),
            eventTime: event.time,
            eventVenue: event.venue,
            ticketQuantity: quantity,
            totalAmount: amount,
            registrationId: registration.registrationId
          });
          
          await notificationManager.notify('PAYMENT_SUCCESS', {
            userId: userId,
            userEmail: userEmail,
            eventTitle: event.title,
            amount: amount,
            transactionId: paymentIntent.id,
            registrationId: registration.registrationId
          });
          
          console.log('✅ 3D Secure payment notifications sent');
          
        } catch (notifError) {
          console.error('❌ Notification error:', notifError);
        }
        
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
  
  // Check payment status
  checkPaymentStatus: async (req, res) => {
    try {
      const { paymentIntentId } = req.query;
      
      if (!paymentIntentId) {
        return res.status(400).json({ success: false, message: 'Payment Intent ID required' });
      }
      
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status === 'succeeded') {
        const { eventId, userId, quantity } = paymentIntent.metadata;
        
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
  },
  
  // ============ STRATEGY PATTERN METHODS ============
  
  // In paymentController.js - Updated processPayment method
   processPayment: async (req, res) => {
  try {
    const { provider, amount, ...details } = req.body;
    
    console.log('🎯 [STRATEGY PATTERN] ===== processPayment called =====');
    console.log('🎯 [STRATEGY PATTERN] Provider:', provider);
    console.log('🎯 [STRATEGY PATTERN] Amount:', amount);
    console.log('🎯 [STRATEGY PATTERN] Details:', details);
    
    if (!provider || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Provider and amount are required'
      });
    }
    
    // Use factory to create strategy
    console.log('🎯 [STRATEGY PATTERN] Calling PaymentFactory.createStrategy()');
    const strategy = PaymentFactory.createStrategy(provider);
    console.log('🎯 [STRATEGY PATTERN] Strategy created:', strategy.constructor.name);
    
    // Add user ID to details
    details.userId = req.session.user.userId;
    
    console.log('🎯 [STRATEGY PATTERN] Executing strategy.process()');
    const startTime = Date.now();
    const result = await strategy.process(amount, details);
    const endTime = Date.now();
    
    console.log(`🎯 [STRATEGY PATTERN] Strategy execution took: ${endTime - startTime}ms`);
    console.log('🎯 [STRATEGY PATTERN] Result:', result.success ? 'SUCCESS' : 'FAILED');
    
    res.json(result);
    
  } catch (error) {
    console.error('🎯 [STRATEGY PATTERN] Payment processing error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Payment failed: ' + error.message
    });
  }
},

// Also update createOrder and capturePayment methods with similar logs
createOrder: async (req, res) => {
  try {
    const { provider, amount, ...details } = req.body;
    
    console.log('🎯 [STRATEGY PATTERN] ===== createOrder called =====');
    console.log('🎯 [STRATEGY PATTERN] Provider:', provider);
    
    if (!provider || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Provider and amount are required'
      });
    }
    
    console.log('🎯 [STRATEGY PATTERN] Calling PaymentFactory.createStrategy()');
    const strategy = PaymentFactory.createStrategy(provider);
    console.log('🎯 [STRATEGY PATTERN] Strategy created:', strategy.constructor.name);
    
    details.userId = req.session.user.userId;
    
    console.log('🎯 [STRATEGY PATTERN] Executing strategy.handleOrderCreation()');
    const result = await strategy.handleOrderCreation(amount, details);
    console.log('🎯 [STRATEGY PATTERN] Order created with ID:', result.id);
    
    res.json(result);
    
  } catch (error) {
    console.error('🎯 [STRATEGY PATTERN] Order creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Order creation failed: ' + error.message
    });
  }
},

capturePayment: async (req, res) => {
  try {
    const { provider, amount, orderId } = req.body; // ✅ CHANGED: orderId from body, not params
    
    console.log('🎯 [STRATEGY PATTERN] ===== capturePayment called =====');
    console.log('🎯 [STRATEGY PATTERN] Provider:', provider);
    console.log('🎯 [STRATEGY PATTERN] Order ID:', orderId);
    
    if (!provider || !amount || !orderId) {
      return res.status(400).json({
        success: false,
        message: 'Provider, amount, and orderId are required'
      });
    }
    
    console.log('🎯 [STRATEGY PATTERN] Calling PaymentFactory.createStrategy()');
    const strategy = PaymentFactory.createStrategy(provider);
    console.log('🎯 [STRATEGY PATTERN] Strategy created:', strategy.constructor.name);
    
    const details = {
      orderId: orderId,
      userId: req.session.user.userId
    };
    
    console.log('🎯 [STRATEGY PATTERN] Executing strategy.handlePaymentCapture()');
    const result = await strategy.handlePaymentCapture(amount, details);
    console.log('🎯 [STRATEGY PATTERN] Payment captured successfully');
    
    res.json(result);
    
  } catch (error) {
    console.error('🎯 [STRATEGY PATTERN] Payment capture error:', error);
    res.status(500).json({
      success: false,
      message: 'Payment capture failed: ' + error.message
    });
  }
}};