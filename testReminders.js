// testEmailOnly.js - Simpler test
const { NotificationManager } = require('./controllers/notificationController');

async function testEmail() {
  try {
    console.log('📧 Testing email notification...');
    
    const notificationManager = NotificationManager.getInstance();
    
    // Test 1: Registration confirmation
    await notificationManager.notify('REGISTRATION_CONFIRMED', {
      eventTitle: 'Summer Music Festival',
      userEmail: 'mouniramir39@gmail.com', // CHANGE THIS
      userId: 1
    });
    
    console.log('✅ Registration confirmation email sent');
    
    // Test 2: Event reminder
    await notificationManager.notify('EVENT_REMINDER', {
      eventTitle: 'Tech Conference 2024',
      userEmail: 'mouniramir39@gmail.com', // CHANGE THIS (same or different)
      eventId: 123,
      userId: 1
    });
    
    console.log('✅ Event reminder email sent');
    
    console.log('🎉 Both test emails sent! Check your inbox (and spam folder).');
    console.log('📋 Also check Brevo dashboard: Transactional → Logs');
    
  } catch (error) {
    console.error('❌ Email test failed:', error);
  }
}

testEmail();