// backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const dailyRoutes = require('./routes/daily');
const adminRoutes = require('./routes/admin');
const bookingRoutes = require('./routes/bookings'); // Added booking routes

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',  // Vite dev server
    'http://localhost:3000',  // Alternative dev port
    'http://localhost:5174',  // Another alternative
    // Add your production frontend URL here when deploying
    // 'https://yourdomain.com'
  ],
  credentials: true
}));

app.use(express.json());

// Request logging middleware (optional but helpful for debugging)
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Hinahon Backend API is running',
    timestamp: new Date().toISOString(),
    emailConfigured: !!process.env.EMAIL_USER && !!process.env.EMAIL_PASS
  });
});

// API Routes
app.use('/api/daily', dailyRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/bookings', bookingRoutes); // Added booking routes for email notifications

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler - must be last
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.path,
    method: req.method
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log('================================================');
  console.log(`🚀 Hinahon Backend Server`);
  console.log('================================================');
  console.log(`📍 Server running on http://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`\n📡 Available Endpoints:`);
  console.log(`\n   Daily.co Video:`);
  console.log(`   - POST   /api/daily/create-room`);
  console.log(`   - GET    /api/daily/room/:consultationId`);
  console.log(`   - DELETE /api/daily/room/:consultationId`);
  console.log(`\n   Admin Management:`);
  console.log(`   - POST   /api/admin/create-user`);
  console.log(`   - PUT    /api/admin/update-user-role/:userId`);
  console.log(`   - DELETE /api/admin/delete-user/:userId`);
  console.log(`\n   Booking & Notifications:`);
  console.log(`   - POST   /api/bookings/send-booking-confirmation`);
  console.log(`   - POST   /api/bookings/send-acceptance-notification`);
  console.log(`   - POST   /api/bookings/send-rejection-notification`);
  console.log(`\n📧 Email Notifications: ${process.env.EMAIL_USER ? '✅ Configured' : '❌ Not Configured'}`);
  console.log(`⏰ Started at: ${new Date().toLocaleString()}`);
  console.log('================================================\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

process.on('SIGINT', () => {
  console.log('\nSIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});