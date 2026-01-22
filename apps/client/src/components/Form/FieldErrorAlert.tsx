import Alert from "@mui/material/Alert";
import type { FieldErrors, FieldValues } from "react-hook-form";

function FieldErrorAlert({ errors, fieldName }: { errors?: FieldErrors<FieldValues>; fieldName: string }) {
  if (!errors || !errors[fieldName]) return null;
  return (
    <Alert severity='error' sx={{ mt: "0.7em", ".MuiAlert-message": { overflow: "hidden" } }}>
      {String(errors[fieldName]?.message ?? "")}
    </Alert>
  );
}

export default FieldErrorAlert;
