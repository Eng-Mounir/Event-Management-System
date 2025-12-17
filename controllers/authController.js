// const { User } = require('../models/associations');

// module.exports = {
//   // Show registration form
//   showRegister: (req, res) => {
//     res.render('auth/register', {
//       title: 'Register',
//       user: req.user
//     });
//   },

//   // Handle registration
//   register: async (req, res) => {
//     console.log('🔍 Registration attempt:', req.body);
//     try {
//       const { name, email, password, phone } = req.body;
      
//       // Check if user exists
//       const existingUser = await User.findOne({ where: { email } });
//       if (existingUser) {
//         req.flash('error', 'Email already registered');
//         return res.redirect('/auth/register');
//       }

//       // Create user
//       const user = await User.create({
//         name,
//         email,
//         password,
//         phone,
//         role: 'user'
//       });

//       req.flash('success', 'Registration successful! Please login.');
//       res.redirect('/auth/login');
//     } catch (error) {
//       console.error(error);
//       req.flash('error', 'Registration failed');
//       res.redirect('/auth/register');
//     }
//   },

//   // Show login form
//   showLogin: (req, res) => {
//     res.render('auth/login', {
//       title: 'Login',
//       user: req.user
//     });
//   },

//   // Handle login
//   login: async (req, res) => {
//     try {
//       const { email, password } = req.body;
      
//       // Find user
//       const user = await User.findOne({ where: { email } });
//       if (!user) {
//         req.flash('error', 'Invalid email or password');
//         return res.redirect('/auth/login');
//       }

//       // Check password
//       const isValid = await user.comparePassword(password);
//       if (!isValid) {
//         req.flash('error', 'Invalid email or password');
//         return res.redirect('/auth/login');
//       }

//       // Set session
//       req.session.user = {
//         userId: user.userId,
//         name: user.name,
//         email: user.email,
//         role: user.role
//       };

//       req.flash('success', 'Login successful!');
//       res.redirect('/');
//     } catch (error) {
//       console.error(error);
//       req.flash('error', 'Login failed');
//       res.redirect('/auth/login');
//     }
//   },

//   // Handle logout
//   logout: (req, res) => {
//     req.session.destroy((err) => {
//       if (err) {
//         console.error(err);
//       }
//       res.redirect('/');
//     });
//   },

//   // Show user profile
//   showProfile: async (req, res) => {
//     try {
//       const user = await User.findByPk(req.session.user.userId, {
//         attributes: { exclude: ['password'] }
//       });

//       res.render('auth/profile', {
//         title: 'My Profile',
//         user: user
//       });
//     } catch (error) {
//       console.error(error);
//       req.flash('error', 'Unable to load profile');
//       res.redirect('/');
//     }
//   }
// };



const { User, sequelize } = require('../models/associations');

module.exports = {
  // Show registration form
  showRegister: (req, res) => {
    res.render('auth/register', {
      title: 'Register - EventHub'
    });
  },

  // Handle registration
  register: async (req, res) => {
    console.log('🔍 Registration attempt:', req.body);
    
    try {
      const { name, email, password, phone, confirmPassword } = req.body;
      
      // Basic validation (remove once express-validator is added)
      if (!name || !email || !password || !confirmPassword) {
        req.flash('error', 'All fields are required');
        return res.redirect('/auth/register');
      }
      
      if (password !== confirmPassword) {
        req.flash('error', 'Passwords do not match');
        return res.redirect('/auth/register');
      }
      
      if (password.length < 6) {
        req.flash('error', 'Password must be at least 6 characters');
        return res.redirect('/auth/register');
      }
      
      // Check if user exists
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        req.flash('error', 'Email already registered');
        return res.redirect('/auth/register');
      }

      // Create user
      const user = await User.create({
        name,
        email,
        password,
        phone: phone || null,
        role: 'user'
      });

      console.log('✅ User created:', user.userId);
      req.flash('success', 'Registration successful! Please login.');
      res.redirect('/auth/login');
      
    } catch (error) {
      console.error('❌ Registration error:', error);
      req.flash('error', 'Registration failed: ' + error.message);
      res.redirect('/auth/register');
    }
  },

  // Show login form
  showLogin: (req, res) => {
    res.render('auth/login', {
      title: 'Login - EventHub'
    });
  },

  // Handle login - SIMPLIFIED FOR TESTING
  login: async (req, res) => {
    console.log('🔍 Login attempt:', req.body);
    console.log('📝 Session before login:', req.session.id);
    
    try {
      const { email, password } = req.body;
      
      // Basic validation
      if (!email || !password) {
        req.flash('error', 'Email and password are required');
        return res.redirect('/auth/login');
      }
      
      // Find user
      const user = await User.findOne({ where: { email } });
      console.log('👤 User found:', user ? 'YES' : 'NO');
      
      if (!user) {
        req.flash('error', 'Invalid email or password');
        return res.redirect('/auth/login');
      }

      // Check password
      const isValid = await user.comparePassword(password);
      console.log('🔑 Password valid:', isValid);
      
      if (!isValid) {
        req.flash('error', 'Invalid email or password');
        return res.redirect('/auth/login');
      }

      // ✅ Set session (THIS IS CRITICAL)
      req.session.user = {
        userId: user.userId,
        name: user.name,
        email: user.email,
        role: user.role
      };
      
      console.log('✅ Session user set:', req.session.user);
      console.log('📝 Full session:', req.session);

      // Save the session explicitly
      req.session.save((err) => {
        if (err) {
          console.error('❌ Session save error:', err);
          req.flash('error', 'Login failed');
          return res.redirect('/auth/login');
        }
        
        console.log('✅ Session saved successfully');
        req.flash('success', `Welcome back, ${user.name}!`);
        res.redirect('/');
      });
      
    } catch (error) {
      console.error('❌ Login error:', error);
      req.flash('error', 'Login failed: ' + error.message);
      res.redirect('/auth/login');
    }
  },

  // Handle logout
  logout: (req, res) => {
    console.log('🔍 Logout called');
    req.session.destroy((err) => {
      if (err) {
        console.error('❌ Session destroy error:', err);
      }
      res.redirect('/');
    });
  },

  // Show user profile
  showProfile: async (req, res) => {
    try {
      // Check if user is logged in
      if (!req.session.user) {
        req.flash('error', 'Please login to view profile');
        return res.redirect('/auth/login');
      }
      
      const user = await User.findByPk(req.session.user.userId, {
        attributes: { exclude: ['password'] }
      });

      if (!user) {
        req.flash('error', 'User not found');
        return res.redirect('/');
      }

      res.render('auth/profile', {
        title: 'My Profile - EventHub',
        user: user
      });
    } catch (error) {
      console.error(error);
      req.flash('error', 'Unable to load profile');
      res.redirect('/');
    }
  },
  
  // TEST: Create a test user
  createTestUser: async (req, res) => {
    try {
      const testUser = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        role: 'user'
      });
      
      res.send(`Test user created! ID: ${testUser.userId}<br>Email: test@example.com<br>Password: password123`);
    } catch (error) {
      res.send(`Error: ${error.message}`);
    }
  }
};