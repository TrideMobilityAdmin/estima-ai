import { showNotification } from "@mantine/notifications";
import { getPartUsage_Url, getSkillReq_Url } from "../apiUrls";
import { useAxiosInstance } from "../axiosInstance";
import { showAppNotification } from "../../components/showNotificationGlobally";


export const useApiSkillAnalysis = () => {
    const axiosInstance = useAxiosInstance();

    const getSkillAnalysis = async (data: any) => {
        try {
          const response = await axiosInstance.post(getSkillReq_Url, data);
          console.log("✅ API Response (skill req):", response);
          // showAppNotification("success", "Skill analysis!", "Successfully Generated Skill Analysis");
          return response.data;
        } catch (error: any) {
          console.error("❌ API Error:", error.response?.data || error.message);
          showAppNotification("error", "Failed!", "Skill Analysis failed, try agian");
          // Check if authentication has expired
        //   if (error.response?.data?.detail === "Invalid authentication credentials") {
        //     handleSessionExpired();
        //   }
    
          return null;
        }
      };

    return { getSkillAnalysis };
};
