import LockResetIcon from "@mui/icons-material/LockReset";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import MuiCard from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { forgotPasswordAPI } from "src/apis";
import TrelloIcon from "src/assets/trello.svg?react";
import FieldErrorAlert from "src/components/Form/FieldErrorAlert";
import TurnstileField from "src/components/Form/TurnstileField";
import { useTurnstile } from "src/hooks/useTurnstile";
import { authCardSx } from "src/pages/Auth/authLayout";
import { EMAIL_RULE, EMAIL_RULE_MESSAGE, FIELD_REQUIRED_MESSAGE } from "src/utils/validators";

interface ForgotPasswordFormData {
  email: string;
}

function ForgotPasswordForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>();

  const turnstile = useTurnstile();

  const submitForgotPassword = (data: ForgotPasswordFormData) => {
    const toastId = toast.loading("Sending reset link...");
    forgotPasswordAPI({ email: data.email, turnstileToken: turnstile.token! })
      .then(() => {
        toast.success(
          "If the email is registered, a password reset link has been sent. Please check your inbox and spam folder.",
          { id: toastId }
        );
      })
      .catch(() => {
        toast.dismiss(toastId);
      })
      .finally(turnstile.reset);
  };

  return (
    <form onSubmit={handleSubmit(submitForgotPassword)} {...turnstile.formProps}>
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
        <Box sx={{ marginTop: "0.5em", textAlign: "center", padding: "0 1em" }}>
          <Typography variant='body2' color='text.secondary'>
            Enter your registered email. We will send a password reset link to your inbox.
          </Typography>
        </Box>
        <Box sx={{ padding: "0 1em 1em 1em" }}>
          <Box sx={{ marginTop: "1em" }}>
            <TextField
              fullWidth
              label='Enter Email...'
              type='text'
              variant='outlined'
              error={!!errors.email}
              {...register("email", {
                required: FIELD_REQUIRED_MESSAGE,
                pattern: { value: EMAIL_RULE, message: EMAIL_RULE_MESSAGE },
              })}
            />
            <FieldErrorAlert errors={errors} fieldName='email' />
          </Box>
        </Box>
        <TurnstileField
          key={turnstile.widgetKey}
          active={turnstile.armed}
          onSuccess={turnstile.setToken}
          onExpire={turnstile.clearToken}
          onError={turnstile.clearToken}
        />
        <CardActions sx={{ padding: "0 1em 1em 1em" }}>
          <Button
            type='submit'
            variant='contained'
            color='primary'
            size='large'
            fullWidth
            className='interceptor-loading'
            disabled={!turnstile.token}
          >
            Send Password Reset Link
          </Button>
        </CardActions>
        <Box sx={{ padding: "0 1em 1em 1em", textAlign: "center" }}>
          <Link to='/login' style={{ textDecoration: "none" }}>
            <Typography sx={{ color: "primary.main", "&:hover": { color: "#ffbb39" } }}>Back to Login</Typography>
          </Link>
        </Box>
      </MuiCard>
    </form>
  );
}

export default ForgotPasswordForm;
