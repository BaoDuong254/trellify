import { ThemeProvider } from "@mui/material/styles";
import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { render } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";

import { activeBoardReducer } from "src/redux/activeBoard/activeBoardSlice";
import { activeCardReducer } from "src/redux/activeCard/activeCardSlice";
import { notificationsReducer } from "src/redux/notifications/notificationsSlice";
import { userReducer } from "src/redux/user/userSlice";
import theme from "src/theme";

const rootReducer = combineReducers({
  activeBoard: activeBoardReducer,
  user: userReducer,
  activeCard: activeCardReducer,
  notifications: notificationsReducer,
});

type TestState = ReturnType<typeof rootReducer>;

const createTestStore = (preloadedState?: Partial<TestState>) =>
  configureStore({
    reducer: rootReducer,
    preloadedState,
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
  });

type TestStore = ReturnType<typeof createTestStore>;

type RenderOptions = {
  store?: TestStore;
  route?: string;
};

export const renderWithProviders = (
  ui: ReactElement,
  { store = createTestStore(), route = "/" }: RenderOptions = {}
): { store: TestStore; unmount: () => void } => {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={store}>
      <MemoryRouter initialEntries={[route]}>
        <ThemeProvider theme={theme}>{children}</ThemeProvider>
      </MemoryRouter>
    </Provider>
  );

  const { unmount } = render(ui, { wrapper: Wrapper });
  return { store, unmount };
};
