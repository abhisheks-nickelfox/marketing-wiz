import logger from './config/logger';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cron from 'node-cron';
import routes from './routes/index';
import { syncTranscripts } from './services/fireflies.service';
import supabase from './config/supabase';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT ?? '3000', 10);

// ─── Middleware ───────────────────────────────────────────────────────────────

const allowedOrigins = [
  'http://localhost:5173',
  'http://3.27.124.90:5173',
  'http://3.27.124.90',
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) callback(null, true);
      else callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

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

// ─── Super-admin seed ────────────────────────────────────────────────────────
//
// On startup, if no super_admin exists and SUPER_ADMIN_* env vars are set,
// create the bootstrap super-admin automatically. Safe to run on every restart
// — the check short-circuits if a super_admin already exists in public.users.

async function seedSuperAdmin(): Promise<void> {
  const email = process.env.SUPER_ADMIN_EMAIL?.trim();
  const password = process.env.SUPER_ADMIN_PASSWORD?.trim();
  const name = process.env.SUPER_ADMIN_NAME?.trim() ?? 'Super Admin';

  if (!email || !password) return; // env vars not configured — skip

  try {
    // Check by email — avoids false negatives when auth user exists but profile doesn't
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existing) {
      logger.info('[seed] Super admin already exists — skipping super-admin seed.');
      return;
    }

    // Try to create the Supabase Auth account
    let userId: string;
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      // Auth user may already exist (orphaned from a failed previous seed run).
      // Find it by listing users so we can still create the missing profile row.
      const { data: { users: authUsers } } = await supabase.auth.admin.listUsers();
      const orphan = authUsers.find((u) => u.email === email);
      if (!orphan) {
        logger.error('[seed] Failed to create super admin auth user and no orphan found:', authError.message);
        return;
      }
      userId = orphan.id;
      logger.info('[seed] Found orphaned auth user for super admin — creating missing profile row.');
    } else {
      userId = authData.user.id;
    }

    // Insert the super_admin profile row
    const { error: profileError } = await supabase
      .from('users')
      .insert({ id: userId, email, name, role: 'super_admin', permissions: [] });

    if (profileError) {
      logger.error('[seed] Failed to insert super admin profile:', profileError.message);
      return;
    }

    logger.info(`[seed] Super admin created — email: ${email}`);
  } catch (err) {
    logger.error('[seed] seedSuperAdmin threw unexpectedly:', err);
  }
}

// ─── Fireflies sync cron (every 15 minutes) ──────────────────────────────────
//
// Runs immediately on startup so the DB is never stale after a cold start,
// then repeats every 15 minutes while the process is alive.
// If FIREFLIES_API_KEY is absent, syncTranscripts() returns early with a warning
// (no-op) — this is intentional so the cron causes no noise in dev environments
// that don't have the key configured.

async function runFirefliesSync(): Promise<void> {
  logger.info('[cron] Starting Fireflies sync…');
  try {
    const result = await syncTranscripts();
    logger.info(
      `[cron] Fireflies sync complete — synced: ${result.synced}, created: ${result.created}, updated: ${result.updated}` +
      (result.errors.length > 0 ? `, errors: ${result.errors.join('; ')}` : '')
    );
  } catch (err) {
    // Catch-all so an unexpected throw never kills the cron task itself
    logger.error('[cron] Fireflies sync threw unexpectedly:', err);
  }
}

// Schedule: every 15 minutes — "*/15 * * * *"
cron.schedule('*/15 * * * *', () => {
  void runFirefliesSync();
});

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, '0.0.0.0', () => {
  logger.info(`MarketingWiz API running on http://localhost:${PORT}`);
  logger.info(`Network access: http://172.16.31.158:${PORT}`);
  void seedSuperAdmin();
  void runFirefliesSync();
});

export default app;
