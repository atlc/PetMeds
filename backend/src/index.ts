import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { authRoutes } from './routes/auth';
import { householdRoutes } from './routes/households';
import { petRoutes } from './routes/pets';
import { medicationRoutes } from './routes/medications';
import { agendaRoutes } from './routes/agenda';
import { pushRoutes } from './routes/push';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';
import { setupPushNotifications } from './services/pushNotifications';
import { setupMedicationScheduler } from './services/medicationScheduler';

// Load environment variables from .env file
dotenv.config();

// Create Express application instance
const app = express();

// Server configuration
const PORT = process.env.PORT || 3001;

// ============================================================================
// SECURITY MIDDLEWARE
// ============================================================================

/**
 * Helmet middleware for security headers
 * Sets various HTTP headers to protect against common vulnerabilities
 */
app.use(helmet());

/**
 * CORS configuration for cross-origin requests
 * Allows frontend to communicate with backend API
 */
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

/**
 * Rate limiting to prevent API abuse
 * Limits each IP to 100 requests per 15-minute window
 */
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// ============================================================================
// BODY PARSING MIDDLEWARE
// ============================================================================

/**
 * Parse JSON request bodies
 * Limits payload size to 10MB to prevent memory issues
 */
app.use(express.json({ limit: '10mb' }));

/**
 * Parse URL-encoded request bodies
 * Handles form submissions and query parameters
 */
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================================================
// STATIC FILE SERVING
// ============================================================================

/**
 * Serve uploaded files (pet photos, etc.)
 * Files are accessible at /uploads/ path
 */
app.use('/uploads', express.static('uploads'));

// ============================================================================
// HEALTH CHECK ENDPOINT
// ============================================================================

/**
 * Health check endpoint for monitoring and load balancers
 * Returns server status and current timestamp
 */
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ============================================================================
// API ROUTES
// ============================================================================

/**
 * Authentication routes (no middleware required)
 * Handles Google OAuth login and user authentication
 */
app.use('/auth', authRoutes);

/**
 * Protected API routes requiring authentication
 * All routes below this point require valid JWT token
 */
app.use('/api/households', authMiddleware, householdRoutes);
app.use('/api/pets', authMiddleware, petRoutes);
app.use('/api/medications', authMiddleware, medicationRoutes);
app.use('/api/agenda', authMiddleware, agendaRoutes);
app.use('/api/push', authMiddleware, pushRoutes);

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * Global error handling middleware
 * Catches all errors and formats them for consistent API responses
 */
app.use(errorHandler);

/**
 * 404 handler for unmatched routes
 * Returns standardized error response for unknown endpoints
 */
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

/**
 * Start the Express server and initialize services
 * Sets up push notifications and medication scheduling on startup
 */
app.listen(PORT, async () => {
  console.log(`🚀 PetMeds server running on port ${PORT}`);
  
  try {
    // Initialize push notification service with VAPID keys
    await setupPushNotifications();
    
    // Initialize medication scheduler for dose generation and reminders
    await setupMedicationScheduler();
    
    console.log('✅ Services initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing services:', error);
  }
});

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

/**
 * Handle SIGTERM signal (termination request)
 * Allows for graceful cleanup when shutting down
 */
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

/**
 * Handle SIGINT signal (Ctrl+C)
 * Allows for graceful cleanup when stopping development server
 */
process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

export default app;
