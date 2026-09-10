import { Turnstile } from "@marsidev/react-turnstile";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useState } from "react";

import envConfig from "src/config/env";
import type { TurnstileWidgetProps } from "src/hooks/useTurnstile";

function TurnstileField({
  ref,
  active,
  onSuccess,
  onExpire,
  onError,
  onTimeout,
  onBeforeInteractive,
}: TurnstileWidgetProps) {
  const [interactionRequired, setInteractionRequired] = useState(false);

  if (!active) return null;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        mb: interactionRequired ? "0.5em" : 0,
      }}
    >
      {interactionRequired && (
        <Typography variant='body2' sx={{ mb: "0.5em", textAlign: "center", color: "text.secondary" }}>
          Please confirm you are human to continue.
        </Typography>
      )}
      <Turnstile
        ref={ref}
        siteKey={envConfig.VITE_TURNSTILE_SITE_KEY}
        onSuccess={onSuccess}
        onExpire={onExpire}
        onError={onError}
        onTimeout={onTimeout}
        onBeforeInteractive={() => {
          setInteractionRequired(true);
          onBeforeInteractive();
        }}
        onAfterInteractive={() => setInteractionRequired(false)}
        options={{ theme: "auto", appearance: "interaction-only" }}
      />
    </Box>
  );
}

TurnstileField.displayName = "TurnstileField";

export default TurnstileField;
