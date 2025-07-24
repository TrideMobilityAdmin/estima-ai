// src/api/axiosInstance.ts
import axios from "axios";
import { baseUrl } from "./apiUrls";

const axiosInstance = axios.create({
  baseURL: baseUrl,
});

axiosInstance.interceptors.request.use(
  (config) => {
    let token = sessionStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if ([401, 403].includes(error?.response?.status)) {
      sessionStorage.clear();
      window.location.href = "/";
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;

// // src/api/useAxiosInstance.js
// import axios from "axios";
// import { baseUrl } from "./apiUrls";
// import { useAtom } from "jotai";
// import { userToken } from "./tokenJotai";

// export const useAxiosInstance = () => {
//   const [token] = useAtom(userToken);

//   const axiosInstance = axios.create({
//     baseURL: baseUrl,
//   });

//   axiosInstance.interceptors.request.use(
//     (config) => {
//       // Try to get token from Jotai state first, then fall back to sessionStorage
//       let authToken = token;
      
//       // If token is empty in Jotai state, try to get it from sessionStorage
//       if (!authToken && typeof window !== 'undefined') {
//         authToken = sessionStorage.getItem('token');
//       }

//       if (authToken) {
//         config.headers.Authorization = `Bearer ${authToken}`;
//         console.log("🔄 Token Applied in Request:", authToken.substring(0, 10) + "...");
//       } else {
//         console.warn("⚠️ No token found in state or sessionStorage!");
//       }

//       return config;
//     },
//     (error) => Promise.reject(error)
//   );

//   // Add response interceptor to handle token expiration
//   axiosInstance.interceptors.response.use(
//     (response) => response,
//     (error) => {
//       if (error.response && (error.response.status === 401 || error.response.status === 403)) {
//         console.log("⚠️ Token expired or unauthorized. Redirecting to login...");
//         // Clear auth state
//         if (typeof window !== 'undefined') {
//           sessionStorage.removeItem('token');
//           sessionStorage.removeItem('userID');
//           sessionStorage.removeItem('username');
//           sessionStorage.removeItem('email');
          
//           // Redirect to login page
//           window.location.href = '/';
//         }
//       }
//       return Promise.reject(error);
//     }
//   );

//   return axiosInstance;
// };