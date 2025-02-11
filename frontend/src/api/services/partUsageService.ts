// import { getPartUsage_Url } from "../apiUrls";
// import { useAxiosInstance } from "../axiosInstance";

// export const useApiPartUsage = () => {
//     const axiosInstance = useAxiosInstance();
  
//     const getPartUsage = async (partId: string): Promise<any[]> => {
//       try {
//         const response = await axiosInstance.post(`${getPartUsage_Url}?part_id=${partId}`);
//         return response.data; 
//       } catch (error) {
//         console.error("Task Validation API Error:", error);
//         return [];
//       }
//     };
  
//     return { getPartUsage };
//   };
  