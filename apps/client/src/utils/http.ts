import axios from "axios";
import { toast } from "react-toastify";
import { interceptorLoadingElements } from "src/utils/formatters";

// Create an axios instance
const http = axios.create();
// Set timeout and withCredentials for all requests
http.defaults.timeout = 1000 * 60 * 10;
http.defaults.withCredentials = true;

// Request interceptor
http.interceptors.request.use(
  (config) => {
    interceptorLoadingElements(true);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
http.interceptors.response.use(
  (response) => {
    interceptorLoadingElements(false);
    return response;
  },
  (error) => {
    interceptorLoadingElements(false);

    let errorMessage = error?.message;

    if (error.response?.data?.message) {
      const rawMessage = error.response.data.message;

      // Try to parse if it's a JSON string containing validation errors
      try {
        const parsedErrors = JSON.parse(rawMessage);
        if (Array.isArray(parsedErrors) && parsedErrors.length > 0) {
          // Extract all error messages and join them
          const messages = parsedErrors.map((err: { message?: string }) => err.message).filter(Boolean);

          errorMessage = messages.length > 0 ? messages.join(", ") : rawMessage;
        } else {
          errorMessage = rawMessage;
        }
      } catch {
        // If parsing fails, use the raw message
        errorMessage = rawMessage;
      }
    }

    if (error.response?.status !== 410) {
      toast.error(errorMessage);
    }

    return Promise.reject(error);
  }
);

export default http;
