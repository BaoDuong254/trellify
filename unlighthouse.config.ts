import { defineUnlighthouseConfig } from "unlighthouse/config";

const site = process.env.UNLIGHTHOUSE_SITE ?? "https://trellify.duonggiabao.com";
const domain = new URL(site).hostname;

const accessToken = process.env.UNLIGHTHOUSE_ACCESS_TOKEN;
const refreshToken = process.env.UNLIGHTHOUSE_REFRESH_TOKEN;
const persistRoot = process.env.UNLIGHTHOUSE_PERSIST_ROOT;
const boardId = process.env.UNLIGHTHOUSE_BOARD_ID;

const session = accessToken && refreshToken && persistRoot ? { accessToken, refreshToken, persistRoot } : undefined;

const publicUrls = ["/login", "/register", "/forgot-password", "/not-found"];
const authenticatedUrls = ["/boards", ...(boardId ? [`/boards/${boardId}`] : []), "/settings/account"];

export default defineUnlighthouseConfig({
  site,
  outputPath: session ? ".unlighthouse/authenticated" : ".unlighthouse/public",
  scanner: {
    device: "desktop",
    samples: process.env.CI ? 3 : 1,
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
  urls: session ? authenticatedUrls : publicUrls,
  hooks: session
    ? {
        async authenticate(page) {
          await page.goto(`${site}/robots.txt`);
          const context = page.browser().defaultBrowserContext();
          await context.setCookie(
            ...(["accessToken", "refreshToken"] as const).map((name) => ({
              name,
              value: session[name],
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
      }
    : {},
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
