// const { body, validationResult } = require('express-validator');

// module.exports = {
//   // Event validation rules
//   validateEvent: [
//     body('title')
//       .notEmpty().withMessage('Title is required')
//       .isLength({ min: 5, max: 100 }).withMessage('Title must be 5-100 characters'),
    
//     body('description')
//       .notEmpty().withMessage('Description is required')
//       .isLength({ min: 20 }).withMessage('Description must be at least 20 characters'),
    
//     body('category')
//       .isIn(['concert', 'conference', 'workshop', 'sports', 'festival', 'exhibition'])
//       .withMessage('Invalid category'),
    
//     body('date')
//       .isISO8601().withMessage('Invalid date format')
//       .custom((value) => {
//         const eventDate = new Date(value);
//         const today = new Date();
//         today.setHours(0, 0, 0, 0);
//         return eventDate >= today;
//       }).withMessage('Event date must be in the future'),
    
//     body('capacity')
//       .isInt({ min: 1 }).withMessage('Capacity must be at least 1'),
    
//     body('price')
//       .isDecimal({ min: 0 }).withMessage('Price must be a positive number')
//   ],

//   // User registration validation
//   validateRegistration: [
//     body('name')
//       .notEmpty().withMessage('Name is required')
//       .isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
    
//     body('email')
//       .isEmail().withMessage('Invalid email address')
//       .normalizeEmail(),
    
//     body('password')
//       .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
//       .matches(/\d/).withMessage('Password must contain a number'),
    
//     body('confirmPassword')
//       .custom((value, { req }) => value === req.body.password)
//       .withMessage('Passwords do not match')
//   ],

//   // Login validation
//   validateLogin: [
//     body('email')
//       .isEmail().withMessage('Invalid email address')
//       .normalizeEmail(),
    
//     body('password')
//       .notEmpty().withMessage('Password is required')
//   ],

//   // Review validation
//   validateReview: [
//     body('rating')
//       .isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1-5'),
    
//     body('comment')
//       .optional()
//       .isLength({ max: 500 }).withMessage('Comment cannot exceed 500 characters')
//   ],

//   // Handle validation errors
//   handleValidationErrors: (req, res, next) => {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       req.flash('error', errors.array().map(err => err.msg));
//       return res.redirect(req.get('Referrer') || '/');
//     }
//     next();
//   }
// };



// For now, use simple validation. Install express-validator later.
const { validationResult } = require('express-validator');

module.exports = {
  // Simple validation for registration
  validateRegistration: (req, res, next) => {
    const errors = [];
    const { name, email, password, confirmPassword } = req.body;
    
    if (!name || name.trim().length < 2) {
      errors.push('Name must be at least 2 characters');
    }
    
    if (!email || !email.includes('@')) {
      errors.push('Valid email is required');
    }
    
    if (!password || password.length < 6) {
      errors.push('Password must be at least 6 characters');
    }
    
    if (password !== confirmPassword) {
      errors.push('Passwords do not match');
    }
    
    if (errors.length > 0) {
      errors.forEach(error => req.flash('error', error));
      return res.redirect('/auth/register');
    }
    
    next();
  },
  
  // Simple validation for login
  validateLogin: (req, res, next) => {
    const errors = [];
    const { email, password } = req.body;
    
    if (!email || !email.includes('@')) {
      errors.push('Valid email is required');
    }
    
    if (!password || password.length < 1) {
      errors.push('Password is required');
    }
    
    if (errors.length > 0) {
      errors.forEach(error => req.flash('error', error));
      return res.redirect('/auth/login');
    }
    
    next();
  },
  
  // Handle validation errors
  handleValidationErrors: (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      errors.array().forEach(error => {
        req.flash('error', error.msg);
      });
      return res.redirect('back');
    }
    next();
  }
};


