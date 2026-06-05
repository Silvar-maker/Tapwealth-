class OpayService {
  constructor() {
    this.apiUrl = process.env.OPAY_API_URL || 'https://api.opaycheckout.com';
    this.merchantId = process.env.OPAY_MERCHANT_ID;
    this.apiKey = process.env.OPAY_API_KEY;
  }

  // Generate request signature
  generateSignature(data) {
    const crypto = require('crypto');
    const message = JSON.stringify(data) + this.apiKey;
    return crypto.createHash('sha256').update(message).digest('hex');
  }

  // Initiate payment
  async initiatePayment(amount, email, reference) {
    try {
      const payload = {
        requestId: reference,
        timestamp: Math.floor(Date.now() / 1000),
        merchantId: this.merchantId,
        amount: {
          currency: 'NGN',
          total: amount
        },
        payMethod: {
          payChannel: 'BALANCE'
        },
        notifyUrl: `${process.env.BACKEND_URL}/api/opay/webhook`,
        returnUrl: `${process.env.FRONTEND_URL}/wallet.html`,
        reference
      };

      payload.signature = this.generateSignature(payload);

      const response = await axios.post(`${this.apiUrl}/api/v3/transaction/pay`, payload);
      return response.data;
    } catch (error) {
      console.error('Opay payment error:', error);
      throw error;
    }
  }

  // Process withdrawal
  async processWithdrawal(recipientPhone, amount, reference) {
    try {
      const payload = {
        requestId: reference,
        timestamp: Math.floor(Date.now() / 1000),
        merchantId: this.merchantId,
        recipient: {
          identifier: recipientPhone,
          identifierType: 'PHONE_NUMBER'
        },
        amount: {
          currency: 'NGN',
          total: amount
        },
        reason: 'User Withdrawal',
        reference
      };

      payload.signature = this.generateSignature(payload);

      const response = await axios.post(`${this.apiUrl}/api/v3/transaction/transfer`, payload);
      return response.data;
    } catch (error) {
      console.error('Opay withdrawal error:', error);
      throw error;
    }
  }

  // Verify payment status
  async verifyPayment(reference) {
    try {
      const payload = {
        requestId: `verify_${reference}`,
        timestamp: Math.floor(Date.now() / 1000),
        merchantId: this.merchantId,
        reference
      };

      payload.signature = this.generateSignature(payload);

      const response = await axios.post(`${this.apiUrl}/api/v3/transaction/query`, payload);
      return response.data;
    } catch (error) {
      console.error('Opay verification error:', error);
      throw error;
    }
  }
}

module.exports = new OpayService();
