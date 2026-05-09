const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const errorHandler = require('./middleware/errorHandler');

const app = express();

// Trust the first proxy (fixes express-rate-limit IPv6 key generation on Render)
app.set('trust proxy', 1);

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow Cloudinary images
}));

// CORS — allow production client and localhost dev
const ALLOWED_ORIGINS = [
  process.env.CLIENT_URL,
  'http://localhost:3000',
  'http://localhost:5173',
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // allow server-to-server requests (no origin) and listed origins
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
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
app.use('/api/referral',      require('./routes/referral'));

// Health check — Render pings this to confirm the server is up
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Global error handler — must be after all routes
app.use(errorHandler);

// Connect to MongoDB and start server
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('MongoDB connected');
    // Drop stale indexes not in the current schema (e.g. the old 4-field unique index
    // on Contribution that was replaced by the 5-field cycleNumber index).
    await require('./models/Contribution').syncIndexes();
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => console.error('MongoDB connection error:', err));
