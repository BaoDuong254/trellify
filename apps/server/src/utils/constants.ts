import environmentConfig from "src/config/environment";

export const WHITELIST_DOMAINS = [
  // "http://localhost:4173",
  // "http://localhost:5173",
  environmentConfig.CLIENT_URL,
];
