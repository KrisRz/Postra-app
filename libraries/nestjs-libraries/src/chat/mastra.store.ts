import { PostgresStore } from '@mastra/pg';

export const pStore = new PostgresStore({
  id: 'postra-store',
  connectionString: process.env.DATABASE_URL!,
  // Third uncoordinated pool against the same small RDS (next to Prisma in
  // backend + orchestrator) — keep it tiny.
  max: 3,
});
