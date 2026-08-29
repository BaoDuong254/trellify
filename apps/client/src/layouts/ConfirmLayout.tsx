import { ConfirmProvider } from "material-ui-confirm";
import { Outlet } from "react-router-dom";

function ConfirmLayout() {
  return (
    <ConfirmProvider
      defaultOptions={{
        allowClose: false,
        dialogProps: { maxWidth: "xs" },
        buttonOrder: ["confirm", "cancel"],
        cancellationButtonProps: { color: "inherit" },
        confirmationButtonProps: { color: "secondary", variant: "outlined" },
      }}
    >
      <Outlet />
    </ConfirmProvider>
  );
}

export default ConfirmLayout;
