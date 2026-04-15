import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import prisma from './lib/prisma';
import { ensureSystemConstraints } from './lib/resourceValidator';
import authRoutes from './routes/auth.routes';
import departmentRoutes from './routes/department.routes';
import semesterRoutes from './routes/semester.routes';
import teacherRoutes from './routes/teacher.routes';
import subjectRoutes from './routes/subject.routes';
import roomRoutes from './routes/room.routes';
import batchRoutes from './routes/batch.routes';
import timeSlotRoutes from './routes/timeSlot.routes';
import constraintRoutes from './routes/constraint.routes';
import scheduleRoutes from './routes/schedule.routes';
import analyticsRoutes from './routes/analytics.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// CORS configuration — supports Vercel previews, multiple origins, and mobile apps
const configuredOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);
const allowVercelPreviews = process.env.ALLOW_VERCEL_PREVIEWS === 'true';
const mobileOrigins = ['capacitor://localhost', 'http://localhost', 'https://localhost', 'ionic://localhost'];
const allowedOrigins = new Set([
  ...configuredOrigins,
  ...mobileOrigins,
  'http://localhost:3000',
  'http://127.0.0.1:3000',
]);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }
    if (allowVercelPreviews && /^https:\/\/.+\.vercel\.app$/.test(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/semesters', semesterRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/time-slots', timeSlotRoutes);
app.use('/api/constraints', constraintRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/analytics', analyticsRoutes);

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

app.listen(PORT, async () => {
  console.log(`🚀 Timetable API server running on port ${PORT}`);

  // Initialize system-level constraints (non-removable)
  try {
    await ensureSystemConstraints(prisma);
    console.log('✅ System constraints verified');
  } catch (err) {
    console.error('⚠️ Failed to initialize system constraints:', err);
  }
});

// Graceful shutdown — release database connections
async function gracefulShutdown(signal: string) {
  console.log(`\n${signal} received. Closing database connections...`);
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

export default app;
