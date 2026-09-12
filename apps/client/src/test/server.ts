import { setupServer } from "msw/node";

import envConfig from "src/config/env";

export const apiUrl = (path: string): string => `${envConfig.VITE_API_ENDPOINT}${path}`;

export const server = setupServer();
