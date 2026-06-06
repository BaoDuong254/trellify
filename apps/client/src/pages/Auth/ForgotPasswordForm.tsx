import LockResetIcon from "@mui/icons-material/LockReset";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import MuiCard from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Zoom from "@mui/material/Zoom";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";

import { forgotPasswordAPI } from "src/apis";
import TrelloIcon from "src/assets/trello.svg?react";
import FieldErrorAlert from "src/components/Form/FieldErrorAlert";
import TurnstileField from "src/components/Form/TurnstileField";
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

  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileKey, setTurnstileKey] = useState(0);

  const resetTurnstile = () => {
    setTurnstileKey((k) => k + 1);
    setTurnstileToken(null);
  };

  const submitForgotPassword = (data: ForgotPasswordFormData) => {
    toast
      .promise(forgotPasswordAPI({ email: data.email, turnstileToken: turnstileToken! }), {
        pending: "Sending reset link...",
        success:
          "If the email is registered, a password reset link has been sent. Please check your inbox and spam folder.",
      })
      .catch(() => {})
      .finally(resetTurnstile);
  };

  return (
    <form onSubmit={handleSubmit(submitForgotPassword)}>
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
            key={turnstileKey}
            onSuccess={setTurnstileToken}
            onExpire={() => setTurnstileToken(null)}
            onError={() => setTurnstileToken(null)}
          />
          <CardActions sx={{ padding: "0 1em 1em 1em" }}>
            <Button
              type='submit'
              variant='contained'
              color='primary'
              size='large'
              fullWidth
              className='interceptor-loading'
              disabled={!turnstileToken}
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
      </Zoom>
    </form>
  );
}

export default ForgotPasswordForm;
