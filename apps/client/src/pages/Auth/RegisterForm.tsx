import LockIcon from "@mui/icons-material/Lock";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import MuiCard from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import { registerUserAPI } from "src/apis";
import TrelloIcon from "src/assets/trello.svg?react";
import FieldErrorAlert from "src/components/Form/FieldErrorAlert";
import TurnstileField from "src/components/Form/TurnstileField";
import { useTurnstile } from "src/hooks/useTurnstile";
import { authCardSx } from "src/pages/Auth/authLayout";
import {
  EMAIL_RULE,
  EMAIL_RULE_MESSAGE,
  FIELD_REQUIRED_MESSAGE,
  PASSWORD_RULE,
  PASSWORD_RULE_MESSAGE,
} from "src/utils/validators";

interface RegisterFormData {
  email: string;
  password: string;
  passwordConfirmation: string;
}

function RegisterForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<RegisterFormData>();

  const navigate = useNavigate();

  const turnstile = useTurnstile();

  const submitRegister = (data: RegisterFormData) => {
    const { email, password } = data;
    toast
      .promise(registerUserAPI({ email, password, turnstileToken: turnstile.token! }), {
        pending: "Registering is in progress...",
      })
      .then((user) => {
        navigate(`/login?registeredEmail=${user.email}`);
      })
      .catch(() => {
        turnstile.reset();
      });
  };

  return (
    <form onSubmit={handleSubmit(submitRegister)} {...turnstile.formProps}>
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
            <LockIcon />
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
              label='Enter Email...'
              type='text'
              variant='outlined'
              error={!!errors.email}
              {...register("email", {
                required: FIELD_REQUIRED_MESSAGE,
                pattern: {
                  value: EMAIL_RULE,
                  message: EMAIL_RULE_MESSAGE,
                },
              })}
            />
            <FieldErrorAlert errors={errors} fieldName={"email"} />
          </Box>
          <Box sx={{ marginTop: "1em" }}>
            <TextField
              fullWidth
              label='Enter Password...'
              type='password'
              variant='outlined'
              error={!!errors.password}
              {...register("password", {
                required: FIELD_REQUIRED_MESSAGE,
                pattern: {
                  value: PASSWORD_RULE,
                  message: PASSWORD_RULE_MESSAGE,
                },
              })}
            />
            <FieldErrorAlert errors={errors} fieldName={"password"} />
          </Box>
          <Box sx={{ marginTop: "1em" }}>
            <TextField
              fullWidth
              label='Enter Password Confirmation...'
              type='password'
              variant='outlined'
              error={!!errors.passwordConfirmation}
              {...register("passwordConfirmation", {
                validate: (value: string) => {
                  if (value === getValues("password")) {
                    return true;
                  }
                  return "Password Confirmation does not match!";
                },
              })}
            />
            <FieldErrorAlert errors={errors} fieldName={"passwordConfirmation"} />
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
            Register
          </Button>
        </CardActions>
        <Box sx={{ padding: "0 1em 1em 1em", textAlign: "center" }}>
          <Typography>Already have an account?</Typography>
          <Link to='/login' style={{ textDecoration: "none" }}>
            <Typography sx={{ color: "primary.main", "&:hover": { color: "#ffbb39" } }}>Log in!</Typography>
          </Link>
        </Box>
      </MuiCard>
    </form>
  );
}

export default RegisterForm;
