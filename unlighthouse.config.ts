import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { useUnlighthouse } from "unlighthouse";
import { defineUnlighthouseConfig } from "unlighthouse/config";

const site = process.env.UNLIGHTHOUSE_SITE ?? "https://trellify.duonggiabao.com";
const domain = new URL(site).hostname;

const refreshToken = process.env.UNLIGHTHOUSE_REFRESH_TOKEN;
const persistRoot = process.env.UNLIGHTHOUSE_PERSIST_ROOT;
const boardId = process.env.UNLIGHTHOUSE_BOARD_ID;

const session = refreshToken && persistRoot ? { refreshToken, persistRoot } : undefined;

const publicUrls = ["/login", "/register", "/forgot-password", "/not-found"];
const authenticatedUrls = ["/boards", ...(boardId ? [`/boards/${boardId}`] : []), "/settings/account"];
const urls = session ? authenticatedUrls : publicUrls;

const fetchAccessToken = async (token: string): Promise<string> => {
  const response = await fetch(`${site}/api/v1/users/refresh_token`, { headers: { cookie: `refreshToken=${token}` } });
  const accessToken = response.headers
    .getSetCookie()
    .map((cookie) => /^accessToken=([^;]+)/.exec(cookie)?.[1])
    .find(Boolean);
  if (!response.ok || !accessToken) {
    throw new Error(
      `Refresh token rejected (HTTP ${response.status}). Log in again and update UNLIGHTHOUSE_REFRESH_TOKEN in .env.unlighthouse.`
    );
  }
  return accessToken;
};

interface LighthouseResult {
  finalDisplayedUrl: string;
  runtimeError?: { message: string };
  categories: Record<string, { score: number | null }>;
}

const findUnmeasuredPages = (): string[] => {
  const reports = useUnlighthouse().worker.reports();
  return urls.flatMap((path) => {
    const route = reports.find((report) => report.route.path === path);
    const file = route ? join(route.artifactPath, "lighthouse.json") : undefined;
    if (!file || !existsSync(file)) return [`${path}: no Lighthouse report`];
    const result: LighthouseResult = JSON.parse(readFileSync(file, "utf8"));
    if (result.runtimeError) return [`${path}: ${result.runtimeError.message}`];
    const finalPath = new URL(result.finalDisplayedUrl).pathname;
    if (finalPath !== path) return [`${path}: ended on ${finalPath}`];
    return Object.entries(result.categories)
      .filter(([, category]) => !category.score)
      .map(([key]) => `${path}: ${key} has no score`);
  });
};

const failOnUnmeasuredPages = (): void => {
  const problems = findUnmeasuredPages();
  if (problems.length === 0) return;
  problems.forEach((problem) => console.error(problem));
  process.on("exit", () => {
    process.exitCode = 1;
  });
};

export default defineUnlighthouseConfig({
  site,
  outputPath: session ? ".unlighthouse/authenticated" : ".unlighthouse/public",
  scanner: {
    device: "desktop",
    samples: 1,
  },
  puppeteerClusterOptions: {
    maxConcurrency: 1,
  },
  lighthouseOptions: {
    disableStorageReset: Boolean(session),
    throttlingMethod: "simulate",
    throttling: {
      rttMs: 40,
      throughputKbps: 10 * 1024,
      cpuSlowdownMultiplier: 1,
      requestLatencyMs: 0,
      downloadThroughputKbps: 0,
      uploadThroughputKbps: 0,
    },
  },
  urls,
  hooks: {
    "worker-finished": failOnUnmeasuredPages,
    ...(session && {
      async authenticate(page) {
        const accessToken = await fetchAccessToken(session.refreshToken);
        await page.goto(`${site}/robots.txt`);
        const context = page.browser().defaultBrowserContext();
        await context.setCookie(
          ...Object.entries({ accessToken, refreshToken: session.refreshToken }).map(([name, value]) => ({
            name,
            value,
            domain,
            path: "/",
            secure: true,
            httpOnly: true,
            sameSite: "Lax" as const,
          }))
        );
        const tab = await context.newPage();
        await tab.goto(`${site}/robots.txt`);
        await tab.evaluate((value) => localStorage.setItem("persist:root", value), session.persistRoot);
        await tab.close();
      },
    }),
  },
  ci: {
    budget: {
      performance: 80,
      accessibility: 90,
      "best-practices": 75,
      seo: 60,
    },
    buildStatic: true,
  },
});
