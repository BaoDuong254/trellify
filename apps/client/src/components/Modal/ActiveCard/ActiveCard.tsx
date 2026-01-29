import Box from "@mui/material/Box";
import Modal from "@mui/material/Modal";
import Typography from "@mui/material/Typography";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import CancelIcon from "@mui/icons-material/Cancel";
import Stack from "@mui/material/Stack";
import Divider from "@mui/material/Divider";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import LocalOfferOutlinedIcon from "@mui/icons-material/LocalOfferOutlined";
import TaskAltOutlinedIcon from "@mui/icons-material/TaskAltOutlined";
import WatchLaterOutlinedIcon from "@mui/icons-material/WatchLaterOutlined";
import AttachFileOutlinedIcon from "@mui/icons-material/AttachFileOutlined";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import AutoFixHighOutlinedIcon from "@mui/icons-material/AutoFixHighOutlined";
import AspectRatioOutlinedIcon from "@mui/icons-material/AspectRatioOutlined";
import AddToDriveOutlinedIcon from "@mui/icons-material/AddToDriveOutlined";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import ArrowForwardOutlinedIcon from "@mui/icons-material/ArrowForwardOutlined";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import ArchiveOutlinedIcon from "@mui/icons-material/ArchiveOutlined";
import ShareOutlinedIcon from "@mui/icons-material/ShareOutlined";
import SubjectRoundedIcon from "@mui/icons-material/SubjectRounded";
import DvrOutlinedIcon from "@mui/icons-material/DvrOutlined";
import { toast } from "react-toastify";
import { styled } from "@mui/material/styles";
import ToggleFocusInput from "src/components/Form/ToggleFocusInput";
import CardUserGroup from "./CardUserGroup";
import CardDescriptionMdEditor from "./CardDescriptionMdEditor";
import CardActivitySection from "./CardActivitySection";
import VisuallyHiddenInput from "src/components/Form/VisuallyHiddenInput";
import type { AppDispatch } from "src/redux/store";
import { useDispatch, useSelector } from "react-redux";
import {
  clearAndHideCurrentActiveCard,
  selectCurrentActiveCard,
  selectIsShowModalActiveCard,
  updateCurrentActiveCard,
} from "src/redux/activeCard/activeCardSlice";
import { updateCardDetailsAPI } from "src/apis";
import { singleFileValidator } from "src/utils/validators";
import { updateCardInBoard } from "src/redux/activeBoard/activeBoardSlice";
import type { IncomingCardMemberInfoType, UpdateCardType } from "@workspace/shared/schemas/card.schema";
import { selectCurrentUser } from "src/redux/user/userSlice";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { CARD_MEMBER_ACTIONS } from "@workspace/shared/utils/constants";

const SidebarItem = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: "6px",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: "600",
  color: theme.palette.mode === "dark" ? "#90caf9" : "#172b4d",
  backgroundColor: theme.palette.mode === "dark" ? "#2f3542" : "#091e420f",
  padding: "10px",
  borderRadius: "4px",
  "&:hover": {
    backgroundColor: theme.palette.mode === "dark" ? "#33485D" : theme.palette.grey[300],
    "&.active": {
      color: theme.palette.mode === "dark" ? "#000000de" : "#0c66e4",
      backgroundColor: theme.palette.mode === "dark" ? "#90caf9" : "#e9f2ff",
    },
  },
}));

