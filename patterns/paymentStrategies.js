// patterns/paymentStrategies.js - COMPLETE FIXED VERSION
const { Op } = require('sequelize');
const { Event, Registration, User } = require('../models/associations');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const checkoutNodeJssdk = require('@paypal/checkout-server-sdk');

// Import notification manager using your structure
const { NotificationManager } = require('../controllers/notificationController');

// Helper function for PayPal client
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
async function handleSuccessfulPayment(paymentData, event, quantity, amount, userId, paymentMethod = 'credit_card') {
  try {
    // Check if registration already exists
    const existingRegistration = await Registration.findOne({
      where: {
        eventId: event.eventId,
        userId: userId,
        status: { [Op.notIn]: ['cancelled', 'refunded'] }
      }
    });
    
    if (existingRegistration) {
      throw new Error('You are already registered for this event');
    }
    
    // Determine payment ID based on payment method
    let paymentId;
    if (paymentMethod === 'credit_card') {
      paymentId = paymentData.id; // Stripe Payment Intent ID
    } else if (paymentMethod === 'paypal') {
      paymentId = paymentData.purchase_units[0].payments.captures[0].id; // PayPal Capture ID
    } else {
      paymentId = paymentData.id || 'unknown';
    }
    
    // Create registration record
    const registration = await Registration.create({
      eventId: event.eventId,
      userId: userId,
      ticketQuantity: quantity,
      totalAmount: parseFloat(amount),
      paymentMethod: paymentMethod,
      paymentId: paymentId,
      status: 'confirmed',
      paymentStatus: 'completed',
      bookingDate: new Date(),
      paymentDetails: JSON.stringify(paymentData)
    });
    
    // Update available seats
    await event.decrement('availableSeats', { by: quantity });
    
    // Send notifications using your NotificationManager
    try {
      const user = await User.findByPk(userId);
      
      // Use the singleton instance
      const notificationManager = NotificationManager.getInstance();
      
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
      console.error('❌ Notification error (continuing anyway):', notifError.message);
    }
    
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

// ============ STRATEGY INTERFACE ============
class PaymentStrategy {
  async process(amount, details) {
    throw new Error('process() must be implemented by subclass');
  }
  
  async handleOrderCreation(amount, details) {
    throw new Error('handleOrderCreation() must be implemented by subclass');
  }
  
  async handlePaymentCapture(amount, details) {
    throw new Error('handlePaymentCapture() must be implemented by subclass');
  }
}

// ============ STRIPE CREDIT CARD STRATEGY ============
class StripeCreditCardStrategy extends PaymentStrategy {
  async process(amount, details) {
    console.log('🎯 [STRATEGY PATTERN] StripeCreditCardStrategy instantiated');
    const { eventId, quantity, paymentMethodId, email, name, userId } = details;
    
    const event = await Event.findByPk(eventId);
    if (!event) throw new Error('Event not found');
    if (event.availableSeats < quantity) throw new Error(`Only ${event.availableSeats} seats available`);
    
    const amountInCents = Math.round(parseFloat(amount) * 100);
    
    // Create Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'usd',
      payment_method: paymentMethodId,
      automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
      confirm: true,
      description: `Registration for ${event.title}`,
      metadata: { eventId: event.eventId, userId, quantity, userEmail: email, userName: name },
      receipt_email: email,
    });
    
    console.log('Payment Intent Status:', paymentIntent.status);
    
    // Handle different Payment Intent statuses
    if (paymentIntent.status === 'requires_action' || paymentIntent.status === 'requires_confirmation') {
      return {
        success: true,
        requiresAction: true,
        clientSecret: paymentIntent.client_secret,
        message: 'Authentication required'
      };
    } else if (paymentIntent.status === 'succeeded') {
      return await handleSuccessfulPayment(paymentIntent, event, parseInt(quantity), amount, userId, 'credit_card');
    } else if (paymentIntent.status === 'processing') {
      return {
        success: true,
        requiresAction: false,
        message: 'Payment is processing. You will receive a confirmation email shortly.',
        redirectUrl: `/payments/processing?payment_intent=${paymentIntent.id}`
      };
    } else {
      throw new Error(`Unexpected payment status: ${paymentIntent.status}`);
    }
  }
  
  async handleOrderCreation(amount, details) {
    throw new Error('Stripe does not use order creation pattern');
  }
  
  async handlePaymentCapture(amount, details) {
    throw new Error('Stripe does not use separate capture');
  }
}

