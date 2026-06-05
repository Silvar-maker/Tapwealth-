const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const axios = require('axios');

dotenv.config();

const app = express();

// Security Middleware
app.use(helmet());
app.use(mongoSanitize());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Body parser
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ limit: '10kb', extended: true }));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tapwealth', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('✅ MongoDB Connected')).catch(err => console.error('❌ MongoDB Error:', err));

// ============= SCHEMAS =============

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  phone: { type: String, required: true },
  password: { type: String, required: true, minlength: 6 },
  emailVerified: { type: Boolean, default: false },
  verificationToken: String,
  balance: { type: Number, default: 500 },
  taps: { type: Number, default: 0 },
  completedTasks: { type: Number, default: 0 },
  referrals: [{
    email: String,
    name: String,
    bonus: { type: Number, default: 100 },
    active: { type: Boolean, default: true },
    joinDate: { type: Date, default: Date.now }
  }],
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  twoFactorEnabled: { type: Boolean, default: false },
  notificationsEnabled: { type: Boolean, default: true },
  darkMode: { type: Boolean, default: false },
  language: { type: String, default: 'en' },
  createdAt: { type: Date, default: Date.now },
  lastActive: { type: Date, default: Date.now }
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

const TransactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['credit', 'debit'], required: true },
  amount: { type: Number, required: true },
  description: String,
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
  method: { type: String, enum: ['ads', 'tasks', 'referral', 'opay', 'bank'], default: 'ads' },
  reference: String,
  createdAt: { type: Date, default: Date.now }
});

const WithdrawalSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  method: { type: String, enum: ['opay', 'bank'], required: true },
  recipient: String,
  status: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
  reference: String,
  createdAt: { type: Date, default: Date.now },
  completedAt: Date
});

const NotificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: String,
  body: String,
  type: { type: String, enum: ['earning', 'withdrawal', 'referral', 'admin'], default: 'earning' },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const Transaction = mongoose.model('Transaction', TransactionSchema);
const Withdrawal = mongoose.model('Withdrawal', WithdrawalSchema);
const Notification = mongoose.model('Notification', NotificationSchema);

// ============= JWT HELPERS =============

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'tapwealth-secret-key', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) return res.status(401).json({ message: 'Not authenticated' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tapwealth-secret-key');
    req.user = await User.findById(decoded.id);
    next();
  } catch (error) {
    res.status(401).json({ message: 'Authentication failed' });
  }
};

// ============= AUTHENTICATION ROUTES =============

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({ message: 'All fields required' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) return res.status(400).json({ message: 'Email already exists' });

    const verificationToken = Math.floor(100000 + Math.random() * 900000).toString();

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      phone,
      password,
      verificationToken,
      balance: 500 // Welcome bonus
    });

    // Create welcome transaction
    await Transaction.create({
      userId: user._id,
      type: 'credit',
      amount: 500,
      description: 'Welcome Bonus',
      status: 'completed',
      method: 'referral'
    });

    // Send verification email (integrate with SendGrid)
    console.log(`📧 Verification code for ${email}: ${verificationToken}`);

    res.status(201).json({
      message: 'Account created. Check email for verification code.',
      email: user.email,
      requiresVerification: true
    });
  } catch (error) {
    res.status(500).json({ message: 'Signup failed', error: error.message });
  }
});

app.post('/api/auth/verify-email', async (req, res) => {
  try {
    const { email, code } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.verificationToken !== code) {
      return res.status(400).json({ message: 'Invalid verification code' });
    }

    user.emailVerified = true;
    user.verificationToken = null;
    await user.save();

    const token = signToken(user._id);

    res.json({
      message: 'Email verified successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        balance: user.balance
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Verification failed', error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    if (!user.emailVerified) {
      return res.status(403).json({ message: 'Please verify your email first' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) return res.status(401).json({ message: 'Invalid credentials' });

    user.lastActive = new Date();
    await user.save();

    const token = signToken(user._id);

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        balance: user.balance,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
});

// ============= USER ROUTES =============

app.get('/api/user/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching profile' });
  }
});

app.put('/api/user/profile', protect, async (req, res) => {
  try {
    const { name, phone, darkMode, language, notificationsEnabled } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, phone, darkMode, language, notificationsEnabled },
      { new: true, runValidators: true }
    );

    res.json({ message: 'Profile updated', user });
  } catch (error) {
    res.status(500).json({ message: 'Update failed' });
  }
});

