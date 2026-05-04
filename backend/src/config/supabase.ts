/**
 * This file is intentionally empty.
 *
 * The Supabase client has been replaced by:
 *   - PostgreSQL + Sequelize  →  src/config/database.ts  +  src/models/
 *   - JWT auth                →  src/config/auth.ts
 *   - AWS S3                  →  src/config/storage.ts
 *
 * If you see an import from this file in a service, that service has not
 * been migrated yet.  Remove the import and replace the query with a Sequelize
 * equivalent from the corresponding model in src/models/.
 */

export default {};
export const anonClient = {};
export function createFreshAnonClient() { return {}; }
