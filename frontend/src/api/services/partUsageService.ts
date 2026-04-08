import { showNotification } from "@mantine/notifications";
import { getMultiPartUsage_Url, getPartUsage_Url } from "../apiUrls";
// import  { useAxiosInstance } from "../axiosInstance";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../axiosInstance";

export const useApiPartUsage = () => {
    // const axiosInstance = useAxiosInstance();
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

  const getPartUsage = async (partId: string,startDate:any, endDate:any): Promise<any[]> => {
    try {
        const response = await axiosInstance.get(`${getPartUsage_Url}?part_id=${partId}&startDate=${startDate}&endDate=${endDate}`);

        // console.log("response part single >>>>",response.data);
        
        if (Object.keys(response.data.data).length > 0) {
            showNotification({
                title: "Successful!",
                message: "Part Usage Generated",
                color: "green",
                style: { position: "fixed", bottom: 20, right: 20, zIndex: 1000 },
            });
        } else {
            showNotification({
                title: "Not Found!",
                message: "No Part Found, Try another ID",
                color: "red",
                style: { position: "fixed", bottom: 20, right: 20, zIndex: 1000 },
            });
        }

        return response.data.data;
    } catch (error: any) {
        console.error("Task Validation API Error:", error);

        // Check if authentication has expired
        if (error.response?.data?.detail === "Invalid authentication credentials") {
            handleSessionExpired();
        }

        showNotification({
            title: "Error!",
            message: "Failed to fetch part usage. Please try again.",
            color: "red",
            style: { position: "fixed", top: 100, right: 20, zIndex: 1000 },
        });

        return [];
    }
};


const getMultiPartUsage = async (partIds: string[], startDate: any, endDate: any): Promise<any[]> => {
    try {
        // Prepare the request body
        const requestBody = partIds;

        // Make the POST request
        const response = await axiosInstance.post(`${getMultiPartUsage_Url}?startDate=${startDate}&endDate=${endDate}`, requestBody);
        // console.log("response part multiple >>>>", response.data);
        if (response.data?.findingsHMVParts?.length > 0 &&
            response.data?.findingsNonHMVTasks?.length > 0 &&
            response.data?.taskParts?.length > 0) {
            showNotification({
                title: "Successful!",
                message: "Part Usage Analysis",
                color: "green",
                style: { position: "fixed", bottom: 20, right: 20, zIndex: 1000 },
            });
        } else if (
            response.data?.findingsHMVParts?.length === 0 &&
            response.data?.findingsNonHMVTasks?.length === 0 &&
            response.data?.taskParts?.length === 0
          )
           {
            showNotification({
                title: "Not Found!",
                message: "No Data Found, Try another Part ID",
                color: "red",
                style: { position: "fixed", bottom: 20, right: 20, zIndex: 1000 },
            });
        }

        // console.log("response multiple >>>>", response.data);

        return response.data;
    } catch (error: any) {
        console.error("Task Validation API Error:", error);

        // Check if authentication has expired
        if (error.response?.data?.detail === "Invalid authentication credentials") {
            handleSessionExpired();
        }

        showNotification({
            title: "Error!",
            message: "Failed to fetch part usage. Please try again.",
            color: "red",
            style: { position: "fixed", top: 100, right: 20, zIndex: 1000 },
        });

        return [];
    }
};

    return { getPartUsage, getMultiPartUsage};
};
