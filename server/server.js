const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Trust the first proxy (fixes express-rate-limit IPv6 key generation)
app.set('trust proxy', 1);

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,
}));
app.use(express.json());

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
