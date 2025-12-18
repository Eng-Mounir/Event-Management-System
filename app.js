// const express = require('express');
// const path = require('path');
// const session = require('express-session');
// const flash = require('connect-flash');
// const methodOverride = require('method-override');
// require('dotenv').config();

// // Import database and models
// const sequelize = require('./config/database');
// require('./models/associations');

// // Import routes
// const authRoutes = require('./routes/authRoutes');
// const eventRoutes = require('./routes/eventRoutes');
// const registrationRoutes = require('./routes/registrationRoutes');
// const wishlistRoutes = require('./routes/wishlistRoutes');
// const reviewRoutes = require('./routes/reviewRoutes');
// const notificationRoutes = require('./routes/notificationRoutes');

// // Import controllers
// const { NotificationManager } = require('./controllers/notificationController');

// const app = express();

// // View engine setup
// app.set('view engine', 'ejs');
// app.set('views', path.join(__dirname, 'views'));

// // Middleware
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
// app.use(express.static(path.join(__dirname, 'public')));
// app.use(methodOverride('_method'));

// // Session configuration
// app.use(session({
//   secret: process.env.SESSION_SECRET || 'your-secret-key',
//   resave: false,
//   saveUninitialized: false,
//   cookie: {
//     maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
//     secure: process.env.NODE_ENV === 'production'
//   }
// }));

// // Flash messages
// app.use(flash());

// // Make user available in all views
// app.use((req, res, next) => {
//   res.locals.user = req.session.user || null;
//   res.locals.success = req.flash('success');
//   res.locals.error = req.flash('error');
//   next();
// });

// // Routes
// app.use('/auth', authRoutes);
// app.use('/events', eventRoutes);
// app.use('/', registrationRoutes);
// app.use('/', wishlistRoutes);
// app.use('/', reviewRoutes);
// app.use('/', notificationRoutes);

// // Home route
// app.get('/', async (req, res) => {
//   try {
//     const { Event } = require('./models/associations');
//     const featuredEvents = await Event.findAll({
//       where: {
//         status: 'upcoming',
//         date: { [require('sequelize').Op.gte]: new Date() }
//       },
//       order: [['date', 'ASC']],
//       limit: 6
//     });

//     res.render('index', {
//       title: 'Home',
//       path: '/',
//       user: req.session.user,
//       featuredEvents
//     });
//   } catch (error) {
//     console.error(error);
//     res.render('index', {
//       title: 'Home',
//       path: '/',
//       user: req.session.user,
//       featuredEvents: []
//     });
//   }
// });

// // 404 handler
// app.use((req, res) => {
//   res.status(404).render('404', {
//     title: 'Page Not Found',
//     path: req.url,
//     user: req.session.user
//   });
// });

// // Error handler
// app.use((err, req, res, next) => {
//   console.error(err.stack);
//   res.status(500).render('500', {
//     title: 'Server Error',
//     path: req.url,
//     user: req.session.user
//   });
// });

// // Initialize Notification Manager (Singleton)
// const notificationManager = NotificationManager.getInstance();

// // Sync database and start server
// const PORT = process.env.PORT || 3000;

// sequelize.sync({ force: false })
//   .then(() => {
//     console.log('Database synchronized');
    
//     app.listen(PORT, () => {
//       console.log(`Server running on http://localhost:${PORT}`);
//       console.log('Available features:');
//       console.log('1. Event Registration & Attendee Profiles');
//       console.log('2. Event Catalog & Search with filters');
//       console.log('3. Ticket Booking & Payment Simulation');
//       console.log('4. Event Wishlist');
//       console.log('5. Event Reviews & Ratings');
//       console.log('6. Notification Center with Observer Pattern');
//       console.log('\nArchitectural Patterns Implemented:');
//       console.log('- MVC Pattern (Controllers, Models, Views)');
//       console.log('- Singleton Pattern (Notification Manager)');
//       console.log('- Observer Pattern (Notification System)');
//       console.log('- Repository Pattern (Sequelize Models)');
//       console.log('- Factory Method Pattern (Notification Creation)');
//         console.log(`📋 Test pages:`);
//   console.log(`   • Home: http://localhost:${PORT}/`);
//   console.log(`   • Login: http://localhost:${PORT}/auth/login`);
//   console.log(`   • Register: http://localhost:${PORT}/auth/register`);
//   console.log(`   • Session Test: http://localhost:${PORT}/test-session`);
//     });
//   })
//   .catch(err => {
//     console.error('Unable to connect to database:', err);
//   });

// module.exports = app;

const express = require('express');
const path = require('path');
const session = require('express-session');
const flash = require('connect-flash');
const methodOverride = require('method-override');
require('dotenv').config();

// Import database and models
const sequelize = require('./config/database');
require('./models/associations');

// Import middleware
const auth = require('./middleware/auth'); // ADD THIS LINE

// Import routes
const authRoutes = require('./routes/authRoutes');
const eventRoutes = require('./routes/eventRoutes');
const registrationRoutes = require('./routes/registrationRoutes');
const wishlistRoutes = require('./routes/wishlistRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
// Import notification manager
const { NotificationManager } = require('./controllers/notificationController');

const app = express();

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(methodOverride('_method'));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
    secure: process.env.NODE_ENV === 'production'
  }
}));

