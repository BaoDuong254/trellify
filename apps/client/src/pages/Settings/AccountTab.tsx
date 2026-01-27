import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Avatar from "@mui/material/Avatar";
import Tooltip from "@mui/material/Tooltip";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import Button from "@mui/material/Button";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import MailIcon from "@mui/icons-material/Mail";
import AccountBoxIcon from "@mui/icons-material/AccountBox";
import AssignmentIndIcon from "@mui/icons-material/AssignmentInd";
import { useDispatch, useSelector } from "react-redux";
import { useForm } from "react-hook-form";
import { selectCurrentUser, updateUserAPI } from "src/redux/user/userSlice";
import { FIELD_REQUIRED_MESSAGE, singleFileValidator } from "src/utils/validators";
import FieldErrorAlert from "src/components/Form/FieldErrorAlert";
import type { AppDispatch } from "src/redux/store";
import { toast } from "react-toastify";
import VisuallyHiddenInput from "src/components/Form/VisuallyHiddenInput";
interface AccountTabFormData {
  displayName?: string;
}

function AccountTab() {
  const dispatch = useDispatch<AppDispatch>();
  const currentUser = useSelector(selectCurrentUser);

  const initialGeneralForm = {
    displayName: currentUser?.displayName,
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AccountTabFormData>({
    defaultValues: initialGeneralForm,
  });

  const submitChangeGeneralInformation = (data: AccountTabFormData) => {
    const { displayName } = data;
    if (displayName === currentUser?.displayName) return;
    toast.promise(dispatch(updateUserAPI({ displayName })), { pending: "Updating..." }).then((res) => {
      if (res.meta.requestStatus === "fulfilled") {
        toast.success("User updated successfully!");
      }
    });
  };

  const uploadAvatar = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const error = singleFileValidator(e.target?.files?.[0]);
    if (error) {
      toast.error(error);
      return;
    }
    const reqData = new FormData();
    reqData.append("avatar", e.target?.files?.[0] as File);
    toast
      .promise(dispatch(updateUserAPI(reqData as unknown as Parameters<typeof updateUserAPI>[0])), {
        pending: "Updating...",
      })
      .then((res) => {
        if (res.meta.requestStatus === "fulfilled") {
          toast.success("User updated successfully!");
        }
        e.target.value = "";
      });
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
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box>
            <Avatar sx={{ width: 84, height: 84, mb: 1 }} alt='User avatar' src={currentUser?.avatar ?? undefined} />
            <Tooltip title='Upload a new image to update your avatar immediately.'>
              <Button component='label' variant='contained' size='small' startIcon={<CloudUploadIcon />}>
                Upload
                <VisuallyHiddenInput type='file' onChange={uploadAvatar} />
              </Button>
            </Tooltip>
          </Box>
          <Box>
            <Typography variant='h6'>{currentUser?.displayName}</Typography>
            <Typography sx={{ color: "grey" }}>@{currentUser?.username}</Typography>
          </Box>
        </Box>

        <form onSubmit={handleSubmit(submitChangeGeneralInformation)}>
          <Box sx={{ width: "400px", display: "flex", flexDirection: "column", gap: 2 }}>
            <Box>
              <TextField
                disabled
                defaultValue={currentUser?.email}
                fullWidth
                label='Your Email'
                type='text'
                variant='filled'
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position='start'>
                        <MailIcon fontSize='small' />
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </Box>

            <Box>
              <TextField
                disabled
                defaultValue={currentUser?.username}
                fullWidth
                label='Your Username'
                type='text'
                variant='filled'
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position='start'>
                        <AccountBoxIcon fontSize='small' />
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </Box>

            <Box>
              <TextField
                fullWidth
                label='Your Display Name'
                type='text'
                variant='outlined'
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position='start'>
                        <AssignmentIndIcon fontSize='small' />
                      </InputAdornment>
                    ),
                  },
                }}
                {...register("displayName", {
                  required: FIELD_REQUIRED_MESSAGE,
                })}
                error={!!errors["displayName"]}
              />
              <FieldErrorAlert errors={errors} fieldName={"displayName"} />
            </Box>

            <Box>
              <Button className='interceptor-loading' type='submit' variant='contained' color='primary' fullWidth>
                Update
              </Button>
            </Box>
          </Box>
        </form>
      </Box>
    </Box>
  );
}

export default AccountTab;
