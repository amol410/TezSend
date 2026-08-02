require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./src/routes/auth');
const cardRoutes = require('./src/routes/cards');
const beneficiaryRoutes = require('./src/routes/beneficiaries');
const transactionRoutes = require('./src/routes/transactions');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── CORS ─────────────────────────────────────────────────────────────────────
// Set ALLOWED_ORIGINS in .env as comma-separated list, e.g.:
//   ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : ['*'];

app.use(
  cors({
    origin: allowedOrigins.includes('*')
      ? '*'
      : (origin, callback) => {
          // allow server-to-server requests (no Origin header)
          if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
          } else {
            callback(new Error(`CORS blocked for origin: ${origin}`));
          }
        },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

app.use(express.json());

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/cards', cardRoutes);
app.use('/api/beneficiaries', beneficiaryRoutes);
app.use('/api/transactions', transactionRoutes);

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Welcome to the TezSend API' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'TezSend API is running' });
});

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

// ─── Start server ─────────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log(`🚀 TezSend API running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
});

// Graceful shutdown on PM2 SIGINT
process.on('SIGINT', () => {
  console.log('SIGINT received – shutting down gracefully');
  server.close(() => process.exit(0));
});
process.on('SIGTERM', () => {
  console.log('SIGTERM received – shutting down gracefully');
  server.close(() => process.exit(0));
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});

module.exports = app;
