// pattern/index.js
const { 
  PaymentStrategy, 
  StripeCreditCardStrategy, 
  PayPalStrategy, 
  PaymentFactory,
  PaymentContext,
  handleSuccessfulPayment 
} = require('./paymentStrategies');

module.exports = {
  PaymentStrategy,
  StripeCreditCardStrategy,
  PayPalStrategy,
  PaymentFactory,
  PaymentContext,
  handleSuccessfulPayment
};