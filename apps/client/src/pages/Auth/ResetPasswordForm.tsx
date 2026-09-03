import LockResetIcon from "@mui/icons-material/LockReset";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import MuiCard from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useForm } from "react-hook-form";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { resetPasswordAPI } from "src/apis";
import TrelloIcon from "src/assets/trello.svg?react";
import FieldErrorAlert from "src/components/Form/FieldErrorAlert";
import { useAuthShell } from "src/hooks/useAuthShell";
import { authCardSx, authPageSx } from "src/pages/Auth/authLayout";
import {
  FIELD_REQUIRED_MESSAGE,
  PASSWORD_CONFIRMATION_MESSAGE,
  PASSWORD_RULE,
  PASSWORD_RULE_MESSAGE,
} from "src/utils/validators";

interface ResetPasswordFormData {
  password: string;
  passwordConfirmation: string;
}

function ResetPasswordForm() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();

  useAuthShell();

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<ResetPasswordFormData>();

  if (!token) return <Navigate to='/404' />;

  const submitResetPassword = (data: ResetPasswordFormData) => {
    const toastId = toast.loading("Resetting password...");
    resetPasswordAPI({ token, password: data.password })
      .then(() => {
        toast.success("Password reset successfully!", { id: toastId });
        navigate("/login");
      })
      .catch(() => {
        toast.dismiss(toastId);
      });
  };

  return (
    <Box component='main' sx={authPageSx}>
      <form onSubmit={handleSubmit(submitResetPassword)}>
        <MuiCard sx={authCardSx}>
          <Box
            sx={{
              margin: "1em",
              display: "flex",
              justifyContent: "center",
              gap: 1,
            }}
          >
            <Avatar sx={{ bgcolor: "primary.main" }}>
              <LockResetIcon />
            </Avatar>
            <Avatar sx={{ bgcolor: "primary.main" }}>
              <TrelloIcon />
            </Avatar>
          </Box>
          <Box
            sx={{
              marginTop: "1em",
              display: "flex",
              justifyContent: "center",
              color: (theme) => theme.palette.text.secondary,
            }}
          >
            Author: BaoGiaDuong
          </Box>
          <Box sx={{ padding: "0 1em 1em 1em" }}>
            <Box sx={{ marginTop: "1em" }}>
              <TextField
                fullWidth
                label='New Password...'
                type='password'
                variant='outlined'
                error={!!errors.password}
                {...register("password", {
                  required: FIELD_REQUIRED_MESSAGE,
                  pattern: { value: PASSWORD_RULE, message: PASSWORD_RULE_MESSAGE },
                })}
              />
              <FieldErrorAlert errors={errors} fieldName='password' />
            </Box>
            <Box sx={{ marginTop: "1em" }}>
              <TextField
                fullWidth
                label='Confirm New Password...'
                type='password'
                variant='outlined'
                error={!!errors.passwordConfirmation}
                {...register("passwordConfirmation", {
                  validate: (value: string) => value === getValues("password") || PASSWORD_CONFIRMATION_MESSAGE,
                })}
              />
              <FieldErrorAlert errors={errors} fieldName='passwordConfirmation' />
            </Box>
          </Box>
          <CardActions sx={{ padding: "0 1em 1em 1em" }}>
            <Button
              type='submit'
              variant='contained'
              color='primary'
              size='large'
              fullWidth
              className='interceptor-loading'
            >
              Reset Password
            </Button>
          </CardActions>
          <Box sx={{ padding: "0 0.5em 1em 0.5em", textAlign: "center" }}>
            <Typography variant='body2' color='text.secondary'>
              The password reset link is valid for 15 minutes.
            </Typography>
          </Box>
        </MuiCard>
      </form>
    </Box>
  );
}

export default ResetPasswordForm;
