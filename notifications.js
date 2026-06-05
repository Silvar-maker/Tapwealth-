<!-- Add this to the HEAD of dashboard.html -->
<script>
  // Register Service Worker for Push Notifications
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').then(reg => {
      console.log('✅ Service Worker registered');
    });
  }

  // Request Notification Permission
  function requestNotificationPermission() {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        sendNotification('Welcome back to TapWealth!', 'Start earning now');
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            sendNotification('Notifications enabled!', 'You\'ll receive earning alerts');
          }
        });
      }
    }
  }

  // Send Browser Notification
  function sendNotification(title, body) {
    if (Notification.permission === 'granted') {
      new Notification(title, {
        body: body,
        icon: 'https://via.placeholder.com/150/1d4ed8/fff?text=TW',
        badge: 'https://via.placeholder.com/32/1d4ed8/fff?text=TW'
      });
    }
  }

  // SMS Notification Service
  class SMSNotificationService {
    static sendSMS(phone, message) {
      // This would integrate with services like:
      // - Termii API
      // - Twilio
      // - AWS SNS
      // For demo, we log it
      console.log(`📱 SMS to ${phone}: ${message}`);
      localStorage.setItem('last_sms', JSON.stringify({ phone, message, time: Date.now() }));
    }

    static notifyEarning(user, amount) {
      const message = `🎉 You earned ₦${amount} on TapWealth! Balance: ₦${user.balance}`;
      this.sendSMS(user.phone, message);
    }

    static notifyWithdrawal(user, amount) {
      const message = `💰 Withdrawal request of ₦${amount} submitted. You'll receive funds in 24-48 hours.`;
      this.sendSMS(user.phone, message);
    }

    static notifyReferral(user, referralName) {
      const message = `🎁 ${referralName} joined via your link! You earned ₦100 bonus.`;
      this.sendSMS(user.phone, message);
    }
  }
</script>