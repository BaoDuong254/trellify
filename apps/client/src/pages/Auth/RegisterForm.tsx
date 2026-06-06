import LockIcon from "@mui/icons-material/Lock";
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
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import { registerUserAPI } from "src/apis";
import TrelloIcon from "src/assets/trello.svg?react";
import FieldErrorAlert from "src/components/Form/FieldErrorAlert";
import TurnstileField from "src/components/Form/TurnstileField";
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

  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileKey, setTurnstileKey] = useState(0);

  const resetTurnstile = () => {
    setTurnstileKey((k) => k + 1);
    setTurnstileToken(null);
  };

  const submitRegister = (data: RegisterFormData) => {
    const { email, password } = data;
    toast
      .promise(registerUserAPI({ email, password, turnstileToken: turnstileToken! }), {
        pending: "Registering is in progress...",
      })
      .then((user) => {
        navigate(`/login?registeredEmail=${user.email}`);
      })
      .catch(() => {
        resetTurnstile();
      });
  };

  return (
    <form onSubmit={handleSubmit(submitRegister)}>
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
              color: (theme) => theme.palette.grey[500],
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
      </Zoom>
    </form>
  );
}

export default RegisterForm;