// Flash messages
app.use(flash());

// Middleware for global variables - FIXED
app.use((req, res, next) => {
  // Set user session
  res.locals.user = req.session.user || null;
  res.locals.path = req.path;
  
  // Set active variable based on current route
  res.locals.active = '';
  
  // Get flash messages
  const successMsgs = req.flash('success');
  const errorMsgs = req.flash('error');
  
  // Initialize as null
  res.locals.success = null;
  res.locals.error = null;
  
  // Only set if there are actual messages (FIXED HERE)
  if (successMsgs && successMsgs.length > 0) {
    res.locals.success = successMsgs[0]; // Get first message
  }
    if (errorMsgs && errorMsgs.length > 0) {
    res.locals.error = errorMsgs[0]; // Get first message
  }
  
  next();
});

// Routes
app.use('/auth', authRoutes);
app.use('/events', eventRoutes);
app.use('/', dashboardRoutes);
app.use('/', registrationRoutes);
app.use('/', wishlistRoutes);
app.use('/', reviewRoutes);
app.use('/', notificationRoutes);
app.use('/', ticketRoutes);
app.use('/payments', paymentRoutes);

// Home route
app.get('/', async (req, res) => {
  try {
    const { Event } = require('./models/associations');
    const { Op } = require('sequelize');
    
    const featuredEvents = await Event.findAll({
      where: {
        status: 'upcoming',
        date: { [Op.gte]: new Date() }
      },
      order: [['date', 'ASC']],
      limit: 6
    });

    res.render('index', {
      title: 'Home',
      active: 'home',
      user: req.session.user,
      featuredEvents
    });
  } catch (error) {
    console.error(error);
    res.render('index', {
      title: 'Home',
      active: 'home',
      user: req.session.user,
      featuredEvents: []
    });
  }
});

// Test route to check if sessions work
app.get('/test-session', (req, res) => {
  if (!req.session.visitCount) {
    req.session.visitCount = 1;
  } else {
    req.session.visitCount++;
  }
  
  res.send(`
    <h1>Session Test</h1>
    <p>Visit count: ${req.session.visitCount}</p>
    <p>User logged in: ${req.session.user ? 'YES' : 'NO'}</p>
    <p>User data: ${JSON.stringify(req.session.user)}</p>
    <a href="/">Go Home</a>
  `);
});




// Test login route (for testing without database)
app.get('/test-login', (req, res) => {
  // Create a test user session
  req.session.user = {
    userId: 1,
    name: 'Test User',
    email: 'test@example.com',
    role: 'organizer'  // Change to 'organizer' to test event creation
  };
  
  req.flash('success', 'Test login successful!');
  res.redirect('/dashboard');
});

// Test organizer route
app.get('/test-organizer', auth.isAuthenticated, (req, res) => {
  res.send(`
    <h1>Organizer Test</h1>
    <p>User: ${JSON.stringify(req.session.user)}</p>
    <p>Role: ${req.session.user.role}</p>
    <a href="/events/create">Try Create Event</a>
  `);
});

// Debug route to see session data
app.get('/debug', (req, res) => {
  res.json({
    sessionId: req.session.id,
    sessionData: req.session,
    user: req.session.user,
    cookies: req.headers.cookie
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('404', {
    title: 'Page Not Found',
    path: req.url,
    user: req.session.user
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('500', {
    title: 'Server Error',
    path: req.url,
    user: req.session.user
  });
});

// Initialize Notification Manager (Singleton)
const notificationManager = NotificationManager.getInstance();

// Sync database and start server
const PORT = process.env.PORT || 3000;

sequelize.sync({ force: false })
  .then(() => {
    console.log('Database synchronized');
    
    app.listen(PORT, () => {
      console.log(`✅ Server running on http://localhost:${PORT}`);
      console.log('\n📋 ALL AVAILABLE PAGES:');
      console.log(`   • Home: http://localhost:${PORT}/`);
      console.log(`   • Login: http://localhost:${PORT}/auth/login`);
      console.log(`   • Register: http://localhost:${PORT}/auth/register`);
      console.log(`   • Events: http://localhost:${PORT}/events`);
      console.log(`   • Dashboard: http://localhost:${PORT}/dashboard`);
      console.log(`   • Create Event: http://localhost:${PORT}/events/create`);
      console.log(`   • Test Login: http://localhost:${PORT}/test-login`);
      console.log(`   • Test Organizer: http://localhost:${PORT}/test-organizer`);
      console.log(`   • Debug: http://localhost:${PORT}/debug`);
      console.log('\n🎯 TESTING INSTRUCTIONS:');
      console.log('1. First go to: http://localhost:3000/test-login');
      console.log('2. Then visit: http://localhost:3000/dashboard');
      console.log('3. To create event: http://localhost:3000/events/create');
      console.log('4. To browse events: http://localhost:3000/events');
    });
  })
  .catch(err => {
    console.error('❌ Unable to connect to database:', err);
    console.log('💡 Starting server with basic features only...');
    
    // Fallback start
    app.listen(PORT, () => {
      console.log(`⚠️ Server running with limited features on http://localhost:${PORT}`);
    });
  });

module.exports = app;