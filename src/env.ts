import { z } from "zod";

// The only module that reads process.env (AGENTS.md rule 5). Add every new
// variable here and to .env.example.
const schema = z.object({
  DATABASE_URL: z.string().trim().min(1, "DATABASE_URL is required"),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(
    `Invalid environment variables:\n${z.prettifyError(parsed.error)}`,
  );
}

export const env = parsed.data;
