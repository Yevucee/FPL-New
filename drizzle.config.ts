import { defineConfig } from "drizzle-kit";

const url =
  process.env.DATABASE_URL ?? "postgresql://fpl:fpl@127.0.0.1:5432/fpl";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
  strict: true,
  verbose: true,
});
