import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import theme from "src/theme.ts";
import { ToastContainer } from "react-toastify";
import { ConfirmProvider } from "material-ui-confirm";
import { Provider } from "react-redux";
import { store } from "src/redux/store.ts";
import { BrowserRouter } from "react-router-dom";
import { persistStore } from "redux-persist";
import { PersistGate } from "redux-persist/integration/react";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

const persistor = persistStore(store);
createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter basename='/'>
      <Provider store={store}>
        <PersistGate persistor={persistor}>
          <ThemeProvider theme={theme}>
            <ConfirmProvider
              defaultOptions={{
                allowClose: false,
                dialogProps: { maxWidth: "xs" },
                buttonOrder: ["confirm", "cancel"],
                cancellationButtonProps: { color: "inherit" },
                confirmationButtonProps: { color: "secondary", variant: "outlined" },
              }}
            >
              <CssBaseline />
              <App />
              <ToastContainer position='bottom-left' theme='colored' />
            </ConfirmProvider>
          </ThemeProvider>
        </PersistGate>
      </Provider>
    </BrowserRouter>
  </StrictMode>
);
