const sequelize = require('../config/database');
const { User, Event, Registration, Wishlist, Review, Notification } = require('../models/associations');
const bcrypt = require('bcryptjs');

async function seedDatabase() {
  try {
    // Sync database
    await sequelize.sync({ force: true });
    console.log('Database synced');

    // Create users
    const users = await User.bulkCreate([
      {
        name: 'Admin User',
        email: 'admin@example.com',
        password: await bcrypt.hash('admin123', 10),
        role: 'admin'
      },
      {
        name: 'Event Organizer',
        email: 'organizer@example.com',
        password: await bcrypt.hash('organizer123', 10),
        role: 'organizer',
        phone: '123-456-7890'
      },
      {
        name: 'John Doe',
        email: 'john@example.com',
        password: await bcrypt.hash('password123', 10),
        role: 'user',
        phone: '987-654-3210'
      },
      {
        name: 'Jane Smith',
        email: 'jane@example.com',
        password: await bcrypt.hash('password123', 10),
        role: 'user'
      }
    ]);
    console.log('Users created');

    // Create events
    const now = new Date();
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    const events = await Event.bulkCreate([
      {
        title: 'Annual Tech Conference 2024',
        description: 'Join us for the biggest tech conference of the year featuring industry leaders and cutting-edge technology demonstrations.',
        category: 'conference',
        date: nextWeek,
        time: '09:00:00',
        venue: 'Convention Center',
        address: '123 Tech Street',
        city: 'San Francisco',
        capacity: 500,
        availableSeats: 450,
        price: 299.99,
        imageUrl: '/images/tech-conference.jpg',
        organizerId: users[1].userId,
        status: 'upcoming',
        registrationDeadline: new Date(nextWeek.setDate(nextWeek.getDate() - 1))
      },
      {
        title: 'Summer Music Festival',
        description: 'A three-day music festival featuring top artists across multiple genres. Food trucks and activities included.',
        category: 'festival',
        date: new Date(now.getFullYear(), 6, 15), // July 15
        time: '14:00:00',
        venue: 'Central Park',
        address: '456 Music Ave',
        city: 'New York',
        capacity: 5000,
        availableSeats: 3200,
        price: 149.99,
        imageUrl: '/images/music-festival.jpg',
        organizerId: users[1].userId,
        status: 'upcoming'
      },
      {
        title: 'Web Development Workshop',
        description: 'Hands-on workshop covering modern web development techniques including React, Node.js, and MongoDB.',
        category: 'workshop',
        date: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3),
        time: '10:00:00',
        venue: 'Tech Hub',
        address: '789 Code Blvd',
        city: 'Austin',
        capacity: 50,
        availableSeats: 25,
        price: 99.99,
        imageUrl: '/images/workshop.jpg',
        organizerId: users[1].userId,
        status: 'upcoming'
      },
      {
        title: 'Charity Marathon',
        description: 'Annual charity marathon supporting local homeless shelters. All proceeds go to charity.',
        category: 'sports',
        date: new Date(now.getFullYear(), 8, 10), // September 10
        time: '07:00:00',
        venue: 'City Stadium',
        address: '101 Sports Way',
        city: 'Chicago',
        capacity: 1000,
        availableSeats: 750,
        price: 49.99,
        imageUrl: '/images/marathon.jpg',
        organizerId: users[1].userId,
        status: 'upcoming'
      }
    ]);
    console.log('Events created');

    // Create registrations
    await Registration.bulkCreate([
      {
        eventId: events[0].eventId,
        userId: users[2].userId,
        ticketQuantity: 2,
        totalAmount: 599.98,
        status: 'confirmed',
        paymentStatus: 'completed'
      },
      {
        eventId: events[1].eventId,
        userId: users[2].userId,
        ticketQuantity: 1,
        totalAmount: 149.99,
        status: 'confirmed',
        paymentStatus: 'completed'
      },
      {
        eventId: events[2].eventId,
        userId: users[3].userId,
        ticketQuantity: 1,
        totalAmount: 99.99,
        status: 'confirmed',
        paymentStatus: 'completed'
      }
    ]);
    console.log('Registrations created');

    // Create wishlist items
    await Wishlist.bulkCreate([
      {
        userId: users[2].userId,
        eventId: events[3].eventId
      },
      {
        userId: users[3].userId,
        eventId: events[0].eventId
      }
    ]);
    console.log('Wishlist items created');

    // Create reviews
    await Review.bulkCreate([
      {
        eventId: events[0].eventId,
        userId: users[2].userId,
        rating: 5,
        comment: 'Amazing conference! Learned so much from the speakers.'
      },
      {
        eventId: events[0].eventId,
        userId: users[3].userId,
        rating: 4,
        comment: 'Great event, but the food could be better.'
      }
    ]);
    console.log('Reviews created');

    // Create notifications
    await Notification.bulkCreate([
      {
        userId: users[2].userId,
        title: 'Registration Confirmed',
        message: 'Your registration for Annual Tech Conference 2024 has been confirmed.',
        type: 'registration_confirmation',
        isRead: false
      },
      {
        userId: users[2].userId,
        title: 'Event Reminder',
        message: 'Reminder: Web Development Workshop is happening tomorrow!',
        type: 'event_reminder',
        isRead: true
      }
    ]);
    console.log('Notifications created');

    console.log('Database seeded successfully!');
    console.log('\nTest Credentials:');
    console.log('Admin: admin@example.com / admin123');
    console.log('Organizer: organizer@example.com / organizer123');
    console.log('User: john@example.com / password123');
    console.log('User: jane@example.com / password123');
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();