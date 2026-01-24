import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import Button from "@mui/material/Button";
import PasswordIcon from "@mui/icons-material/Password";
import LockResetIcon from "@mui/icons-material/LockReset";
import LockIcon from "@mui/icons-material/Lock";
import LogoutIcon from "@mui/icons-material/Logout";
import { useForm } from "react-hook-form";
import { useConfirm } from "material-ui-confirm";
import { FIELD_REQUIRED_MESSAGE, PASSWORD_RULE, PASSWORD_RULE_MESSAGE } from "src/utils/validators";
import FieldErrorAlert from "src/components/Form/FieldErrorAlert";
import type { AppDispatch } from "src/redux/store";
import { logoutUserAPI, updateUserAPI } from "src/redux/user/userSlice";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";

interface SecurityTabFormData {
  current_password?: string;
  new_password?: string;
  new_password_confirmation?: string;
}

function SecurityTab() {
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<SecurityTabFormData>();
  const dispatch = useDispatch<AppDispatch>();

  const confirmChangePassword = useConfirm();
  const submitChangePassword = (data: SecurityTabFormData) => {
    confirmChangePassword({
      title: (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <LogoutIcon sx={{ color: "warning.dark" }} /> Change Password
        </Box>
      ),
      description: "You have to login again after successfully changing your password. Continue?",
      confirmationText: "Confirm",
      cancellationText: "Cancel",
    })
      .then(({ confirmed }) => {
        if (confirmed) {
          const { current_password, new_password } = data;
          toast
            .promise(dispatch(updateUserAPI({ current_password, new_password })), { pending: "Updating..." })
            .then((res) => {
              if (res.meta.requestStatus === "fulfilled") {
                toast.success("Successfully changed your password, please login again!");
                dispatch(logoutUserAPI(false));
              }
            });
        }
      })
      .catch(() => {});
  };

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Box
        sx={{
          maxWidth: "1200px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 3,
        }}
      >
        <Box>
          <Typography variant='h5'>Security Dashboard</Typography>
        </Box>
        <form onSubmit={handleSubmit(submitChangePassword)}>
          <Box sx={{ width: "400px", display: "flex", flexDirection: "column", gap: 2 }}>
            <Box>
              <TextField
                fullWidth
                label='Current Password'
                type='password'
                variant='outlined'
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position='start'>
                        <PasswordIcon fontSize='small' />
                      </InputAdornment>
                    ),
                  },
                }}
                {...register("current_password", {
                  required: FIELD_REQUIRED_MESSAGE,
                  pattern: {
                    value: PASSWORD_RULE,
                    message: PASSWORD_RULE_MESSAGE,
                  },
                })}
                error={!!errors["current_password"]}
              />
              <FieldErrorAlert errors={errors} fieldName={"current_password"} />
            </Box>

            <Box>
              <TextField
                fullWidth
                label='New Password'
                type='password'
                variant='outlined'
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position='start'>
                        <LockIcon fontSize='small' />
                      </InputAdornment>
                    ),
                  },
                }}
                {...register("new_password", {
                  required: FIELD_REQUIRED_MESSAGE,
                  pattern: {
                    value: PASSWORD_RULE,
                    message: PASSWORD_RULE_MESSAGE,
                  },
                })}
                error={!!errors["new_password"]}
              />
              <FieldErrorAlert errors={errors} fieldName={"new_password"} />
            </Box>

            <Box>
              <TextField
                fullWidth
                label='New Password Confirmation'
                type='password'
                variant='outlined'
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position='start'>
                        <LockResetIcon fontSize='small' />
                      </InputAdornment>
                    ),
                  },
                }}
                {...register("new_password_confirmation", {
                  validate: (value) => {
                    if (value === getValues("new_password")) return true;
                    return "Password confirmation does not match.";
                  },
                })}
                error={!!errors["new_password_confirmation"]}
              />
              <FieldErrorAlert errors={errors} fieldName={"new_password_confirmation"} />
            </Box>

            <Box>
              <Button className='interceptor-loading' type='submit' variant='contained' color='primary' fullWidth>
                Change
              </Button>
            </Box>
          </Box>
        </form>
      </Box>
    </Box>
  );
}

export default SecurityTab;
