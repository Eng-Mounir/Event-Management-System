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

// Process Stripe payment
router.post('/stripe/process-payment-intent', isAuthenticated, paymentController.processStripePayment);

// Confirm 3D Secure payment
router.post('/stripe/confirm-payment', isAuthenticated, paymentController.confirmPayment);

// Show success page
router.get('/success', isAuthenticated, paymentController.showSuccessPage);
// In your paymentRoutes.js
router.get('/processing', isAuthenticated, paymentController.showProcessingPage);
router.get('/check-payment-status', isAuthenticated, paymentController.checkPaymentStatus);
module.exports = router;