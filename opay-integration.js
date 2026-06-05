<!-- Opay Integration API Service -->
<script>
  class OpayService {
    constructor() {
      this.apiBaseUrl = 'https://api.opaycheckout.com'; // Opay sandbox
      this.merchantId = 'MERCHANT_ID'; // Replace with actual ID
      this.apiKey = 'API_KEY'; // Replace with actual key
    }

    // Initialize Opay Payment
    async initiatePayment(email, amount, description) {
      try {
        const payload = {
          requestId: this.generateRequestId(),
          timestamp: Math.floor(Date.now() / 1000),
          merchantId: this.merchantId,
          amount: {
            currency: 'NGN',
            total: amount
          },
          payMethod: {
            payChannel: 'BALANCE'
          },
          notifyUrl: 'https://your-webhook-url.com/callback',
          returnUrl: window.location.origin + '/wallet.html',
          reference: `TAP_${Date.now()}`,
          callbackUrl: 'https://your-webhook-url.com/callback'
        };

        // For demo purposes, simulate payment
        console.log('💳 Opay Payment Initiated:', payload);
        return {
          success: true,
          transactionId: payload.reference,
          status: 'pending'
        };
      } catch (error) {
        console.error('❌ Payment Error:', error);
        throw error;
      }
    }

    // Verify Payment Status
    async verifyPayment(transactionId) {
      try {
        // In production, call Opay API
        // For demo, return mock response
        return {
          success: true,
          status: 'success',
          amount: 5000,
          reference: transactionId
        };
      } catch (error) {
        console.error('❌ Verification Error:', error);
        throw error;
      }
    }

    // Process Withdrawal
    async processWithdrawal(opayPhone, amount, bankAccount) {
      try {
        const payload = {
          requestId: this.generateRequestId(),
          timestamp: Math.floor(Date.now() / 1000),
          merchantId: this.merchantId,
          recipient: {
            identifier: opayPhone,
            identifierType: 'PHONE_NUMBER'
          },
          amount: {
            currency: 'NGN',
            total: amount
          },
          reference: `WD_${Date.now()}`,
          reason: 'User Withdrawal'
        };

        console.log('💳 Opay Withdrawal Initiated:', payload);
        
        // Store withdrawal for tracking
        const withdrawals = JSON.parse(localStorage.getItem('tapwealth_withdrawals') || '[]');
        withdrawals.push({
          id: payload.reference,
          amount: amount,
          status: 'processing',
          method: 'opay',
          recipient: opayPhone,
          createdAt: new Date().toISOString()
        });
        localStorage.setItem('tapwealth_withdrawals', JSON.stringify(withdrawals));

        return {
          success: true,
          transactionId: payload.reference,
          status: 'processing'
        };
      } catch (error) {
        console.error('❌ Withdrawal Error:', error);
        throw error;
      }
    }

    // Generate unique request ID
    generateRequestId() {
      return `OP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Webhook handler for payment confirmation
    handleWebhook(payload) {
      if (payload.status === 'success') {
        // Credit user account
        console.log('✅ Payment received:', payload);
        return { success: true, message: 'Payment confirmed' };
      }
      return { success: false, message: 'Payment failed' };
    }
  }

  const opayService = new OpayService();
</script>