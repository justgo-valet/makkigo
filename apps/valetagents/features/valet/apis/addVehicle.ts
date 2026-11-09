import { apiClient } from "@/libs/common/api/apiClient";

interface AddVehicleInput {
  plateNumber: string;
  merchantId: number | null;
}

const addVehicle = async (boothId: number, input: AddVehicleInput): Promise<void> => {
  await apiClient.post(`booths/${boothId}/valet-sessions`, { json: input });
};

export { addVehicle };
export type { AddVehicleInput };
