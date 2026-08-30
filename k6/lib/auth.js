import http from "k6/http";

import { BASE_URL } from "../config/env.js";

const COOKIE_OPTIONS = { path: "/", secure: false };

export function attachSession(user) {
  const jar = http.cookieJar();
  jar.set(BASE_URL, "accessToken", user.accessToken, COOKIE_OPTIONS);
  jar.set(BASE_URL, "refreshToken", user.refreshToken, COOKIE_OPTIONS);
}

export function clearSession() {
  const jar = http.cookieJar();
  jar.delete(BASE_URL, "accessToken");
  jar.delete(BASE_URL, "refreshToken");
}
