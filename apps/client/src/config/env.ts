const VITE_API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT ?? "";
const VITE_TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY ?? "";

if (!VITE_TURNSTILE_SITE_KEY) {
  throw new Error("Invalid environment variables: VITE_TURNSTILE_SITE_KEY is required");
}

const envConfig = {
  VITE_API_ENDPOINT,
  VITE_TURNSTILE_SITE_KEY,
};

export default envConfig;
