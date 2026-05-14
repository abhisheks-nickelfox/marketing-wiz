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
