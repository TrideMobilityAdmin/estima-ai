// src/api/axiosInstance.ts

// src/api/axiosInstance.ts
import axios from "axios";
import { baseUrl } from "./apiUrls";

const axiosInstance = axios.create({
  baseURL: baseUrl,
  withCredentials: true,
});

axiosInstance.interceptors.request.use(
  (config: any) => {
    const token = sessionStorage.getItem("token");
    const csrfToken = sessionStorage.getItem("csrfToken");
    const method = config.method?.toLowerCase();

    // Ensure headers exist
    if (!config.headers) {
      config.headers = {};
    }

    // Ensure Content-Type is set for POST/PUT/DELETE requests
    if (["post", "put", "delete"].includes(method || "")) {
      if (!config.headers["Content-Type"]) {
        config.headers["Content-Type"] = "application/json";
      }
    }

    if (method === "get") {
      // ✅ Only attach access token for GET requests
      if (token) {
        (config.headers as any).Authorization = `Bearer ${token}`;
        console.log("🔍 GET Request - Using Access Token:", token.substring(0, 20) + "...");
      }
    } else if (["post", "put", "delete"].includes(method || "")) {
      // ✅ Attach both access token and CSRF token for POST, PUT, DELETE
      if (token) {
        (config.headers as any).Authorization = `Bearer ${token}`;
      }
      if (csrfToken) {
        (config.headers as any)["X-CSRF-Token"] = csrfToken;
        // Clear ALL existing csrf_token cookies first (multiple attempts to ensure cleanup)
        document.cookie = `csrf_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
        document.cookie = `csrf_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${window.location.hostname}`;
        document.cookie = `csrf_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=localhost`;
        document.cookie = `csrf_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.localhost`;
        // Set the same CSRF token as cookie immediately
        document.cookie = `csrf_token=${csrfToken}; path=/; SameSite=Lax; Secure=false`;
        // Force axios to include cookies by ensuring withCredentials is true
        config.withCredentials = true;
        // Remove manual Cookie header setting as browsers don't allow it
        // The cookie will be automatically included by axios due to withCredentials: true
      }
      console.log(`📤 ${method?.toUpperCase()} in axios instance Request - Using:`, {
        accessToken: token ? token.substring(0, 20) + "..." : "No token",
        csrfToken: csrfToken ? csrfToken.substring(0, 20) + "..." : "No CSRF token"
      });
      console.log("📤 Request Headers being sent:", config.headers);
      console.log("🍪 Current cookies in browser:", document.cookie);
      console.log("🌐 Request URL:", config.url);
      console.log("🌐 Base URL:", config.baseURL);
    }

    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    console.log("🚨 Axios Error Details:", {
      status: error?.response?.status,
      statusText: error?.response?.statusText,
      data: error?.response?.data,
      headers: error?.response?.headers,
      config: error?.config,
      message: error?.message
    });
    
    if ([401, 403].includes(error?.response?.status)) {
      sessionStorage.clear();
      window.location.href = "/";
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;

// import axios from "axios";
// import { baseUrl } from "./apiUrls";

// const axiosInstance = axios.create({
//   baseURL: baseUrl,
// });

// axiosInstance.interceptors.request.use(
//   (config) => {
//     let token = sessionStorage.getItem("token");
//     if (token) {
//       config.headers.Authorization = `Bearer ${token}`;
//     }
//     return config;
//   },
//   (error) => Promise.reject(error)
// );

// axiosInstance.interceptors.response.use(
//   (response) => response,
//   (error) => {
//     if ([401, 403].includes(error?.response?.status)) {
//       sessionStorage.clear();
//       window.location.href = "/";
//     }
//     return Promise.reject(error);
//   }
// );

// export default axiosInstance;

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