const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// Trust the first proxy (fixes express-rate-limit IPv6 key generation on Render)
app.set('trust proxy', 1);

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow Cloudinary images
}));

// CORS — only allow the configured client origin
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,
}));

// Body parsing — 1 MB cap prevents large-payload abuse
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// Global rate limiter — 200 requests per 15 min per IP across all /api routes
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { message: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', globalLimiter);

// Routes
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/contributions', require('./routes/contributions'));
app.use('/api/members',       require('./routes/members'));
app.use('/api/groups',        require('./routes/groups'));
app.use('/api/pledges',       require('./routes/pledges'));
app.use('/api/subscription',  require('./routes/subscription'));
app.use('/api/payouts',       require('./routes/payouts'));
app.use('/api/penalties',     require('./routes/penalties'));
app.use('/api/reports',       require('./routes/reports'));
app.use('/api/exports',       require('./routes/exports'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/templates',     require('./routes/templates'));
app.use('/api/audit',         require('./routes/audit'));

// Health check — Render pings this to confirm the server is up
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Connect to MongoDB and start server
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => console.error('MongoDB connection error:', err));