function ActiveCard() {
  const dispatch = useDispatch<AppDispatch>();
  const activeCard = useSelector(selectCurrentActiveCard);
  const isShowModalActiveCard = useSelector(selectIsShowModalActiveCard);
  const currentUser = useSelector(selectCurrentUser);
  const handleCloseModal = () => {
    dispatch(clearAndHideCurrentActiveCard());
  };

  const callApiUpdateCard = async (updatedCardData: UpdateCardType) => {
    const updatedCard = await updateCardDetailsAPI(activeCard?._id || "", updatedCardData);
    dispatch(updateCurrentActiveCard(updatedCard));
    dispatch(updateCardInBoard(updatedCard));
    return updatedCard;
  };

  const onUpdateCardTitle = (newTitle: string) => {
    callApiUpdateCard({ title: newTitle.trim() });
  };

  const onUpdateCardDescription = (newDescription: string) => {
    callApiUpdateCard({ description: newDescription });
  };

  const onUploadCardCover = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target?.files;
    if (!files) {
      return;
    }
    const error = singleFileValidator(files[0]);
    if (error) {
      toast.error(error);
      return;
    }
    const reqData = new FormData();
    reqData.append("cardCover", files[0]);
    toast.promise(
      callApiUpdateCard(reqData as unknown as { title?: string; description?: string }).finally(() => {
        event.target.value = "";
      }),
      { pending: "Uploading..." }
    );
  };

  const onAddCardComment = async (commentToAdd: { userAvatar: string; userDisplayName: string; content: string }) => {
    await callApiUpdateCard({
      commentToAdd,
    });
  };

  const onUpdateCardMembers = async (incomingMemberInfo: IncomingCardMemberInfoType) => {
    await callApiUpdateCard({
      incomingMemberInfo,
    });
  };

  return (
    <Modal disableScrollLock open={isShowModalActiveCard} onClose={handleCloseModal} sx={{ overflowY: "auto" }}>
      <Box
        sx={{
          position: "relative",
          width: 900,
          maxWidth: 900,
          bgcolor: "white",
          boxShadow: 24,
          borderRadius: "8px",
          border: "none",
          outline: 0,
          padding: "40px 20px 20px",
          margin: "50px auto",
          backgroundColor: (theme) => (theme.palette.mode === "dark" ? "#1A2027" : "#fff"),
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: "12px",
            right: "10px",
            cursor: "pointer",
          }}
        >
          <CancelIcon color='error' sx={{ "&:hover": { color: "error.light" } }} onClick={handleCloseModal} />
        </Box>

        {activeCard?.cover && (
          <Box sx={{ mb: 4 }}>
            <img
              style={{ width: "100%", height: "320px", borderRadius: "6px", objectFit: "cover" }}
              src={activeCard.cover}
              alt='card cover'
            />
          </Box>
        )}

        <Box sx={{ mb: 1, mt: -3, pr: 2.5, display: "flex", alignItems: "center", gap: 1 }}>
          <CreditCardIcon />
          <ToggleFocusInput inputFontSize='22px' value={activeCard?.title || ""} onChangedValue={onUpdateCardTitle} />
        </Box>

        <Box sx={{ mb: 3, display: "flex", gap: 2, flexDirection: { xs: "column", sm: "row" } }}>
          {/* Left side */}
          <Box sx={{ width: { xs: "100%", sm: "75%" } }}>
            <Box sx={{ mb: 3 }}>
              <Typography sx={{ fontWeight: "600", color: "primary.main", mb: 1 }}>Members</Typography>
              <CardUserGroup cardMemberIds={activeCard?.memberIds || []} onUpdateCardMembers={onUpdateCardMembers} />
            </Box>

            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <SubjectRoundedIcon />
                <Typography component='span' sx={{ fontWeight: "600", fontSize: "20px" }}>
                  Description
                </Typography>
              </Box>
              <CardDescriptionMdEditor
                cardDescriptionProp={activeCard?.description || ""}
                handleUpdateCardDescription={onUpdateCardDescription}
              />
            </Box>

            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <DvrOutlinedIcon />
                <Typography component='span' sx={{ fontWeight: "600", fontSize: "20px" }}>
                  Activity
                </Typography>
              </Box>
              <CardActivitySection cardComments={activeCard?.comments} onAddCardComment={onAddCardComment} />
            </Box>
          </Box>

          {/* Right side */}
          <Box sx={{ width: { xs: "100%", sm: "25%" } }}>
            <Typography sx={{ fontWeight: "600", color: "primary.main", mb: 1 }}>Add To Card</Typography>
            <Stack direction='column' spacing={1}>
              {currentUser && activeCard?.memberIds?.includes(currentUser._id) ? (
                <SidebarItem
                  sx={{ color: "error.light", "&:hover": { color: "error.light" } }}
                  onClick={() =>
                    onUpdateCardMembers({
                      userId: currentUser?._id as string,
                      action: CARD_MEMBER_ACTIONS.REMOVE,
                    })
                  }
                >
                  <ExitToAppIcon fontSize='small' />
                  Leave
                </SidebarItem>
              ) : (
                <SidebarItem
                  className='active'
                  onClick={() =>
                    onUpdateCardMembers({
                      userId: currentUser?._id as string,
                      action: CARD_MEMBER_ACTIONS.ADD,
                    })
                  }
                >
                  <Box sx={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <PersonOutlineOutlinedIcon fontSize='small' />
                      <span>Join</span>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <CheckCircleIcon fontSize='small' sx={{ color: "#27ae60" }} />
                    </Box>
                  </Box>
                </SidebarItem>
              )}
              <SidebarItem className='active' as='label'>
                <ImageOutlinedIcon fontSize='small' />
                Cover
                <VisuallyHiddenInput type='file' onChange={onUploadCardCover} />
              </SidebarItem>

              <SidebarItem>
                <AttachFileOutlinedIcon fontSize='small' />
                Attachment
              </SidebarItem>
              <SidebarItem>
                <LocalOfferOutlinedIcon fontSize='small' />
                Labels
              </SidebarItem>
              <SidebarItem>
                <TaskAltOutlinedIcon fontSize='small' />
                Checklist
              </SidebarItem>
              <SidebarItem>
                <WatchLaterOutlinedIcon fontSize='small' />
                Dates
              </SidebarItem>
              <SidebarItem>
                <AutoFixHighOutlinedIcon fontSize='small' />
                Custom Fields
              </SidebarItem>
            </Stack>

            <Divider sx={{ my: 2 }} />

            <Typography sx={{ fontWeight: "600", color: "primary.main", mb: 1 }}>Power-Ups</Typography>
            <Stack direction='column' spacing={1}>
              <SidebarItem>
                <AspectRatioOutlinedIcon fontSize='small' />
                Card Size
              </SidebarItem>
              <SidebarItem>
                <AddToDriveOutlinedIcon fontSize='small' />
                Google Drive
              </SidebarItem>
              <SidebarItem>
                <AddOutlinedIcon fontSize='small' />
                Add Power-Ups
              </SidebarItem>
            </Stack>

            <Divider sx={{ my: 2 }} />

            <Typography sx={{ fontWeight: "600", color: "primary.main", mb: 1 }}>Actions</Typography>
            <Stack direction='column' spacing={1}>
              <SidebarItem>
                <ArrowForwardOutlinedIcon fontSize='small' />
                Move
              </SidebarItem>
              <SidebarItem>
                <ContentCopyOutlinedIcon fontSize='small' />
                Copy
              </SidebarItem>
              <SidebarItem>
                <AutoAwesomeOutlinedIcon fontSize='small' />
                Make Template
              </SidebarItem>
              <SidebarItem>
                <ArchiveOutlinedIcon fontSize='small' />
                Archive
              </SidebarItem>
              <SidebarItem>
                <ShareOutlinedIcon fontSize='small' />
                Share
              </SidebarItem>
            </Stack>
          </Box>
        </Box>
      </Box>
    </Modal>
  );
}

export default ActiveCard;
