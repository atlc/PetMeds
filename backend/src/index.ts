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

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving for uploads
app.use('/uploads', express.static('uploads'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Routes
app.use('/auth', authRoutes);
app.use('/api/households', authMiddleware, householdRoutes);
app.use('/api/pets', authMiddleware, petRoutes);
app.use('/api/medications', authMiddleware, medicationRoutes);
app.use('/api/agenda', authMiddleware, agendaRoutes);
app.use('/api/push', authMiddleware, pushRoutes);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 PetMeds server running on port ${PORT}`);
  
  try {
    // Initialize services
    await setupPushNotifications();
    await setupMedicationScheduler();
    console.log('✅ Services initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing services:', error);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

export default app;
