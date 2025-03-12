import { showAppNotification } from "../../components/showNotificationGlobally";
import { getConfigurations_Url, getEstimateReport_Url, getEstimateStatus_Url, getProbabilityWise_Url, getValidateTasks_Url, uploadEstimate_Url } from "../apiUrls";
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
    showAppNotification("error", "Session Expired!", "Your session has expired. Please log in again.");

    // Clear authentication tokens (modify as needed)
    localStorage.removeItem("authToken");
    sessionStorage.removeItem("authToken");

    // Redirect to login page and prevent back navigation
    navigate("/", { replace: true });
  };

  // Function to upload form fields + file
  const RFQFileUpload = async (data: any, file: File | null) => {
    if (!file) {
      showNotification({
        title: "Error",
        message: "File is required",
        color: "red",
      });
      return null;
    }

    // Create the estimate_request object that matches the API expectation
    const estimateRequest = {
      tasks: data.tasks,
      probability: data.probability,
      operator: data.operator,
      aircraftRegNo: data.aircraftRegNo, // Make sure this matches API's expected field name
      aircraftAge: data.aircraftAge,
      aircraftFlightHours: data.aircraftFlightHours,
      aircraftFlightCycles: data.aircraftFlightCycles,
      areaOfOperations: data.areaOfOperations, // Ensure it's not empty
            cappingDetails: data.cappingDetails,
            additionalTasks: data.additionalTasks,
            typeOfCheck: data.typeOfCheck, // Ensure it's not empty
            miscLaborTasks: data.miscLaborTasks
    };

    // Create FormData
    const formData = new FormData();
    formData.append("file", file);
    // Append the estimate_request as a JSON string
    formData.append("estimate_request", JSON.stringify(estimateRequest));
    // formData.append("estimate_request", new Blob([JSON.stringify(estimateRequest)], { type: "application/json" }));


    try {
      const response = await axiosInstance.post(uploadEstimate_Url, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          "Accept": "application/json"
        },
      });

      if (response.status === 200 || response.status === 201) {
        console.log("✅ Upload successful:", response.data);
        showNotification({
          title: "Success!",
          message: "Estimate data uploaded successfully",
          color: "green",
          style: { position: "fixed", bottom: 20, right: 20, zIndex: 1000 },
        });
      }

      return response.data;
    } catch (error: any) {
      console.error("❌ Upload failed:", error);

      if (error.response?.data?.detail === "Invalid authentication credentials") {
        handleSessionExpired();
      }

      showNotification({
        title: "Upload Failed",
        message: error.response?.data?.message || "Failed to upload data, Try agin",
        style: { position: "fixed", bottom: 20, right: 20, zIndex: 1000 },
        color: "red",
      });

      throw error;
    }
  };

  const getAllEstimatesStatus = async () => {
    try {
      const response = await axiosInstance.get(getEstimateStatus_Url);
      console.log("✅ API Response all estimates status :", response);
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


  const getEstimateByID = async (estimateId:any) => {
    try {
      const response = await axiosInstance.get(getEstimateReport_Url+estimateId);
      console.log("✅ API Response estimate by id :", response);
      showNotification({
        title: "Estimate Generated!",
        message: "Successfully Estimate Report Generated",
        color: "green",
        style: { position: "fixed", bottom: 20, right: 20, zIndex: 1000 },
      });
      return response.data;
    } catch (error: any) {
      console.error("❌ API Error:", error.response?.data || error.message);
      if(error.response?.data?.detail?.contains("Internal server error")){
        showNotification({
          title: "Internal server error!",
          message: "Failed,try again...",
          color: "orange",
          style: { position: "fixed", bottom: 20, right: 20, zIndex: 1000 },
        });
      }
      showNotification({
        title: "Failed!",
        message: "Failed report,try again...",
        color: "orange",
        style: { position: "fixed", bottom: 20, right: 20, zIndex: 1000 },
      });
      if (error.response?.data?.detail === "Internal server error: 404: Estimate not found") {
        showNotification({
          title: "Not Found!",
          message: "Estimate Not Found, Try another one",
          color: "orange",
          style: { position: "fixed", bottom: 20, right: 20, zIndex: 1000 },
        });
      }
      // Check if authentication has expired
      if (error.response?.data?.detail === "Invalid authentication credentials") {
        handleSessionExpired();
      }
      return null;
    }
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
  const compareUploadFile = async (file: any, selectedEstID: any) => {
    if (!file || !selectedEstID) {
        console.error("Missing required parameters:", { file, selectedEstID });
        return null;
    }

    // Create FormData
    const formData = new FormData();
    formData.append("file", file);

    try {
        // Make the API call with the file in FormData and estimateId in URL
        const response = await axiosInstance.post(
            `${getEstimateReport_Url}${selectedEstID}/compare`,
            formData,
            {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            }
        );

        console.log("✅ Upload successful:", response.data);

        // Checking if `comparisonResults` array exists and has data
        if (response?.data?.comparisonResults && response.data.comparisonResults.length > 0) {
            showAppNotification("success", "Comparison Success!", "Estimate Compared Successfully");
        } else {
            showAppNotification("error", "No Data!", "No data found, try another file.");
        }

        return response;
    } catch (error: any) {
        console.error("❌ Upload failed:", error);

        // Handle session expiration
        if (error.response?.data?.detail === "Invalid authentication credentials") {
            handleSessionExpired();
        }

        // Show error notification for API failure
        showAppNotification("error", "Upload Failed!", `${error.response?.data?.message || "Failed to upload file, please try again."}`);

        throw error;
    }
};


  // New function to download the PDF
  const downloadEstimatePdf = async (estimateId: string) => {
    try {
      const response = await axiosInstance.get(`${getEstimateReport_Url}${estimateId}/download`, {
        responseType: 'blob', // Important: Set response type to blob
      });

      if (response.status === 200) {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${estimateId}.pdf`); // Set the filename

        // Append to the body and trigger the download
        document.body.appendChild(link);
        link.click();
        link.remove();

        // Clean up the URL object
        window.URL.revokeObjectURL(url);
      } else {
        console.error('Failed to download PDF, status code:', response.status);
      }
    } catch (error: any) {
      console.error('Error downloading PDF:', error.response ? error.response.data : error.message);

      // Handle session expiration
      if (error.response?.data?.detail === 'Invalid authentication credentials') {
        handleSessionExpired();
      } else if (error.response?.data?.detail?.includes("Internal server error")) {
        showAppNotification("warning", "Internal Server Error!", "Failed, try again...");
      } else {
        showAppNotification("error", "Failed!", "Download Failed, try again...");
      }

      // showNotification({
      //   title: 'Download Failed',
      //   message: error.response?.data?.message || 'Failed to download PDF',
      //   color: 'red',
      //   style: { position: "fixed", bottom: 20, right: 20, zIndex: 1000 },
      // });
    }
  };


  const getAllDataExpertInsights = async () => {
    try {
      const response = await axiosInstance.get(getConfigurations_Url);
      console.log("✅ API Response all expert inssights:", response);
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

  const getProbabilityWiseDetails = async (estimateId:any) => {
    try {
      const response = await axiosInstance.get(getProbabilityWise_Url+estimateId);
      console.log("✅ API Response probability wise :", response);
      // showNotification({
      //   title: "Probability wise data !",
      //   message: "Successfully Estimate Report Generated",
      //   color: "green",
      //   style: { position: "fixed", bottom: 20, right: 20, zIndex: 1000 },
      // });
      return response.data;
    } catch (error: any) {
      console.error("❌ API Error:", error.response?.data || error.message);
      if(error.response?.data?.detail?.contains("Internal server error")){
        showNotification({
          title: "Internal server error!",
          message: "Failed,try again...",
          color: "orange",
          style: { position: "fixed", bottom: 20, right: 20, zIndex: 1000 },
        });
      }
      showNotification({
        title: "Failed!",
        message: "Failed Probability wise data,try again...",
        color: "orange",
        style: { position: "fixed", bottom: 20, right: 20, zIndex: 1000 },
      });
      
      // Check if authentication has expired
      if (error.response?.data?.detail === "Invalid authentication credentials") {
        handleSessionExpired();
      }
      return null;
    }
  };

  const updateProbabilityWiseDetails = async (id: string, data:any) => {
    try {
      const response = await axiosInstance.put(
        `${getConfigurations_Url}/${id}`,
        data
      );
      console.log("✅ API Response probability wise update:", response);
      
      showNotification({
        title: "Success!",
        message: "Successfully updated probability wise data",
        color: "green",
        style: { position: "fixed", bottom: 20, right: 20, zIndex: 1000 },
      });
      
      return response.data;
    } catch (error: any) {
      console.error("❌ API Error:", error.response?.data || error.message);
      
      if (error.response?.data?.detail?.includes("Internal server error")) {
        showNotification({
          title: "Internal server error!",
          message: "Failed to update, please try again...",
          color: "orange",
          style: { position: "fixed", bottom: 20, right: 20, zIndex: 1000 },
        });
      } else {
        showNotification({
          title: "Failed!",
          message: "Failed to update probability wise data, please try again...",
          color: "orange",
          style: { position: "fixed", bottom: 20, right: 20, zIndex: 1000 },
        });
      }

      if (error.response?.data?.detail === "Invalid authentication credentials") {
        handleSessionExpired();
      }
      
      throw error;
    }
  };

  const updateRemarkByEstID = async (estimateId:any,data: any) => {
    try {
      const response = await axiosInstance.put(getEstimateReport_Url+estimateId+'/remarks', data);
      console.log("✅ API Response update remark:", response);
      showNotification({
        title: "Updated Successfully!",
        message: "Successfully Updated Remark",
        color: "green",
        style: { position: "fixed", bottom: 20, right: 20, zIndex: 1000 },
      });
      return response.data;
    } catch (error: any) {
      console.error("❌ API Error:", error.response?.data || error.message);

      // Check if authentication has expired
      // if (error.response?.data?.detail === "Invalid authentication credentials") {
      //   handleSessionExpired();
      // }

      return null;
    }
  };


  return { 
    RFQFileUpload, 
    getAllEstimatesStatus, 
    getEstimateByID,
    postEstimateReport, 
    validateTasks, 
    getAllEstimates, 
    compareUploadFile, 
    downloadEstimatePdf,
    getAllDataExpertInsights,
    getProbabilityWiseDetails,
    updateProbabilityWiseDetails,
    updateRemarkByEstID
  };
};
