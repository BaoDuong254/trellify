import { useSearchParams, useNavigate, Navigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Avatar from "@mui/material/Avatar";
import LockResetIcon from "@mui/icons-material/LockReset";
import Typography from "@mui/material/Typography";
import MuiCard from "@mui/material/Card";
import TrelloIcon from "src/assets/trello.svg?react";
import CardActions from "@mui/material/CardActions";
import TextField from "@mui/material/TextField";
import Zoom from "@mui/material/Zoom";
import { useForm } from "react-hook-form";
import {
  FIELD_REQUIRED_MESSAGE,
  PASSWORD_CONFIRMATION_MESSAGE,
  PASSWORD_RULE,
  PASSWORD_RULE_MESSAGE,
} from "src/utils/validators";
import FieldErrorAlert from "src/components/Form/FieldErrorAlert";
import { toast } from "react-toastify";
import { resetPasswordAPI } from "src/apis";
import loginBgImage from "src/assets/auth/login-register-bg.jpg";

interface ResetPasswordFormData {
  password: string;
  passwordConfirmation: string;
}

function ResetPasswordForm() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<ResetPasswordFormData>();

  if (!token) return <Navigate to='/404' />;

  const submitResetPassword = (data: ResetPasswordFormData) => {
    toast
      .promise(resetPasswordAPI({ token, password: data.password }), {
        pending: "Resetting password...",
        success: "Password reset successfully!",
      })
      .then(() => {
        navigate("/login");
      });
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        alignItems: "center",
        justifyContent: "flex-start",
        background: `url(${loginBgImage})`,
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
        backgroundPosition: "center",
        boxShadow: "inset 0 0 0 2000px rgba(0, 0, 0, 0.2)",
      }}
    >
      <form onSubmit={handleSubmit(submitResetPassword)}>
        <Zoom in={true} style={{ transitionDelay: "200ms" }}>
          <MuiCard sx={{ minWidth: 380, maxWidth: 380, marginTop: "6em" }}>
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
                color: (theme) => theme.palette.grey[500],
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
        </Zoom>
      </form>
    </Box>
  );
}

export default ResetPasswordForm;
