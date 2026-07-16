import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import routes from './routes';
import prisma from './config/database';
import logger from './utils/logger';
import errorMiddleware from './middleware/error.middleware';

const app = express();
const port = process.env.PORT || 5000;
const startTime = Date.now();

// Production environment validation
if (process.env.NODE_ENV === 'production') {
  if (!process.env.DATABASE_URL) {
    console.error('CRITICAL: DATABASE_URL environment variable is missing.');
    process.exit(1);
  }
  if (!process.env.JWT_SECRET) {
    console.error('CRITICAL: JWT_SECRET environment variable is missing.');
    process.exit(1);
  }
  if (!process.env.REFRESH_SECRET) {
    console.error('CRITICAL: REFRESH_SECRET environment variable is missing.');
    process.exit(1);
  }
}

// 1. Security Middleware
app.use(helmet());
app.use(compression());

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',')
  : [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174'
    ];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes(origin) ||
      (process.env.NODE_ENV !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin))
    ) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate Limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 5000, // Limit requests per 15 minutes
  message: { error: 'Too many requests from this IP, please try again after 15 minutes' }
});
app.use('/api/', limiter);

// 2. Body Parser Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. Static Files
import path from 'path';
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// 4. Request Logger
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.originalUrl} - IP: ${req.ip}`);
  next();
});

// 5. Health & Readiness Routes
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'HEALTHY',
    uptime: `${Math.floor((Date.now() - startTime) / 1000)}s`,
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

app.get('/ready', async (req: Request, res: Response) => {
  try {
    // Perform database health check query
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: 'READY',
      database: 'CONNECTED',
      uptime: `${Math.floor((Date.now() - startTime) / 1000)}s`,
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error(`Readiness check failed: ${error.message}`);
    res.status(503).json({
      status: 'NOT_READY',
      database: 'DISCONNECTED',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// 5. API Routes Mount
app.use('/api', routes);

// 6. 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: `Endpoint not found: ${req.method} ${req.originalUrl}` });
});

// 7. Global Error Handler
app.use(errorMiddleware);

// 8. Graceful Shutdown & Server boot
const server = app.listen(port, () => {
  logger.info('==================================================');
  logger.info(`  Project PowerShift Running on Port ${port}`);
  logger.info(`  Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info('==================================================');
});

const gracefulShutdown = async () => {
  logger.info('Graceful shutdown initiated. Stopping server...');
  server.close(async () => {
    logger.info('HTTP Server stopped. Disconnecting database...');
    await prisma.$disconnect();
    logger.info('Database disconnected. Exit complete.');
    process.exit(0);
  });

  // Force shutdown after 10s if logic gets hung
  setTimeout(() => {
    logger.error('Forceful exit executed.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

export default app;
