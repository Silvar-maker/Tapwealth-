const sgMail = require('@sendgrid/mail');
const twilio = require('twilio');
const admin = require('firebase-admin');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// ============= EMAIL SERVICE =============

class EmailService {
  static async sendVerificationEmail(email, code) {
    try {
      await sgMail.send({
        to: email,
        from: process.env.SENDGRID_FROM_EMAIL,
        subject: '🔐 Verify Your TapWealth Email',
        html: `
          <h2>Email Verification</h2>
          <p>Your verification code is: <strong>${code}</strong></p>
          <p>This code expires in 10 minutes.</p>
          <p>If you didn't request this, ignore this email.</p>
        `
      });
      return true;
    } catch (error) {
      console.error('Email send failed:', error);
      throw error;
    }
  }

  static async sendWithdrawalConfirmation(email, amount, reference) {
    try {
      await sgMail.send({
        to: email,
        from: process.env.SENDGRID_FROM_EMAIL,
        subject: '💰 Withdrawal Request Received',
        html: `
          <h2>Withdrawal Confirmed</h2>
          <p>Your withdrawal request of <strong>₦${amount}</strong> has been received.</p>
          <p>Reference: ${reference}</p>
          <p>You'll receive funds in 24-48 hours.</p>
        `
      });
      return true;
    } catch (error) {
      console.error('Email send failed:', error);
      throw error;
    }
  }
}

// ============= SMS SERVICE =============

class SMSService {
  static async sendVerificationSMS(phone, code) {
    try {
      await twilioClient.messages.create({
        body: `🔐 Your TapWealth verification code is: ${code}`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone
      });
      return true;
    } catch (error) {
      console.error('SMS send failed:', error);
      throw error;
    }
  }

  static async sendEarningNotification(phone, amount) {
    try {
      await twilioClient.messages.create({
        body: `🎉 You earned ₦${amount} on TapWealth! Check your balance now.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone
      });
      return true;
    } catch (error) {
      console.error('SMS send failed:', error);
    }
  }

  static async sendWithdrawalNotification(phone, amount) {
    try {
      await twilioClient.messages.create({
        body: `💰 Withdrawal of ₦${amount} requested. You'll receive funds in 24-48 hours.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone
      });
      return true;
    } catch (error) {
      console.error('SMS send failed:', error);
    }
  }
}

// ============= PUSH NOTIFICATION SERVICE =============

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');

if (process.env.FIREBASE_PROJECT_ID) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID
  });
}

class PushNotificationService {
  static async sendNotification(userId, title, body, tokens = []) {
    try {
      if (!tokens || tokens.length === 0) return;

      const message = {
        notification: {
          title,
          body
        },
        tokens
      };

      const response = await admin.messaging().sendMulticast(message);
      console.log(`✅ Sent ${response.successCount} notifications`);
      return response;
    } catch (error) {
      console.error('Push notification failed:', error);
    }
  }

  static async sendEarningNotification(userId, amount, tokens) {
    return this.sendNotification(
      userId,
      '🎉 You Earned Money!',
      `You earned ₦${amount} on TapWealth!`,
      tokens
    );
  }

  static async sendWithdrawalNotification(userId, amount, tokens) {
    return this.sendNotification(
      userId,
      '💰 Withdrawal Processed',
      `Your withdrawal of ₦${amount} is being processed.`,
      tokens
    );
  }
}

module.exports = {
  EmailService,
  SMSService,
  PushNotificationService
};
