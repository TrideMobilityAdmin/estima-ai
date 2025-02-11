import axios from "axios";
import { baseUrl } from "./apiUrls";
import { useAtom } from "jotai";
import { userToken } from "../components/tokenJotai";

export const useAxiosInstance = () => {
  const [token] = useAtom(userToken);

  const axiosInstance = axios.create({
    baseURL: baseUrl,
  });

  axiosInstance.interceptors.request.use(
    (config) => {
      console.log("🔄 Token Retrieved in Axios Instance:", token);

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      } else {
        console.warn("⚠️ No token found!");
      }

      return config;
    },
    (error) => Promise.reject(error)
  );

  return axiosInstance;
};
