import { useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Tooltip from "@mui/material/Tooltip";
import Popover from "@mui/material/Popover";
import Button from "@mui/material/Button";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import TextField from "@mui/material/TextField";
import { useForm } from "react-hook-form";
import { EMAIL_RULE, EMAIL_RULE_MESSAGE, FIELD_REQUIRED_MESSAGE } from "src/utils/validators";
import FieldErrorAlert from "src/components/Form/FieldErrorAlert";
import { inviteUserToBoardAPI } from "src/apis";
import { socketIoInstance } from "src/socketClient";

interface InviteUserToBoardFormData {
  inviteeEmail: string;
}

function InviteBoardUser({ boardId }: { boardId: string }) {
  const [anchorPopoverElement, setAnchorPopoverElement] = useState<HTMLElement | null>(null);
  const isOpenPopover = Boolean(anchorPopoverElement);
  const popoverId = isOpenPopover ? "invite-board-user-popover" : undefined;
  const handleTogglePopover = (event: React.MouseEvent<HTMLElement>) => {
    if (!anchorPopoverElement) setAnchorPopoverElement(event.currentTarget);
    else setAnchorPopoverElement(null);
  };

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<InviteUserToBoardFormData>();
  const submitInviteUserToBoard = (data: InviteUserToBoardFormData) => {
    const { inviteeEmail } = data;
    inviteUserToBoardAPI({ inviteeEmail, boardId }).then((invitation) => {
      setValue("inviteeEmail", "");
      setAnchorPopoverElement(null);
      socketIoInstance.emit("FE_USER_INVITED_TO_BOARD", invitation);
    });
  };

  return (
    <Box>
      <Tooltip title='Invite user to this board!'>
        <Button
          aria-describedby={popoverId}
          onClick={handleTogglePopover}
          variant='outlined'
          startIcon={<PersonAddIcon />}
          sx={{ color: "white", borderColor: "white", "&:hover": { borderColor: "white" } }}
        >
          Invite
        </Button>
      </Tooltip>

      <Popover
        id={popoverId}
        open={isOpenPopover}
        anchorEl={anchorPopoverElement}
        onClose={handleTogglePopover}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <form onSubmit={handleSubmit(submitInviteUserToBoard)} style={{ width: "320px" }}>
          <Box sx={{ p: "15px 20px 20px 20px", display: "flex", flexDirection: "column", gap: 2 }}>
            <Typography component='span' sx={{ fontWeight: "bold", fontSize: "16px" }}>
              Invite User To This Board!
            </Typography>
            <Box>
              <TextField
                // eslint-disable-next-line jsx-a11y/no-autofocus
                autoFocus
                fullWidth
                label='Enter email to invite...'
                type='text'
                variant='outlined'
                {...register("inviteeEmail", {
                  required: FIELD_REQUIRED_MESSAGE,
                  pattern: { value: EMAIL_RULE, message: EMAIL_RULE_MESSAGE },
                })}
                error={!!errors["inviteeEmail"]}
              />
              <FieldErrorAlert errors={errors} fieldName={"inviteeEmail"} />
            </Box>

            <Box sx={{ alignSelf: "flex-end" }}>
              <Button className='interceptor-loading' type='submit' variant='contained' color='info'>
                Invite
              </Button>
            </Box>
          </Box>
        </form>
      </Popover>
    </Box>
  );
}

export default InviteBoardUser;
