//Observer Pattern
const { Notification, Event, Registration, User } = require('../models/associations');
const { Op } = require('sequelize');
const nodemailer = require('nodemailer');
// Observer Pattern Implementation
class NotificationObserver {
  constructor() {
    this.observers = [];
  }

  subscribe(observer) {
    this.observers.push(observer);
  }

  unsubscribe(observer) {
    this.observers = this.observers.filter(obs => obs !== observer);
  }

  async notify(eventType, data) {
    for (const observer of this.observers) {
      await observer.update(eventType, data);
    }
  }
}


class EmailNotificationService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false,
      auth: {
        user: '9e4c8b001@smtp-brevo.com',
        pass: 'AGm713YL6XsK8VxR'
      }
    });
  }

  async update(eventType, data) {
    try {
      // Get user email from data or fetch from database
      let userEmail = data.userEmail;
      
      // If email not in data, fetch it
      if (!userEmail && data.userId) {
        const user = await User.findByPk(data.userId);
        if (user) {
          userEmail = user.email;
        }
      }
      
      if (!userEmail) {
        console.error('No email found for notification:', eventType, data);
        return;
      }

      let mailOptions = {};
      const eventTitle = data.eventTitle || data.title || 'Event';
      
      switch (eventType) {
        case 'REGISTRATION_CONFIRMED':
          mailOptions = {
            from: '"EventHub" <noreply@eventhub.com>',
            to: userEmail,
            subject: `🎫 Ticket Confirmed: ${eventTitle}`,
            text: `Your registration for "${eventTitle}" has been confirmed.\n\nEvent Details:\n- Date: ${data.eventDate || 'N/A'}\n- Time: ${data.eventTime || 'N/A'}\n- Venue: ${data.eventVenue || 'N/A'}\n- Tickets: ${data.ticketQuantity || 1}\n- Total: $${data.totalAmount || 0}\n\nThank you for your purchase!`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #4361ee;">🎫 Ticket Confirmed!</h2>
                <p>Your registration for <strong>${eventTitle}</strong> has been confirmed.</p>
                
                <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0;">
                  <h3 style="color: #3a0ca3;">Event Details</h3>
                  <p><strong>Date:</strong> ${data.eventDate || 'N/A'}</p>
                  <p><strong>Time:</strong> ${data.eventTime || 'N/A'}</p>
                  <p><strong>Venue:</strong> ${data.eventVenue || 'N/A'}</p>
                  <p><strong>Tickets:</strong> ${data.ticketQuantity || 1}</p>
                  <p><strong>Total:</strong> $${data.totalAmount || 0}</p>
                </div>
                
                <p>You can view your ticket at: <a href="http://localhost:3000/users/registrations/${data.registrationId}">View Ticket</a></p>
                
                <p style="color: #666; font-size: 0.9em;">Thank you for choosing EventHub!</p>
              </div>
            `
          };
          break;
          
        case 'PAYMENT_SUCCESS':
          mailOptions = {
            from: '"EventHub" <noreply@eventhub.com>',
            to: userEmail,
            subject: `✅ Payment Successful: ${eventTitle}`,
            text: `Your payment of $${data.amount} for "${eventTitle}" has been processed successfully.\n\nTransaction ID: ${data.transactionId}\nDate: ${new Date().toLocaleDateString()}\n\nThank you for your purchase!`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2ecc71;">✅ Payment Successful!</h2>
                <p>Your payment has been processed successfully.</p>
                
                <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0;">
                  <h3 style="color: #27ae60;">Payment Details</h3>
                  <p><strong>Event:</strong> ${eventTitle}</p>
                  <p><strong>Amount:</strong> $${data.amount}</p>
                  <p><strong>Transaction ID:</strong> ${data.transactionId}</p>
                  <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
                </div>
                
                <p>You can view your ticket at: <a href="http://localhost:3000/users/tickets">My Tickets</a></p>
                
                <p style="color: #666; font-size: 0.9em;">Thank you for your purchase!</p>
              </div>
            `
          };
          break;
          
        case 'EVENT_REMINDER':
          mailOptions = {
            from: '"EventHub" <noreply@eventhub.com>',
            to: userEmail,
            subject: `🔔 Reminder: ${eventTitle} is Tomorrow!`,
            text: `Don't forget about "${eventTitle}" tomorrow!\n\nDate: ${data.eventDate}\nTime: ${data.eventTime}\nVenue: ${data.eventVenue}\n\nSee you there!`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #f39c12;">🔔 Event Reminder</h2>
                <p>Don't forget about <strong>${eventTitle}</strong> tomorrow!</p>
                
                <div style="background: #fff3cd; padding: 20px; border-radius: 10px; margin: 20px 0;">
                  <h3 style="color: #856404;">Event Details</h3>
                  <p><strong>Date:</strong> ${data.eventDate}</p>
                  <p><strong>Time:</strong> ${data.eventTime}</p>
                  <p><strong>Venue:</strong> ${data.eventVenue}</p>
                </div>
                
                <p>See you there!</p>
              </div>
            `
          };
          break;
          
        default:
          console.log(`No email template for event type: ${eventType}`);
          return;
      }

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`[Email Sent] ${eventType} to ${userEmail}:`, info.messageId);
      
    } catch (error) {
      console.error(`[Email Error] ${eventType}:`, error);
    }
  }
}

// Concrete Observer: Database Notification
class DBNotificationService {
  async update(eventType, data) {
    try {
      let userIds = [];
      let title = '';
      let message = '';
      let type = 'system';

      switch (eventType) {
        case 'EVENT_CREATED':
          userIds = await this.getUsersInterestedInCategory(data.category);
          title = 'New Event Created';
          message = `A new ${data.category} event "${data.title}" has been created.`;
          type = 'promotional';
          break;

        case 'EVENT_UPDATED':
          userIds = await this.getRegisteredUsers(data.eventId);
          title = 'Event Updated';
          message = `Event "${data.title}" has been updated.`;
          type = 'event_update';
          break;

        case 'EVENT_REMINDER':
          userIds = await this.getRegisteredUsers(data.eventId);
          title = 'Event Reminder';
          message = `Reminder: "${data.title}" is tomorrow!`;
          type = 'event_reminder';
          break;

        case 'REGISTRATION_CONFIRMED':
          userIds = [data.userId];
          title = 'Registration Confirmed';
          message = `Your registration for "${data.eventTitle}" has been confirmed.`;
          type = 'registration_confirmation';
          break;
      }

      // Create notifications in database
      for (const userId of userIds) {
        await Notification.create({
          userId,
          title,
          message,
          type,
          isRead: false
        });
      }
    } catch (error) {
      console.error('Notification error:', error);
    }
  }

  async getUsersInterestedInCategory(category) {
    // Simplified: return all users for demo
    const users = await User.findAll({
      attributes: ['userId'],
      limit: 100 // Prevent sending to too many users
    });
    return users.map(user => user.userId);
  }

  async getRegisteredUsers(eventId) {
    const registrations = await Registration.findAll({
      where: { eventId, status: 'confirmed' },
      attributes: ['userId']
    });
    return registrations.map(reg => reg.userId);
  }
}

// Singleton Pattern for Notification Manager
class NotificationManager {
  static instance = null;

  constructor() {
    if (NotificationManager.instance) {
      return NotificationManager.instance;
    }

    this.observer = new NotificationObserver();
    this.emailService = new EmailNotificationService();
    this.dbService = new DBNotificationService();

    // Subscribe observers
    this.observer.subscribe(this.emailService);
    this.observer.subscribe(this.dbService);

    NotificationManager.instance = this;
  }

  static getInstance() {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  async notify(eventType, data) {
    await this.observer.notify(eventType, data);
  }

  // Factory Method Pattern: Create different notification types
  createNotification(type, data) {
    switch (type) {
      case 'reminder':
        return {
          title: `Reminder: ${data.eventTitle}`,
          message: `Don't forget about the event tomorrow!`,
          type: 'event_reminder'
        };
      case 'update':
        return {
          title: `Update: ${data.eventTitle}`,
          message: `The event has been updated.`,
          type: 'event_update'
        };
      case 'confirmation':
        return {
          title: `Registration Confirmed`,
          message: `Your registration for ${data.eventTitle} is confirmed.`,
          type: 'registration_confirmation'
        };
      default:
        throw new Error('Unknown notification type');
    }
  }
}

