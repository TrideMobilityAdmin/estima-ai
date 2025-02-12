import { getEstimateReport_Url, getValidateTasks_Url } from "../apiUrls";
import { useAxiosInstance } from "../axiosInstance";

export interface EstimateReportPayload {
  tasks: string[];
  probability: number;
  operator: string;
  aircraftAge: number;
  aircraftFlightHours: number;
  aircraftFlightCycles: number;
}

interface TaskValidationResponse {
  taskId: string;
  status: Boolean; // false = invalid, true = valid
}

export const useApi = () => {
  const axiosInstance = useAxiosInstance();

  const validateTasks = async (tasks: string[]): Promise<TaskValidationResponse[]> => {
    try {
      const response = await axiosInstance.post(getValidateTasks_Url, { tasks });
      return response.data; 
    } catch (error) {
      console.error("Task Validation API Error:", error);
      return [];
    }
  };


  const postEstimateReport = async (data: EstimateReportPayload) => {
    try {
      const response = await axiosInstance.post(getEstimateReport_Url, data);
      console.log("✅ API Response (Estimate Report):", response);
      return response.data;
    } catch (error: any) {
      console.error("❌ API Error:", error.response?.data || error.message);
      return null;
    }
  };

  return { postEstimateReport,validateTasks };
};
