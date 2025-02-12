import { showNotification } from "@mantine/notifications";
import { getPartUsage_Url, getSkillReq_Url } from "../apiUrls";
import { useAxiosInstance } from "../axiosInstance";


export const useApiSkillAnalysis = () => {
    const axiosInstance = useAxiosInstance();

    const getSkillAnalysis = async (data: any) => {
        try {
          const response = await axiosInstance.post(getSkillReq_Url, data);
          console.log("✅ API Response (skill req):", response);
          showNotification({
            title: "Skill analysis!",
            message: "Successfully Generated Skill Analysis",
            color: "green",
            style: { position: "fixed", bottom: 20, right: 20, zIndex: 1000 },
          });
          return response.data;
        } catch (error: any) {
          console.error("❌ API Error:", error.response?.data || error.message);
    
          // Check if authentication has expired
        //   if (error.response?.data?.detail === "Invalid authentication credentials") {
        //     handleSessionExpired();
        //   }
    
          return null;
        }
      };

    return { getSkillAnalysis };
};