// Controller methods
module.exports = {
  NotificationManager,

  getUserNotifications: async (req, res) => {
    try {
      const notifications = await Notification.findAll({
        where: { userId: req.session.user.userId },
        order: [['createdAt', 'DESC']],
        limit: 50
      });

      res.render('notifications/index', {
        title: 'Notifications',
        notifications,
        user: req.session.user
      });
    } catch (error) {
      console.error(error);
      req.flash('error', 'Unable to load notifications');
      res.redirect('/');
    }
  },

  markAsRead: async (req, res) => {
    try {
      await Notification.update(
        { isRead: true },
        { where: { notificationId: req.params.notificationId } }
      );
      req.flash('success', 'Notification marked as read');
      res.redirect('back');
    } catch (error) {
      console.error(error);
      req.flash('error', 'Failed to update notification');
      res.redirect('back');
    }
  },

  deleteNotification: async (req, res) => {
    try {
      await Notification.destroy({
        where: { notificationId: req.params.notificationId }
      });
      req.flash('success', 'Notification deleted');
      res.redirect('back');
    } catch (error) {
      console.error(error);
      req.flash('error', 'Failed to delete notification');
      res.redirect('back');
    }
  },

  markAllAsRead: async (req, res) => {
    try {
      await Notification.update(
        { isRead: true },
        { where: { userId: req.session.user.userId, isRead: false } }
      );
      req.flash('success', 'All notifications marked as read');
      res.redirect('/notifications');
    } catch (error) {
      console.error(error);
      req.flash('error', 'Failed to mark all as read');
      res.redirect('/notifications');
    }
  },

  clearAllNotifications: async (req, res) => {
    try {
      await Notification.destroy({
        where: { userId: req.session.user.userId }
      });
      req.flash('success', 'All notifications cleared');
      res.redirect('/notifications');
    } catch (error) {
      console.error(error);
      req.flash('error', 'Failed to clear notifications');
      res.redirect('/notifications');
    }
  },

  getNotificationCount: async (req, res) => {
    try {
      const unreadCount = await Notification.count({
        where: { userId: req.session.user.userId, isRead: false }
      });
      res.json({ count: unreadCount });
    } catch (error) {
      console.error(error);
      res.json({ count: 0 });
    }
  },

  sendEventReminders: async () => {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const dayAfterTomorrow = new Date(tomorrow);
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

      const events = await Event.findAll({
        where: {
          date: {
            [Op.between]: [tomorrow, dayAfterTomorrow]
          },
          status: 'upcoming'
        }
      });

      const notificationManager = NotificationManager.getInstance();

      for (const event of events) {
        await notificationManager.notify('EVENT_REMINDER', {
          eventId: event.eventId,
          title: event.title
        });
      }

      console.log(`Sent reminders for ${events.length} events`);
    } catch (error) {
      console.error('Error sending reminders:', error);
    }
  }
};