// Add these functions to your existing validation.js file:

  // Simple validation for event creation
  validateEvent: (req, res, next) => {
    const errors = [];
    const { title, description, category, date, capacity, price } = req.body;
    
    if (!title || title.trim().length < 5) {
      errors.push('Title must be at least 5 characters');
    }
    
    if (!description || description.trim().length < 20) {
      errors.push('Description must be at least 20 characters');
    }
    
    const validCategories = ['concert', 'conference', 'workshop', 'sports', 'festival', 'exhibition'];
    if (!category || !validCategories.includes(category)) {
      errors.push('Invalid category selected');
    }
    
    if (!date || isNaN(new Date(date).getTime())) {
      errors.push('Valid date is required');
    }
    
    if (!capacity || capacity < 1) {
      errors.push('Capacity must be at least 1');
    }
    
    if (!price || price < 0) {
      errors.push('Price must be a positive number');
    }
    
    if (errors.length > 0) {
      errors.forEach(error => req.flash('error', error));
      return res.redirect('back');
    }
    
    next();
  },
module.exports = {
  // Simple validation for registration
  validateRegistration: (req, res, next) => {
    const errors = [];
    const { name, email, password, confirmPassword } = req.body;
    
    if (!name || name.trim().length < 2) {
      errors.push('Name must be at least 2 characters');
    }
    
    if (!email || !email.includes('@')) {
      errors.push('Valid email is required');
    }
    
    if (!password || password.length < 6) {
      errors.push('Password must be at least 6 characters');
    }
    
    if (password !== confirmPassword) {
      errors.push('Passwords do not match');
    }
    
    if (errors.length > 0) {
      errors.forEach(error => req.flash('error', error));
      return res.redirect('/auth/register');
    }
    
    next();
  },
  
  // Simple validation for login
  validateLogin: (req, res, next) => {
    const errors = [];
    const { email, password } = req.body;
    
    if (!email || !email.includes('@')) {
      errors.push('Valid email is required');
    }
    
    if (!password || password.length < 1) {
      errors.push('Password is required');
    }
    
    if (errors.length > 0) {
      errors.forEach(error => req.flash('error', error));
      return res.redirect('/auth/login');
    }
    
    next();
  },
  
  // Handle validation errors
  handleValidationErrors: (req, res, next) => {
    const { validationResult } = require('express-validator');
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      errors.array().forEach(error => {
        req.flash('error', error.msg);
      });
      return res.redirect('back');
    }
    next();
  },
  
  // Simple validation for event creation
  validateEvent: (req, res, next) => {
    const errors = [];
    const { title, description, category, date, capacity, price } = req.body;
    
    if (!title || title.trim().length < 5) {
      errors.push('Title must be at least 5 characters');
    }
    
    if (!description || description.trim().length < 20) {
      errors.push('Description must be at least 20 characters');
    }
    
    const validCategories = ['concert', 'conference', 'workshop', 'sports', 'festival', 'exhibition'];
    if (!category || !validCategories.includes(category)) {
      errors.push('Invalid category selected');
    }
    
    if (!date || isNaN(new Date(date).getTime())) {
      errors.push('Valid date is required');
    }
    
    if (!capacity || capacity < 1) {
      errors.push('Capacity must be at least 1');
    }
    
    if (!price || price < 0) {
      errors.push('Price must be a positive number');
    }
    
    if (errors.length > 0) {
      errors.forEach(error => req.flash('error', error));
      return res.redirect('back');
    }
    
    next();
  },

  // Simple validation for reviews
  validateReview: (req, res, next) => {
    const errors = [];
    const { rating, comment } = req.body;
    
    if (!rating || rating < 1 || rating > 5) {
      errors.push('Rating must be between 1-5');
    }
    
    if (comment && comment.length > 500) {
      errors.push('Comment cannot exceed 500 characters');
    }
    
    if (errors.length > 0) {
      errors.forEach(error => req.flash('error', error));
      return res.redirect('back');
    }
    
    next();
  }
};