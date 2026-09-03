import { useColorScheme } from "@mui/material/styles";
import { Toaster } from "sonner";

export default function AppToaster() {
  const { mode } = useColorScheme();

  return <Toaster position='bottom-left' richColors theme={mode ?? "system"} />;
}
