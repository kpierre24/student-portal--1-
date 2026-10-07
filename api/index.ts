import { createApp } from "../src/server/app";
import { initializeRelationalSchema } from "../src/server/services/domain";
import { logger } from "../src/lib/logger";

// Initialize relational PostgreSQL database tables on cold start
initializeRelationalSchema().catch((e) => logger.warn("Relational init warning on Vercel cold start:", e));

const app = createApp();

export default app;