// ============ PAYPAL STRATEGY ============
class PayPalStrategy extends PaymentStrategy {
  constructor() {
    super();
    console.log('🎯 [STRATEGY PATTERN] PayPalStrategy instantiated');
    this.client = getPayPalClient();
  }
  
  async process(amount, details) {
    // PayPal needs separate create and capture
    throw new Error('Use handleOrderCreation() and handlePaymentCapture() for PayPal');
  }
  
  async handleOrderCreation(amount, details) {
    const { eventId, quantity, userId } = details;
    
    console.log('=== PAYPAL CREATE ORDER ===');
    console.log('Event ID:', eventId);
    console.log('Quantity:', quantity);
    console.log('Amount:', amount);
    console.log('User ID:', userId);
    
    const event = await Event.findByPk(eventId);
    if (!event) throw new Error('Event not found');
    if (event.availableSeats < quantity) throw new Error(`Only ${event.availableSeats} seats available`);
    
    const request = new checkoutNodeJssdk.orders.OrdersCreateRequest();
    request.prefer("return=representation");
    
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: 'USD',
          value: parseFloat(amount).toFixed(2)
        },
        description: `Registration for ${event.title.substring(0, 120)}`,
        custom_id: `event_${eventId}_user_${userId}_qty_${quantity}`,
        invoice_id: `EVENT-${eventId}-${Date.now()}-${Math.random().toString(36).substring(7)}`
      }],
      application_context: {
        brand_name: 'EventHub',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'PAY_NOW'
      }
    });
    
    console.log('Sending PayPal order request...');
    const order = await this.client.execute(request);
    console.log('✅ PayPal order created:', order.result.id);
    
    return {
      success: true,
      id: order.result.id,
      status: order.result.status
    };
  }
  
  async handlePaymentCapture(amount, details) {
    const { orderId } = details;
    
    console.log('Capturing PayPal order:', orderId);
    const request = new checkoutNodeJssdk.orders.OrdersCaptureRequest(orderId);
    request.prefer("return=representation");
    
    console.log('Sending PayPal capture request...');
    const capture = await this.client.execute(request);
    console.log('PayPal capture result:', capture.result.status);
    
    if (capture.result.status === 'COMPLETED') {
      const customId = capture.result.purchase_units[0].custom_id;
      console.log('Custom ID from PayPal:', customId);
      
      const parts = customId.split('_');
      if (parts.length < 6) throw new Error('Invalid custom_id format from PayPal');
      
      const eventId = parts[1];
      const userId = parts[3];
      const quantity = parseInt(parts[5]);
      const amount = capture.result.purchase_units[0].amount.value;
      
      const event = await Event.findByPk(eventId);
      if (!event) throw new Error('Event not found');
      
      return await handleSuccessfulPayment(capture.result, event, quantity, amount, userId, 'paypal');
    } else {
      throw new Error(`Payment not completed. Status: ${capture.result.status}`);
    }
  }
}

// ============ PAYMENT FACTORY ============
class PaymentFactory {
  static createStrategy(provider) {
    console.log(`🎯 [STRATEGY PATTERN] PaymentFactory creating strategy for: ${provider.toUpperCase()}`);
    switch (provider.toLowerCase()) {
      case 'stripe':
        console.log('🎯 [STRATEGY PATTERN] Creating StripeCreditCardStrategy instance');
        return new StripeCreditCardStrategy();
      case 'paypal':
        console.log('🎯 [STRATEGY PATTERN] Creating PayPalStrategy instance');
        return new PayPalStrategy();
      default:
        throw new Error(`Unsupported payment provider: ${provider}`);
    }
  }
}

module.exports = {
  PaymentStrategy,
  StripeCreditCardStrategy,
  PayPalStrategy,
  PaymentFactory,
  handleSuccessfulPayment
};