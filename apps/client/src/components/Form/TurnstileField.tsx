import { Turnstile } from "@marsidev/react-turnstile";
import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import { useState } from "react";

import envConfig from "src/config/env";

interface TurnstileFieldProps {
  onSuccess: (token: string) => void;
  onExpire: () => void;
  onError: () => void;
}

function TurnstileField({ onSuccess, onExpire, onError }: TurnstileFieldProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <Box sx={{ mb: "0.5em", display: "flex", justifyContent: "center" }}>
      <Box sx={{ position: "relative", width: 300, height: 65 }}>
        {!isLoaded && (
          <Skeleton
            variant='rectangular'
            width={300}
            height={65}
            sx={{ borderRadius: 1, position: "absolute", top: 0, left: 0 }}
          />
        )}
        <Turnstile
          siteKey={envConfig.VITE_TURNSTILE_SITE_KEY}
          onSuccess={onSuccess}
          onExpire={onExpire}
          onError={onError}
          onLoad={() => setIsLoaded(true)}
          options={{ theme: "auto" }}
        />
      </Box>
    </Box>
  );
}

TurnstileField.displayName = "TurnstileField";

export default TurnstileField;
