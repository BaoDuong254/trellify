import CssBaseline from "@mui/material/CssBaseline";
import GlobalStyles from "@mui/material/GlobalStyles";
import { ThemeProvider } from "@mui/material/styles";
import * as Sentry from "@sentry/react";
import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { BrowserRouter, createRoutesFromChildren, matchRoutes, useLocation, useNavigationType } from "react-router-dom";
import { persistStore } from "redux-persist";
import { PersistGate } from "redux-persist/integration/react";

import { SENTRY_DSN } from "@workspace/shared/constants/sentry";

import AppToaster from "src/components/AppToaster/AppToaster.tsx";
import ErrorBoundary from "src/components/ErrorBoundary/ErrorBoundary.tsx";
import envConfig from "src/config/env.ts";
import { store } from "src/redux/store.ts";
import theme from "src/theme.ts";
import { injectStore } from "src/utils/http.ts";
import { reloadOnStalePreload } from "src/utils/preloadError.ts";

import App from "./App.tsx";

// eslint-disable-next-line react-refresh/only-export-components
const SENTRY_ENABLED = import.meta.env.PROD;

Sentry.init({
  dsn: SENTRY_DSN,
  tunnel: `${envConfig.VITE_API_ENDPOINT}/api/v1/diagnostics`,
  skipBrowserExtensionCheck: true,
  enabled: SENTRY_ENABLED,
  environment: import.meta.env.MODE,
  dataCollection: {
    userInfo: true,
    httpBodies: [],
  },
  enableMetrics: true,
  integrations: [
    Sentry.reactRouterBrowserTracingIntegration({
      useEffect,
      useLocation,
      useNavigationType,
      createRoutesFromChildren,
      matchRoutes,
    }),
  ],
  tracesSampleRate: 0.1,
  tracePropagationTargets: ["localhost", /^\/api\//],
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

const loadSentryReplay = (): void => {
  import("src/utils/sentryReplay").then(({ replayIntegration }) => Sentry.addIntegration(replayIntegration()));
};

if (SENTRY_ENABLED) {
  addEventListener("load", () => {
    setTimeout(() => {
      if ("requestIdleCallback" in window) {
        requestIdleCallback(loadSentryReplay, { timeout: 2000 });
      } else {
        loadSentryReplay();
      }
    }, 5000);
  });
}

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

const persistor = persistStore(store);

injectStore(store);
reloadOnStalePreload();

const reactErrorHandlers = SENTRY_ENABLED
  ? {
      onUncaughtError: Sentry.reactErrorHandler(),
      onCaughtError: Sentry.reactErrorHandler(),
      onRecoverableError: Sentry.reactErrorHandler(),
    }
  : {};

createRoot(rootElement, reactErrorHandlers).render(
  <StrictMode>
    <Provider store={store}>
      <PersistGate persistor={persistor}>
        <BrowserRouter basename='/'>
          <ThemeProvider theme={theme}>
            <ErrorBoundary>
              <GlobalStyles styles={{ a: { textDecoration: "none" } }} />
              <CssBaseline />
              <App />
              <AppToaster />
            </ErrorBoundary>
          </ThemeProvider>
        </BrowserRouter>
      </PersistGate>
    </Provider>
  </StrictMode>
);
