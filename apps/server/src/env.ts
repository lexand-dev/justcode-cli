import { z } from "zod";

// `DATABASE_URL` is read by `@justcode/db/client`, not here.
const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  // Optional so the server starts without it (empty counts as unset); the chat route reports it.
  DEEPSEEK_API_KEY: z.preprocess((value) => (value === "" ? undefined : value), z.string().optional())
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(`Invalid server environment:\n${z.prettifyError(parsed.error)}`);
}

/** The server's validated environment. */
export const env = parsed.data;