app.post('/api/user/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+password');
    const passwordMatch = await bcrypt.compare(currentPassword, user.password);

    if (!passwordMatch) return res.status(401).json({ message: 'Current password incorrect' });

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Password change failed' });
  }
});

// ============= TRANSACTION ROUTES =============

app.get('/api/transactions', protect, async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching transactions' });
  }
});

app.post('/api/transactions/ad-reward', protect, async (req, res) => {
  try {
    const amount = 15; // Per ad

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $inc: { balance: amount } },
      { new: true }
    );

    await Transaction.create({
      userId: req.user._id,
      type: 'credit',
      amount,
      description: 'Ad View Reward',
      status: 'completed',
      method: 'ads'
    });

    res.json({ message: 'Ad reward credited', balance: user.balance });
  } catch (error) {
    res.status(500).json({ message: 'Error crediting reward' });
  }
});

// ============= OPAY INTEGRATION =============

const opayConfig = {
  baseURL: process.env.OPAY_API_URL || 'https://api.opaycheckout.com',
  merchantId: process.env.OPAY_MERCHANT_ID,
  apiKey: process.env.OPAY_API_KEY
};

app.post('/api/withdrawal/initiate', protect, async (req, res) => {
  try {
    const { amount, method, recipient } = req.body;

    const user = await User.findById(req.user._id);
    if (user.balance < amount) return res.status(400).json({ message: 'Insufficient balance' });
    if (amount < 500) return res.status(400).json({ message: 'Minimum withdrawal: ₦500' });

    const reference = `TAP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create withdrawal record
    const withdrawal = await Withdrawal.create({
      userId: req.user._id,
      amount,
      method,
      recipient,
      reference,
      status: 'processing'
    });

    // Deduct from balance
    user.balance -= amount;
    await user.save();

    // Log transaction
    await Transaction.create({
      userId: req.user._id,
      type: 'debit',
      amount,
      description: `Withdrawal to ${method.toUpperCase()}`,
      status: 'pending',
      method,
      reference
    });

    // TODO: Call Opay API for actual processing
    console.log(`💸 Withdrawal initiated: ${reference}`);

    res.json({
      message: 'Withdrawal initiated',
      withdrawal,
      reference
    });
  } catch (error) {
    res.status(500).json({ message: 'Withdrawal failed' });
  }
});

// ============= REFERRAL ROUTES =============

app.post('/api/referral/add', protect, async (req, res) => {
  try {
    const { referralEmail } = req.body;

    const referralUser = await User.findOne({ email: referralEmail.toLowerCase() });
    if (!referralUser) return res.status(404).json({ message: 'User not found' });

    const user = await User.findById(req.user._id);

    // Add referral
    user.referrals.push({
      email: referralUser.email,
      name: referralUser.name,
      bonus: 100,
      active: true
    });

    user.balance += 100; // Add bonus
    await user.save();

    // Log transaction
    await Transaction.create({
      userId: req.user._id,
      type: 'credit',
      amount: 100,
      description: `Referral Bonus - ${referralUser.name}`,
      status: 'completed',
      method: 'referral'
    });

    res.json({ message: 'Referral added', balance: user.balance });
  } catch (error) {
    res.status(500).json({ message: 'Error adding referral' });
  }
});

app.get('/api/referral/stats', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const totalBonus = (user.referrals?.length || 0) * 100;

    res.json({
      totalReferrals: user.referrals?.length || 0,
      activeReferrals: user.referrals?.filter(r => r.active).length || 0,
      totalBonus
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching stats' });
  }
});

// ============= LEADERBOARD ROUTES =============

app.get('/api/leaderboard/earnings', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const users = await User.find()
      .select('name email balance')
      .limit(limit)
      .sort({ balance: -1 });

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching leaderboard' });
  }
});

// ============= ADMIN ROUTES =============

app.get('/api/admin/stats', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });

    const totalUsers = await User.countDocuments();
    const totalBalance = await User.aggregate([{ $group: { _id: null, total: { $sum: '$balance' } } }]);
    const totalTransactions = await Transaction.countDocuments();

    res.json({
      totalUsers,
      totalBalance: totalBalance[0]?.total || 0,
      totalTransactions
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching stats' });
  }
});

// ============= ERROR HANDLING =============

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'production' ? {} : err
  });
});

// ============= START SERVER =============

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;