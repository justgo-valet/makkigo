import { z } from "zod";

import { STAFF_NAME_MAX_LENGTH } from "@/libs/booth/contracts/agent-request";

const updateStaffNameBodySchema = z
  .object({ name: z.string().trim().min(1).max(STAFF_NAME_MAX_LENGTH) })
  .strict();

export { STAFF_NAME_MAX_LENGTH, updateStaffNameBodySchema };
export type UpdateStaffNameBody = z.infer<typeof updateStaffNameBodySchema>;
