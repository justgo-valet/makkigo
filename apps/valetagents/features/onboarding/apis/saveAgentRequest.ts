import { apiClient } from "@/libs/common/api/apiClient";

import { parseAgentRequestResponse } from "../schemas/onboarding";

import type { AgentRequestResponse } from "../schemas/onboarding";

interface SaveAgentRequestInput {
  boothId: number;
  workStartTime: string;
  workEndTime: string;
}

const saveAgentRequest = async ({
  boothId,
  workStartTime,
  workEndTime,
}: SaveAgentRequestInput): Promise<AgentRequestResponse> => {
  const response = await apiClient
    .put(`booths/${boothId}/agent-request`, {
      json: { workStartTime, workEndTime },
    })
    .json<unknown>();

  return parseAgentRequestResponse(response);
};

export { saveAgentRequest };
export type { SaveAgentRequestInput };
