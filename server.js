const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key';

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection (Updated: removed deprecated options)
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Mongoose schema
const tenderSchema = new mongoose.Schema({
  name: String,
  phone: String,
  email: String,
  amount: Number,
}, { timestamps: true });

const Tender = mongoose.model('Tender', tenderSchema);

// Hardcoded admin user
const adminUser = {
  username: 'admin',
  password: bcrypt.hashSync('admin123', 10),
};

// Auth endpoints
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (username !== adminUser.username) {
    return res.status(400).json({ message: 'Invalid username' });
  }

  const isMatch = await bcrypt.compare(password, adminUser.password);
  if (!isMatch) {
    return res.status(400).json({ message: 'Invalid password' });
  }

  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '1h' });
  res.json({ token });
});

// JWT middleware
const auth = (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// CRUD routes
app.post('/api/tenders', auth, async (req, res) => {
  try {
    const newTender = new Tender(req.body);
    await newTender.save();
    res.json(newTender);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/tenders', auth, async (req, res) => {
  try {
    const tenders = await Tender.find();
    res.json(tenders);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/tenders/search', auth, async (req, res) => {
  try {
    const regex = new RegExp(req.query.q, 'i');
    const tenders = await Tender.find({ name: regex });
    res.json(tenders);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.put('/api/tenders/:id', auth, async (req, res) => {
  try {
    const updated = await Tender.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.delete('/api/tenders/:id', auth, async (req, res) => {
  try {
    await Tender.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Start server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
