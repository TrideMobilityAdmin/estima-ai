import { showAppNotification } from "../../components/showNotificationGlobally";
import { getConfigurations_Url, getEstimateDetails_Url, getEstimateReport_Url, getEstimateStatus_Url, getFilteredTasks_Url, getModelTasksValidate_Url, getHistoryEstimateStatus_Url, getOperatorsList_Url, getProbabilityWise_Url, getValidateTasks_Url, uploadEstimate_Url, getAllEstimatesSummary_Url, getValidatedTasksByID_Url } from "../apiUrls";
// import { useAxiosInstance } from "../axiosInstance";
import { showNotification } from "@mantine/notifications";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../axiosInstance";

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
  // const axiosInstance = useAxiosInstance();
  const navigate = useNavigate();

  // Function to handle session expiration and navigate to login
  const handleSessionExpired = () => {
    // showNotification({
    //   title: "Session Expired!",
    //   message: "Your session has expired. Please log in again.",
    //   color: "red",
    //   style: { position: "fixed", top: 100, right: 20, zIndex: 1000 },
    // });
    showAppNotification("error", "Session Expired!", "Your session has expired. Please log in again.");

    // Clear authentication tokens including CSRF token
    localStorage.removeItem("authToken");
    sessionStorage.removeItem("authToken");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("csrfToken");
    sessionStorage.removeItem("userID");
    sessionStorage.removeItem("username");
    sessionStorage.removeItem("email");

    // Redirect to login page and prevent back navigation
    navigate("/", { replace: true });
  };

  // Function to upload form fields + file
  const RFQFileUpload = async (data: any, file: File | null) => {
    if (!file) {
      showAppNotification(
        "error",
        "Failed!",
        "File is required!"
      );
      return null;
    }

    // Create the estimate_request object that matches the API expectation
    const estimateRequest = {
      tasks: data.tasks,
      probability: data.probability,
      operator: data.operator,
      operatorForModel: data.operatorForModel,
      aircraftRegNo: data.aircraftRegNo,
      aircraftModel: data.aircraftModel, 
      aircraftAge: data.aircraftAge,
      aircraftAgeThreshold: data.aircraftAgeThreshold,
      aircraftFlightHours: data.aircraftFlightHours,
      aircraftFlightCycles: data.aircraftFlightCycles,
      areaOfOperations: data.areaOfOperations,
      cappingDetails: data.cappingDetails,
      additionalTasks: data.additionalTasks,
      typeOfCheck: data.typeOfCheck, 
      typeOfCheckID : data.typeOfCheckID,
      miscLaborTasks: data.miscLaborTasks,
      considerDeltaUnAvTasks: data.considerDeltaUnAvTasks,
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
        // console.log("✅ Upload successful:", response.data);
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
      // console.log("✅ API Response all estimates status :", response);
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

  const getAllHistoryEstimatesStatus = async (params: {
  page: number;
  pageSize: number;
  date?: string;
  estID?: string;
  aircraftRegNo?: string;
  status?: string;
}) => {
  try {
    const query = new URLSearchParams({
      page: params.page.toString(),
      page_size: params.pageSize.toString(),
      ...(params.date ? { date: params.date } : {}),
      ...(params.estID ? { estID: params.estID } : {}),
      ...(params.aircraftRegNo ? { aircraftRegNo: params.aircraftRegNo } : {}),
      ...(params.status ? { status: params.status } : {}),
    });

    const response = await axiosInstance.get(`${getHistoryEstimateStatus_Url}?${query.toString()}`);
    // console.log("✅ API Response all history estimates status:", response);
    return response.data;
  } catch (error: any) {
    console.error("❌ API Error:", error.response?.data || error.message);
    if (error.response?.data?.detail === "Invalid authentication credentials") {
      handleSessionExpired();
    }
    return null;
  }
};



  const getEstimateByID = async (estimateId:any) => {
    try {
      const response = await axiosInstance.get(getEstimateReport_Url+estimateId);
      // console.log("✅ API Response estimate by id :", response);
      showNotification({
        title: "Estimate!",
        message: "Estimate displayed below.",
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


  const validateTasks = async (tasks: string[], description: string[]): Promise<TaskValidationResponse[]> => {
    try {
      const response = await axiosInstance.post(getValidateTasks_Url, { tasks, description });
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

   const getValidatedTasksByID = async (estimateId: string) => {
    try {
      const response = await axiosInstance.post(getValidatedTasksByID_Url + estimateId);
      // console.log("✅ API Response validated by estimate details :", response);
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

  const postEstimateReport = async (data: EstimateReportPayload) => {
    try {
      const response = await axiosInstance.post(getEstimateReport_Url, data);
      // console.log("✅ API Response (Estimate Report):", response);
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
      // console.log("✅ API Response all estimates:", response);
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

  const getOperatorsList = async () => {
    try {
      const response = await axiosInstance.get(getOperatorsList_Url);
      // console.log("✅ API Response all operators:", response);
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

  const getEstimateDetailsByID = async (estimateId: string) => {
    try {
      const response = await axiosInstance.get(getEstimateDetails_Url + estimateId);
      // console.log("✅ API Response estimate details :", response);
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

  const getFilteredTasksByID = async (estimateId: string) => {
    try {
      const response = await axiosInstance.get(getFilteredTasks_Url + estimateId);
      // console.log("✅ API Response filtered tasks :", response);
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


  const getModelTasksValidate = async (data : any) => {
        const payloadRequest = {
          MPD_TASKS: data.MPD_TASKS,
          ADD_TASKS: data.ADD_TASKS,
          check_category: data.typeOfCheck,
          aircraft_age : data.aircraftAge,
          aircraft_model : data.aircraftModel,
          customer_name : data.operator,
          customer_name_consideration : data.operatorForModel,
          age_cap : data.aircraftAgeThreshold
      };

  try {
    const response = await axiosInstance.post(getModelTasksValidate_Url, payloadRequest);
    // console.log("✅ API Response model tasks validate:", response);
    return response.data;
  } catch (error: any) {
    console.error("modal Task Validation API Error:", error.response?.data || error.message);

    if (error.response?.data?.detail === "Invalid authentication credentials") {
      handleSessionExpired();
    }
    return [];
  }
};


const getAllEstimatesSummary = async (startDate : any, endDate : any) => {
    try {
      const response = await axiosInstance.get(`${getAllEstimatesSummary_Url}?start_date=${startDate}&end_date=${endDate}`);
      // console.log("✅ API Response all estimates summary :", response);
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
  const compareUploadFile = async (files: File[], selectedEstID: string) => {
    if (!files.length || !selectedEstID) {
      console.error("Missing required parameters:", { files, selectedEstID });
      return null;
    }
  
    const formData = new FormData();
    files.forEach((file) => {
      formData.append("files", file);
    });
  
    try {
      const response = await axiosInstance.post(
        `${getEstimateReport_Url}${selectedEstID}/compare`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
  
      // console.log("✅ Upload successful:", response.data);
  
      showAppNotification("success", "Success!", "Estimate Comparison Successfully!");
  
      return response;
    } catch (error: any) {
      console.error("❌ Upload failed:", error);
  
      if (error.response?.data?.detail === "Invalid authentication credentials") {
        handleSessionExpired();
        return;
      }
  
      if (error.response?.data?.detail) {
        // Special case for missing sheets error
        if (error.response.data.detail === "One or more required sheets are missing from the uploaded files.") {
          showAppNotification("error", "Upload Failed!", "Flease select valid Actual files.");
        } else {
          showAppNotification("error", "Upload Failed!", error.response.data.detail);
        }
      } else if (error.response?.data?.message) {
        showAppNotification("error", "Upload Failed!", error.response.data.message);
      } else {
        showAppNotification("error", "Upload Failed!", "Failed to upload. Please try again.");
      }
  
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
      // console.log("✅ API Response all expert inssights:", response);
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
      // console.log("✅ API Response probability wise :", response);
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
      // console.log("✅ API Response probability wise update:", response);
      
      showNotification({
        title: "Success!",
        message: "Successfully updated data",
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
          message: "Failed to update data, please try again...",
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
      // console.log("✅ API Response update remark:", response);
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
    getAllHistoryEstimatesStatus,
    compareUploadFile, 
    downloadEstimatePdf,
    getAllDataExpertInsights,
    getProbabilityWiseDetails,
    updateProbabilityWiseDetails,
    updateRemarkByEstID,
    getOperatorsList,
    getEstimateDetailsByID,
    getFilteredTasksByID,
    getModelTasksValidate,
    getAllEstimatesSummary,
    getValidatedTasksByID
  };
};
