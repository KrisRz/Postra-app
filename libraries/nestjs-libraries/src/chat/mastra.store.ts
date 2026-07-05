import { PostgresStore } from '@mastra/pg';

export const pStore = new PostgresStore({
  id: 'postra-store',
  connectionString: process.env.DATABASE_URL!,
});
