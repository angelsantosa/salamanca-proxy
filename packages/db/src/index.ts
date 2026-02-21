import { env } from "@salamanca-proxy/env/server";
import { drizzle } from "drizzle-orm/mysql2";

import * as schema from "./schema";

export const db = drizzle({
  connection: {
    uri: env.DATABASE_URL,
  },
  schema,
});
