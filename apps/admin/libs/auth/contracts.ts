import { z } from "zod";

export const loginBodySchema = z
  .object({
    loginId: z.string().trim().min(1).max(100),
    password: z.string().min(1).max(200),
  })
  .strict();

export type LoginBody = z.infer<typeof loginBodySchema>;
