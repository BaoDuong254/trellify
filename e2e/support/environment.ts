import path from "node:path";

import { config } from "dotenv";

const E2E_ROOT = path.resolve(import.meta.dirname, "..");

export const E2E_ENVIRONMENT: Record<string, string> =
  config({ path: path.join(E2E_ROOT, "e2e.env"), quiet: true }).parsed ?? {};

const required = (name: string): string => {
  const value = E2E_ENVIRONMENT[name];
  if (!value) throw new Error(`${name} is missing from e2e/e2e.env`);
  return value;
};

export const REPO_ROOT = path.resolve(E2E_ROOT, "..");
export const AUTH_STATE_PATH = path.join(E2E_ROOT, ".auth", "user.json");

export const API_URL = required("VITE_API_ENDPOINT");
export const CLIENT_URL = required("CLIENT_URL");
export const MONGODB_URI = required("MONGODB_URI");
export const DATABASE_NAME = required("DATABASE_NAME");
export const TURNSTILE_SITE_KEY = required("VITE_TURNSTILE_SITE_KEY");
export const E2E_USER = {
  email: required("E2E_USER_EMAIL"),
  password: required("E2E_USER_PASSWORD"),
};
