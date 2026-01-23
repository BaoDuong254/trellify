import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Avatar from "@mui/material/Avatar";
import LockIcon from "@mui/icons-material/Lock";
import Typography from "@mui/material/Typography";
import MuiCard from "@mui/material/Card";
import TrelloIcon from "src/assets/trello.svg?react";
import CardActions from "@mui/material/CardActions";
import TextField from "@mui/material/TextField";
import Zoom from "@mui/material/Zoom";
import Alert from "@mui/material/Alert";
import { useForm } from "react-hook-form";
import {
  EMAIL_RULE,
  EMAIL_RULE_MESSAGE,
  FIELD_REQUIRED_MESSAGE,
  PASSWORD_RULE,
  PASSWORD_RULE_MESSAGE,
} from "src/utils/validators";
import FieldErrorAlert from "src/components/Form/FieldErrorAlert";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "src/redux/store";
import { toast } from "react-toastify";
import { loginUserAPI } from "src/redux/user/userSlice";

interface LoginFormData {
  email: string;
  password: string;
}

function LoginForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();
  const registeredEmail = searchParams.get("registeredEmail");
  const verifiedEmail = searchParams.get("verifiedEmail");

  const submitLogIn = (data: LoginFormData) => {
    const { email, password } = data;

    toast.promise(dispatch(loginUserAPI({ email, password })), { pending: "Logging in..." }).then((res) => {
      if (res.meta.requestStatus === "fulfilled") navigate("/");
    });
  };

  return (
    <form onSubmit={handleSubmit(submitLogIn)}>
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
          <Box
            sx={{
              marginTop: "1em",
              display: "flex",
              justifyContent: "center",
              flexDirection: "column",
              padding: "0 1em",
            }}
          >
            {verifiedEmail && (
              <Alert severity='success' sx={{ ".MuiAlert-message": { overflow: "hidden" } }}>
                Your email&nbsp;
                <Typography component='span' sx={{ fontWeight: "bold", "&:hover": { color: "#fdba26" } }}>
                  {verifiedEmail}
                </Typography>
                &nbsp;has been verified.
                <br />
                Now you can login to enjoy our services! Have a good day!
              </Alert>
            )}
            {registeredEmail && (
              <Alert severity='info' sx={{ ".MuiAlert-message": { overflow: "hidden" } }}>
                An email has been sent to&nbsp;
                <Typography component='span' sx={{ fontWeight: "bold", "&:hover": { color: "#fdba26" } }}>
                  {registeredEmail}
                </Typography>
                <br />
                Please check and verify your account before logging in!
              </Alert>
            )}
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
              Login
            </Button>
          </CardActions>
          <Box sx={{ padding: "0 1em 1em 1em", textAlign: "center" }}>
            <Typography>New to Trellify?</Typography>
            <Link to='/register' style={{ textDecoration: "none" }}>
              <Typography sx={{ color: "primary.main", "&:hover": { color: "#ffbb39" } }}>Create account!</Typography>
            </Link>
          </Box>
        </MuiCard>
      </Zoom>
    </form>
  );
}

export default LoginForm;
