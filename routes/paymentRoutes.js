// const express = require('express');
// const router = express.Router();
// const paymentController = require('../controllers/paymentController');
// const { isAuthenticated } = require('../middleware/auth');

// // Stripe payment routes
// router.post('/stripe/process-payment-intent', isAuthenticated, paymentController.processStripePayment);
// router.post('/stripe/confirm-payment', isAuthenticated, paymentController.confirmStripePayment);
// router.post('/webhook/stripe', express.raw({ type: 'application/json' }), paymentController.handleWebhook);

// // PayPal routes
// router.post('/paypal/create-order', isAuthenticated, paymentController.createPayPalOrder);
// router.get('/paypal/capture', isAuthenticated, paymentController.capturePayPalPayment);

// // Other routes
// router.get('/checkout', isAuthenticated, paymentController.showPaymentPage);
// // Redirect registration to payment checkout
// router.get('/:eventId/register', isAuthenticated, registrationController.showRegistrationForm);

// // Only for free events (optional)
// router.post('/:eventId/register', isAuthenticated, registrationController.processRegistration);

// // User's registrations
// router.get('/users/registrations', isAuthenticated, registrationController.showUserRegistrations);
// router.get('/users/registrations/:registrationId', isAuthenticated, registrationController.showRegistration);
// module.exports = router;
const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { isAuthenticated } = require('../middleware/auth');

// Show checkout page
router.get('/checkout', isAuthenticated, paymentController.showCheckoutPage);
// Unified payment routes (Strategy Pattern)
router.post('/process', isAuthenticated, paymentController.processPayment);
router.post('/create-order', isAuthenticated, paymentController.createOrder);
router.post('/capture', isAuthenticated, paymentController.capturePayment);

// Stripe payment routes
router.post('/stripe/process-payment-intent', isAuthenticated, paymentController.processStripePayment);
router.post('/stripe/confirm-payment', isAuthenticated, paymentController.confirmPayment);

// PayPal payment routes (NEW)
router.post('/paypal/create-order', isAuthenticated, paymentController.createPayPalOrder);
router.post('/paypal/capture-order/:orderId', isAuthenticated, paymentController.capturePayPalOrder);

// Success and status routes
router.get('/success', isAuthenticated, paymentController.showSuccessPage);
router.get('/processing', isAuthenticated, paymentController.showProcessingPage);
router.get('/check-payment-status', isAuthenticated, paymentController.checkPaymentStatus);

module.exports = router;