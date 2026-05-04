import 'reflect-metadata';           // must be the very first import
import logger from './config/logger';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cron from 'node-cron';
import bcrypt from 'bcrypt';
import routes from './routes/index';
import { syncTranscripts } from './services/fireflies.service';
import { connectDB } from './config/database';
// Import models index to register all models and associations
import './models/index';
import { User } from './models';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT ?? '3000', 10);

// ─── Middleware ───────────────────────────────────────────────────────────────

const allowedOrigins = [
  'http://localhost:5173',
  'http://172.16.30.233:5173',
  'http://3.27.124.90:5173',
  'http://3.27.124.90',
  'http://app.aiwealthconnections.com',
  'https://app.aiwealthconnections.com',
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) callback(null, true);
    else callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
};

app.options('*', cors(corsOptions));
app.use(cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use('/api', routes);

// ─── 404 handler ─────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ─── Global error handler ─────────────────────────────────────────────────────

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('[server] Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ─── Admin seed ───────────────────────────────────────────────────────────────
//
// On startup, if no user exists for the configured email, create the bootstrap
// admin account with a bcrypt-hashed password.
// Safe to run on every restart — short-circuits if the email already exists.

async function seedAdmin(): Promise<void> {
  const email    = process.env.SUPER_ADMIN_EMAIL?.trim();
  const password = process.env.SUPER_ADMIN_PASSWORD?.trim();
  const name     = process.env.SUPER_ADMIN_NAME?.trim() ?? 'Admin';

  if (!email || !password) return; // not configured — skip

  try {
    const existing = await User.findOne({
      where: { email: email.toLowerCase() },
      attributes: ['id'],
      raw: true,
    });

    if (existing) {
      logger.info('[seed] Admin already exists — skipping admin seed.');
      return;
    }

    await User.create({
      email: email.toLowerCase(),
      name,
      role:         'admin',
      permissions:  [],
      status:       'Active',
    });

    logger.info(`[seed] Admin created — email: ${email}`);
  } catch (err) {
    logger.error('[seed] seedAdmin threw unexpectedly:', err);
  }
}

// ─── Fireflies sync cron (every 15 minutes) ──────────────────────────────────

async function runFirefliesSync(): Promise<void> {
  logger.info('[cron] Starting Fireflies sync…');
  try {
    const result = await syncTranscripts();
    logger.info(
      `[cron] Fireflies sync complete — synced: ${result.synced}, created: ${result.created}, updated: ${result.updated}` +
      (result.errors.length > 0 ? `, errors: ${result.errors.join('; ')}` : ''),
    );
  } catch (err) {
    logger.error('[cron] Fireflies sync threw unexpectedly:', err);
  }
}

cron.schedule('*/15 * * * *', () => {
  void runFirefliesSync();
});

// ─── Start ────────────────────────────────────────────────────────────────────

if (process.env.NODE_ENV !== 'test') {
  connectDB()
    .then(() => {
      app.listen(PORT, '0.0.0.0', () => {
        logger.info(`MarketingWiz API running on port ${PORT}`);
        void seedAdmin();
        void runFirefliesSync();
      });
    })
    .catch((err) => {
      logger.error('[startup] Failed to connect to database:', err);
      process.exit(1);
    });
}

export default app;
