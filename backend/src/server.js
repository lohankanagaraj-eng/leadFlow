import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'node:path';

import authRoutes from './routes/auth.routes.js';
import companyRoutes from './routes/company.routes.js';
import leadRoutes from './routes/lead.routes.js';
import engagementRoutes from './routes/engagement.routes.js';
import employeeRoutes from './routes/employee.routes.js';
import developerRoutes from './routes/developer.routes.js';
import projectRoutes from './routes/project.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import activityRoutes from './routes/activity.routes.js';
import { notFound, errorHandler } from './middleware/error.js';
import { healthCheck } from './config/db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(compression());

const origins = (process.env.CLIENT_ORIGINS || 'http://localhost:5173')
  .split(',').map((s) => s.trim()).filter(Boolean);
app.use(cors({ origin: origins, credentials: true }));

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, try again later.' },
}));

app.use('/uploads', express.static(path.resolve('uploads'), { maxAge: '1d' }));

app.get('/api/health', async (_req, res) => {
  try {
    await healthCheck();
    res.json({ success: true, status: 'ok', db: 'connected', time: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ success: false, status: 'degraded', db: err.message });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/crm', engagementRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/developers', developerRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/activity', activityRoutes);

app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`\n  LeadFlow API running on http://localhost:${PORT}`);
  console.log(`  Health check: http://localhost:${PORT}/api/health\n`);
});

export default app;
