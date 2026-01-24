import axios, { type AxiosError } from "axios";
import { toast } from "react-toastify";
import { refreshTokenAPI } from "src/apis";
import { logoutUserAPI } from "src/redux/user/userSlice";
import { interceptorLoadingElements } from "src/utils/formatters";
import type { store } from "src/redux/store";

let axiosReduxStore: typeof store | undefined;
export const injectStore = (mainStore: typeof store): void => {
  axiosReduxStore = mainStore;
};

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
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

let refreshTokenPromise: Promise<void> | null = null;
// Response interceptor
http.interceptors.response.use(
  (response) => {
    interceptorLoadingElements(false);
    return response;
  },
  async (error: AxiosError) => {
    interceptorLoadingElements(false);

    if (error.response?.status === 401) {
      axiosReduxStore?.dispatch(logoutUserAPI(false));
    }

    const originalRequests = error.config;

    if (error.response?.status === 410 && originalRequests) {
      if (!refreshTokenPromise) {
        refreshTokenPromise = refreshTokenAPI()
          .then(() => {})
          .catch((error: AxiosError) => {
            axiosReduxStore?.dispatch(logoutUserAPI(false));
            return Promise.reject(error);
          })
          .finally(() => {
            refreshTokenPromise = null;
          });
      }

      return refreshTokenPromise.then(() => {
        return http(originalRequests);
      });
    }

    let errorMessage = error?.message || "An error occurred";

    if (error.response?.data && typeof error.response.data === "object" && "message" in error.response.data) {
      const rawMessage = error.response.data.message as string;

      // Try to parse if it's a JSON string containing validation errors
      try {
        const parsedErrors = JSON.parse(rawMessage) as unknown;
        if (Array.isArray(parsedErrors) && parsedErrors.length > 0) {
          // Extract all error messages and join them
          const messages = parsedErrors
            .map((err: unknown) => {
              if (typeof err === "object" && err !== null && "message" in err) {
                return (err as { message?: string }).message;
              }
              return undefined;
            })
            .filter((msg): msg is string => typeof msg === "string");

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
