import { getEstimateReport_Url, getValidateTasks_Url } from "../apiUrls";
import { useAxiosInstance } from "../axiosInstance";
import { showNotification } from "@mantine/notifications";
import { useNavigate } from "react-router-dom";

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
  status: boolean; // false = invalid, true = valid
}

export const useApi = () => {
  const axiosInstance = useAxiosInstance();
  const navigate = useNavigate();

  // Function to handle session expiration and navigate to login
  const handleSessionExpired = () => {
    showNotification({
      title: "Session Expired!",
      message: "Your session has expired. Please log in again.",
      color: "red",
      style: { position: "fixed", top: 100, right: 20, zIndex: 1000 },
    });

    // Clear authentication tokens (modify as needed)
    localStorage.removeItem("authToken");
    sessionStorage.removeItem("authToken");

    // Redirect to login page and prevent back navigation
    navigate("/", { replace: true });
  };

  const validateTasks = async (tasks: string[]): Promise<TaskValidationResponse[]> => {
    try {
      const response = await axiosInstance.post(getValidateTasks_Url, { tasks });
      return response.data;
    } catch (error: any) {
      console.error("❌ Task Validation API Error:", error.response?.data || error.message);

      // Check if authentication has expired
      if (error.response?.data?.detail === "Invalid authentication credentials") {
        handleSessionExpired();
      }

      return [];
    }
  };

  const postEstimateReport = async (data: EstimateReportPayload) => {
    try {
      const response = await axiosInstance.post(getEstimateReport_Url, data);
      console.log("✅ API Response (Estimate Report):", response);
      showNotification({
        title: "Estimate Generated!",
        message: "Successfully Estimate Report Generated",
        color: "green",
        style: { position: "fixed", bottom: 20, right: 20, zIndex: 1000 },
      });
      return response.data;
    } catch (error: any) {
      console.error("❌ API Error:", error.response?.data || error.message);

      // Check if authentication has expired
      if (error.response?.data?.detail === "Invalid authentication credentials") {
        handleSessionExpired();
      }

      return null;
    }
  };

  const getAllEstimates = async () => {
    try {
      const response = await axiosInstance.get(getEstimateReport_Url);
      console.log("✅ API Response all estimates:", response);
      return response.data;
    } catch (error: any) {
      console.error("❌ API Error:", error.response?.data || error.message);
      // Check if authentication has expired
      if (error.response?.data?.detail === "Invalid authentication credentials") {
        handleSessionExpired();
      }
      return null;
    }
  };

  // New function to upload a file with Estimate ID
  const uploadFile = async (file : any, selectedEstID : any) => {
    if (!file || !selectedEstID) {
      console.error('Missing required parameters:', { file, selectedEstID });
      return null;
    }

    // Create FormData
    const formData = new FormData();
    formData.append('file', file);

    try {
      // Make the API call with the file in FormData and estimateId in URL
      const response = await axiosInstance.post(
        `${getEstimateReport_Url}${selectedEstID}/compare`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      console.log('✅ Upload successful:', response.data);
      showNotification({
        title: 'Success!',
        message: 'File uploaded successfully',
        color: 'green',
      });

      return response;
    } catch (error : any) {
      console.error('❌ Upload failed:', error);
      
      // Handle session expiration
      if (error.response?.data?.detail === 'Invalid authentication credentials') {
        handleSessionExpired();
      }

      showNotification({
        title: 'Upload Failed',
        message: error.response?.data?.message || 'Failed to upload file',
        color: 'red',
      });

      throw error;
    }
  };


  return { postEstimateReport, validateTasks, getAllEstimates,uploadFile };
};
