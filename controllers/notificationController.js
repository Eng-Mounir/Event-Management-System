//Observer Pattern
const { Notification, Event, Registration, User } = require('../models/associations');
const { Op } = require('sequelize');

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

// Concrete Observer: Email Notification
class EmailNotificationService {
  async update(eventType, data) {
    console.log(`[Email] ${eventType}:`, data);
    // In real app, send email here
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