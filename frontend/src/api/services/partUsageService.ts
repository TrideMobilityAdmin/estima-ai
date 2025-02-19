import { showNotification } from "@mantine/notifications";
import { getPartUsage_Url } from "../apiUrls";
import { useAxiosInstance } from "../axiosInstance";
import { useNavigate } from "react-router-dom";

export const useApiPartUsage = () => {
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

  const getPartUsage = async (partId: string,startDate:any, endDate:any): Promise<any[]> => {
    try {
        const response = await axiosInstance.get(`${getPartUsage_Url}?part_id=${partId}&startDate=${startDate}&endDate=${endDate}`);

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

    return { getPartUsage };
};
