require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB Connect
mongoose
  .connect(process.env.MONGO_URI, { dbName: 'dragon_mart_online' })
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.error('MongoDB error:', err.message));

// ================= SCHEMAS & MODELS =================

// User Schema
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['customer', 'seller', 'admin'], default: 'customer' },
  },
  { timestamps: true }
);

const User = mongoose.model('User', userSchema);

// Product Schema
const productSchema = new mongoose.Schema(
  {
    name: String,
    description: String,
    price: Number,
    currency: { type: String, default: 'AED' },
  },
  { timestamps: true }
);
const Product = mongoose.model('Product', productSchema);

// Order Schema
const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    items: [
      {
        productId: Number,
        name: String,
        price: Number,
        qty: Number,
      },
    ],
    customer: {
      name: String,
      phone: String,
      address: String,
    },
    status: { type: String, default: 'PENDING_PAYMENT' },
  },
  { timestamps: true }
);

const Order = mongoose.model('Order', orderSchema);

// ================= MIDDLEWARE =================

function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ message: 'No token provided' });

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Invalid token format' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, email, role }
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token invalid or expired' });
  }
}

// ================= AUTH ROUTES =================

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await User.create({
      name,
      email,
      phone,
      passwordHash,
    });

    return res.json({ success: true, message: 'User registered successfully' });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid email or password' });

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return res.status(400).json({ message: 'Invalid email or password' });

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Logged-in User Info
app.get('/api/auth/me', authMiddleware, async (req, res) => {
  const user = await User.findById(req.user.id).select('-passwordHash');
  res.json(user);
});

// ================= PRODUCT ROUTES =================

// Seed products (run once)
app.post('/api/products/seed', async (req, res) => {
  try {
    await Product.deleteMany({});
    const data = await Product.insertMany([
      {
        name: '3 PCS Travel Luggage Set',
        description: 'Waterproof, TCA lock, expandable',
        price: 199,
        currency: 'AED',
      },
      {
        name: 'Fast Charging Cable Pack',
        description: 'Type-C, Lightning, Micro USB (3 in 1)',
        price: 29,
        currency: 'AED',
      },
      {
        name: 'Arabic Coffee & Karak Set',
        description: 'Premium cups, flask & tray combo',
        price: 89,
        currency: 'AED',
      },
      {
        name: 'LED Car Headlight Kit',
        description: 'Super bright, long life, easy install',
        price: 149,
        currency: 'AED',
      },
    ]);
    res.json({ success: true, data });
  } catch (err) {
    console.error('Seed error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all products
app.get('/api/products', async (req, res) => {
  const products = await Product.find();
  res.json(products);
});

// ================= ORDER ROUTES =================

// Checkout
app.post('/api/checkout', authMiddleware, async (req, res) => {
  try {
    const { items, customer } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart is empty' });
    }

    const order = await Order.create({
      user: req.user.id,
      items,
      customer,
      status: 'PENDING_PAYMENT',
    });

    res.json({
      success: true,
      orderId: order._id,
      message: 'Order received. Payment step to be processed.',
    });
  } catch (err) {
    console.error('Checkout error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Admin - get all orders
app.get('/api/orders', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden' });
  }
  const orders = await Order.find().populate('user', 'name email phone');
  res.json(orders);
});

// ================= START SERVER =================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
});
