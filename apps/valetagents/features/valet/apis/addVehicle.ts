import { apiClient } from "@/libs/common/api/apiClient";

const addVehicle = async (boothId: number, plateNumber: string): Promise<void> => {
  await apiClient.post(`booths/${boothId}/valet-sessions`, { json: { plateNumber } });
};

export { addVehicle };
