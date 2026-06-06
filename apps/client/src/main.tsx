import CssBaseline from "@mui/material/CssBaseline";
import GlobalStyles from "@mui/material/GlobalStyles";
import { ThemeProvider } from "@mui/material/styles";
import { ConfirmProvider } from "material-ui-confirm";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { persistStore } from "redux-persist";
import { PersistGate } from "redux-persist/integration/react";

import ErrorBoundary from "src/components/ErrorBoundary/ErrorBoundary.tsx";
import { store } from "src/redux/store.ts";
import theme from "src/theme.ts";
import { injectStore } from "src/utils/http.ts";

import App from "./App.tsx";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

const persistor = persistStore(store);

injectStore(store);

createRoot(rootElement).render(
  <StrictMode>
    <Provider store={store}>
      <PersistGate persistor={persistor}>
        <BrowserRouter basename='/'>
          <ThemeProvider theme={theme}>
            <ErrorBoundary>
              <ConfirmProvider
                defaultOptions={{
                  allowClose: false,
                  dialogProps: { maxWidth: "xs" },
                  buttonOrder: ["confirm", "cancel"],
                  cancellationButtonProps: { color: "inherit" },
                  confirmationButtonProps: { color: "secondary", variant: "outlined" },
                }}
              >
                <GlobalStyles styles={{ a: { textDecoration: "none" } }} />
                <CssBaseline />
                <App />
                <ToastContainer position='bottom-left' theme='colored' />
              </ConfirmProvider>
            </ErrorBoundary>
          </ThemeProvider>
        </BrowserRouter>
      </PersistGate>
    </Provider>
  </StrictMode>
);
