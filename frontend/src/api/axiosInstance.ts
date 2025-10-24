// src/api/axiosInstance.ts

// src/api/axiosInstance.ts
import axios from "axios";
import { baseUrl } from "./apiUrls";

const axiosInstance = axios.create({
  baseURL: baseUrl,
  withCredentials: true,
});

// Check and restore CSRF token on page load
const checkAndRestoreCsrfToken = () => {
  const sessionToken = sessionStorage.getItem("csrfToken");
  const cookieToken = document.cookie
    .split('; ')
    .find(row => row.startsWith('csrf_token='))
    ?.split('=')[1];
  
  if (sessionToken && !cookieToken) {
    // Restore cookie from sessionStorage
    document.cookie = `csrf_token=${sessionToken}; path=/; SameSite=Strict; Secure=false; Max-Age=3600`;
    console.log("🔄 CSRF Token restored from sessionStorage to cookie");
  } else if (cookieToken && !sessionToken) {
    // Restore sessionStorage from cookie
    sessionStorage.setItem("csrfToken", cookieToken);
    console.log("🔄 CSRF Token restored from cookie to sessionStorage");
  }
  
  if (sessionToken || cookieToken) {
    console.log("🔐 CSRF Token Status on Page Load:");
    console.log(`📋 SessionStorage: ${sessionToken ? sessionToken.substring(0, 20) + "..." : "Not set"}`);
    console.log(`🍪 Cookie: ${cookieToken ? cookieToken.substring(0, 20) + "..." : "Not set"}`);
    console.log(`✅ Tokens Match: ${sessionToken === cookieToken ? "YES" : "NO"}`);
  }
};

// Run on page load
if (typeof window !== 'undefined') {
  checkAndRestoreCsrfToken();
}

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
        // Set CSRF token in header
        (config.headers as any)["X-CSRF-Token"] = csrfToken;
        
        // Set CSRF token as cookie (matching backend expectations)
        document.cookie = `csrf_token=${csrfToken}; path=/; SameSite=Strict; Secure=false; Max-Age=3600`;
        
        // Ensure withCredentials is true for cookie inclusion
        config.withCredentials = true;
        
        // Get current cookie value for verification
        const currentCookie = document.cookie
          .split('; ')
          .find(row => row.startsWith('csrf_token='))
          ?.split('=')[1];
        
        // Console log CSRF token and cookie details
        console.log(`🔐 CSRF Token Details for ${method?.toUpperCase()} Request:`);
        console.log(`📋 CSRF Token (Header): ${csrfToken.substring(0, 20)}...`);
        console.log(`🍪 CSRF Token (Cookie): ${currentCookie ? currentCookie.substring(0, 20) + "..." : "Not set"}`);
        console.log(`✅ Tokens Match: ${csrfToken === currentCookie ? "YES" : "NO"}`);
        console.log(`🌐 Request URL: ${config.url}`);
        console.log(`📤 Headers Being Sent:`, {
          'Authorization': config.headers.Authorization ? `${config.headers.Authorization.substring(0, 20)}...` : "Not set",
          'X-CSRF-Token': config.headers['X-CSRF-Token'] ? `${config.headers['X-CSRF-Token'].substring(0, 20)}...` : "Not set",
          'Content-Type': config.headers['Content-Type'] || "Not set"
        });
        console.log(`🍪 All Cookies: ${document.cookie}`);
        
        if (csrfToken !== currentCookie) {
          console.warn("⚠️ CSRF Token mismatch between header and cookie!");
        }
      } else {
        console.error(`❌ No CSRF token found for ${method?.toUpperCase()} request!`);
        console.error("Available tokens:", {
          sessionStorage: sessionStorage.getItem("csrfToken") ? "Present" : "Missing",
          cookies: document.cookie.includes("csrf_token") ? "Present" : "Missing"
        });
      }
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
    
    // if ([401, 403].includes(error?.response?.status)) {
    //   sessionStorage.clear();
    //   window.location.href = "/";
    // }
    return Promise.reject(error);
  }
);

// Global function to check CSRF token status (can be called from browser console)
(window as any).checkCsrfToken = () => {
  const sessionToken = sessionStorage.getItem("csrfToken");
  const cookieToken = document.cookie
    .split('; ')
    .find(row => row.startsWith('csrf_token='))
    ?.split('=')[1];
  
  console.log("🔍 CSRF Token Status Check:");
  console.log(`📋 SessionStorage: ${sessionToken ? sessionToken.substring(0, 20) + "..." : "Not set"}`);
  console.log(`🍪 Cookie: ${cookieToken ? cookieToken.substring(0, 20) + "..." : "Not set"}`);
  console.log(`✅ Tokens Match: ${sessionToken === cookieToken ? "YES" : "NO"}`);
  console.log(`🍪 All Cookies: ${document.cookie}`);
  console.log(`📋 All SessionStorage Keys: ${Object.keys(sessionStorage).join(", ")}`);
  
  return {
    sessionToken,
    cookieToken,
    tokensMatch: sessionToken === cookieToken,
    allCookies: document.cookie,
    sessionStorageKeys: Object.keys(sessionStorage)
  };
};

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