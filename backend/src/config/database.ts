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
 * Authenticate against the DB and log success/failure.
 * Called once at app startup.
 */
export async function connectDB(): Promise<void> {
  try {
    await sequelize.authenticate();
    logger.info('[db] PostgreSQL connection established successfully.');
  } catch (err) {
    logger.error('[db] Unable to connect to PostgreSQL:', err);
    throw err;
  }
}

export default sequelize;
