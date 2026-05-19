import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import logger from './logger';

dotenv.config();

const { DATABASE_URL, NODE_ENV } = process.env;

if (!DATABASE_URL) throw new Error('Missing environment variable: DATABASE_URL');

export const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: {},
  logging: NODE_ENV === 'development' ? (msg: string) => logger.debug(msg) : false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  define: {
    freezeTableName: true,
    timestamps: false,
  },
});

/**
 * Authenticate and apply targeted schema patches at startup.
 * Only adds strictly missing tables/columns — never alters existing ones,
 * so views and constraints that depend on existing columns are untouched.
 */
export async function connectDB(): Promise<void> {
  try {
    await sequelize.authenticate();
    logger.info('[db] PostgreSQL connection established successfully.');
    await sequelize.sync({ force: false, alter: { drop: false } });
    logger.info('[db] Sequelize sync complete — tables and columns verified.');
    await applyMissingSchema();
  } catch (err) {
    logger.error('[db] Unable to connect to PostgreSQL:', err);
    throw err;
  }
}

async function applyMissingSchema(): Promise<void> {
  // sequelize.sync({ alter: { drop: false } }) handles all columns for modeled tables.
  // This function only seeds required data for tables that have no Sequelize model.
  const patches: Array<{ name: string; sql: string }> = [
    {
      // Backfill updated_at for existing notifications that were created before
      // the column existed — use created_at so sort order is sensible.
      name: 'backfill notifications.updated_at',
      sql: `UPDATE notifications SET updated_at = created_at WHERE updated_at IS NULL`,
    },
    {
      // Remove duplicate inbox notifications, keeping only the latest per
      // (user_id, scope_id) pair. Must run before the unique index is created.
      name: 'deduplicate notifications by user+scope',
      sql: `
        DELETE FROM notifications n1
        WHERE scope_id IS NOT NULL
          AND id NOT IN (
            SELECT DISTINCT ON (user_id, scope_id) id
            FROM notifications
            WHERE scope_id IS NOT NULL
            ORDER BY user_id, scope_id, created_at DESC
          )
      `,
    },
    {
      // Unique index enables atomic INSERT ... ON CONFLICT DO UPDATE so rapid
      // messages from the same sender don't race and create duplicate rows.
      name: 'unique index on notifications(user_id, scope_id)',
      sql: `
        CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_user_scope
          ON notifications(user_id, scope_id)
          WHERE scope_id IS NOT NULL
      `,
    },
    {
      // Remove old "mentioned you" / system notifications with scope_id=NULL that
      // accumulated before the upsert was introduced. Keep only the 5 most recent
      // per user to avoid clutter, but leave scoped rows (scope_id IS NOT NULL) untouched.
      name: 'trim null-scope notification clutter',
      sql: `
        DELETE FROM notifications
        WHERE scope_id IS NULL
          AND id NOT IN (
            SELECT id FROM (
              SELECT id,
                     ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) AS rn
              FROM notifications
              WHERE scope_id IS NULL
            ) ranked
            WHERE rn <= 5
          )
      `,
    },
    {
      // CTE in findNotificationsByUser does DISTINCT ON (scope_id) ORDER BY scope_id, created_at DESC
      // Without this index it scans the whole messages table on every inbox load.
      name: 'index messages(scope_id, created_at)',
      sql: `CREATE INDEX IF NOT EXISTS idx_messages_scope_created
              ON messages(scope_id, created_at DESC)
              WHERE deleted_at IS NULL`,
    },
    {
      // notifications WHERE user_id = :userId — needed for every inbox fetch
      name: 'index notifications(user_id)',
      sql: `CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)`,
    },
    {
      name: 'task_type_members table',
      sql: `
        CREATE TABLE IF NOT EXISTS task_type_members (
          task_type_id UUID NOT NULL REFERENCES task_types(id) ON DELETE CASCADE,
          user_id      UUID NOT NULL REFERENCES users(id)      ON DELETE CASCADE,
          added_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          PRIMARY KEY (task_type_id, user_id)
        )
      `,
    },
    {
      name: 'task_types seed',
      sql: `
        INSERT INTO task_types (name, description, color) VALUES
          ('task',               'General task or to-do item',           '#6B7280'),
          ('design',             'UI/UX design or visual asset work',     '#8B5CF6'),
          ('development',        'Software development or engineering',   '#3B82F6'),
          ('account_management', 'Client communication or account admin', '#F59E0B')
        ON CONFLICT (name) DO NOTHING
      `,
    },
    {
      name: 'org_settings seed',
      sql: `INSERT INTO org_settings (id, created_at, updated_at) SELECT gen_random_uuid(), NOW(), NOW() WHERE NOT EXISTS (SELECT 1 FROM org_settings)`,
    },
  ];

  for (const patch of patches) {
    try {
      await sequelize.query(patch.sql);
      logger.debug(`[db] patch ok: ${patch.name}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      // "already exists" errors are harmless — skip them silently
      if (msg.includes('already exists') || msg.includes('duplicate column')) {
        logger.debug(`[db] patch skip (already exists): ${patch.name}`);
      } else {
        logger.warn(`[db] patch failed — ${patch.name}: ${msg}`);
      }
    }
  }

  logger.info('[db] Schema patches applied.');
}

export default sequelize;
