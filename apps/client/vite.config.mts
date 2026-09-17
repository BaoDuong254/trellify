import { sentryVitePlugin } from "@sentry/vite-plugin";
import react from "@vitejs/plugin-react-swc";
import type { Plugin } from "vite";
import svgr from "vite-plugin-svgr";
import { defineConfig } from "vitest/config";

const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN;
const uploadSourceMaps = Boolean(sentryAuthToken);

const SITE_URL = "https://trellify.duonggiabao.com";

interface IndexablePage {
  route: string;
  title: string;
  description: string;
}

const INDEXABLE_PAGES: IndexablePage[] = [
  {
    route: "login",
    title: "Log in | Trellify",
    description:
      "Log in to Trellify to manage your Kanban boards, collaborate with your team in real time, and keep every project on track.",
  },
  {
    route: "register",
    title: "Sign up | Trellify",
    description:
      "Create a free Trellify account to organize work with drag-and-drop Kanban boards and real-time team collaboration.",
  },
];

type Replacement = readonly [RegExp, string];

const escapeAttribute = (value: string): string =>
  value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

const replaceOnce = (html: string, pattern: RegExp, replacement: string): string => {
  if (!pattern.test(html)) {
    throw new Error(`indexable-pages: pattern ${String(pattern)} not found in index.html`);
  }
  return html.replace(pattern, replacement);
};

const renderIndexablePage = (html: string, page: IndexablePage): string => {
  const url = `${SITE_URL}/${page.route}`;
  const title = escapeAttribute(page.title);
  const description = escapeAttribute(page.description);
  const metaContent = (attribute: "name" | "property", key: string, value: string): Replacement => [
    new RegExp(`(<meta\\s+${attribute}="${key}"\\s+content=")[^"]*(")`),
    `$1${value}$2`,
  ];

  const replacements: Replacement[] = [
    [/<title>[^<]*<\/title>/, `<title>${title}</title>\n    <link rel="canonical" href="${url}" />`],
    [/\s*<meta\s+name="robots"\s+content="noindex"\s*\/>/, ""],
    metaContent("name", "title", title),
    metaContent("name", "description", description),
    metaContent("property", "og:url", url),
    metaContent("property", "og:title", title),
    metaContent("property", "og:description", description),
    metaContent("name", "twitter:url", url),
    metaContent("name", "twitter:title", title),
    metaContent("name", "twitter:description", description),
  ];

  return replacements.reduce((result, [pattern, replacement]) => replaceOnce(result, pattern, replacement), html);
};

const indexablePages = (): Plugin => ({
  name: "indexable-pages",
  apply: "build",
  enforce: "post",
  generateBundle(_options, bundle) {
    const indexHtml = bundle["index.html"];
    if (indexHtml?.type !== "asset" || typeof indexHtml.source !== "string") {
      throw new Error("indexable-pages: index.html asset missing from bundle");
    }
    for (const page of INDEXABLE_PAGES) {
      this.emitFile({
        type: "asset",
        fileName: `${page.route}.html`,
        source: renderIndexablePage(indexHtml.source, page),
      });
    }
  },
});

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    svgr(),
    indexablePages(),
    sentryVitePlugin({
      org: "baoduong254",
      project: "trellify",
      authToken: sentryAuthToken,
      disable: !uploadSourceMaps,
      telemetry: false,
      release: { setCommits: false },
      sourcemaps: { filesToDeleteAfterUpload: ["dist/**/*.map"] },
    }),
  ],
  css: {
    devSourcemap: true,
  },
  resolve: {
    tsconfigPaths: true,
  },
  build: {
    sourcemap: uploadSourceMaps ? "hidden" : false,
    chunkSizeWarningLimit: 900,
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.spec.{ts,tsx}"],
    setupFiles: ["src/test/setup.ts"],
    env: {
      VITE_API_ENDPOINT: "http://api.trellify.test",
      VITE_TURNSTILE_SITE_KEY: "1x00000000000000000000AA",
    },
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.spec.{ts,tsx}", "src/test/**", "src/main.tsx", "src/**/*.d.ts"],
    },
  },
});
