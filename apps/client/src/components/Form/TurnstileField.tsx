import Box from "@mui/material/Box";
import { Turnstile } from "@marsidev/react-turnstile";
import envConfig from "src/config/env";

interface TurnstileFieldProps {
  onSuccess: (token: string) => void;
  onExpire: () => void;
  onError: () => void;
}

function TurnstileField({ onSuccess, onExpire, onError }: TurnstileFieldProps) {
  return (
    <Box sx={{ mt: "1em", display: "flex", justifyContent: "center" }}>
      <Turnstile
        siteKey={envConfig.VITE_TURNSTILE_SITE_KEY}
        onSuccess={onSuccess}
        onExpire={onExpire}
        onError={onError}
        options={{ theme: "auto" }}
      />
    </Box>
  );
}

TurnstileField.displayName = "TurnstileField";

export default TurnstileField;
