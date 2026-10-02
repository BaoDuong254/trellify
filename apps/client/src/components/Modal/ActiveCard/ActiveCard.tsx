import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import AddToDriveOutlinedIcon from "@mui/icons-material/AddToDriveOutlined";
import ArchiveOutlinedIcon from "@mui/icons-material/ArchiveOutlined";
import ArrowForwardOutlinedIcon from "@mui/icons-material/ArrowForwardOutlined";
import AspectRatioOutlinedIcon from "@mui/icons-material/AspectRatioOutlined";
import AttachFileOutlinedIcon from "@mui/icons-material/AttachFileOutlined";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import AutoFixHighOutlinedIcon from "@mui/icons-material/AutoFixHighOutlined";
import CancelIcon from "@mui/icons-material/Cancel";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import DvrOutlinedIcon from "@mui/icons-material/DvrOutlined";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import LocalOfferOutlinedIcon from "@mui/icons-material/LocalOfferOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import ShareOutlinedIcon from "@mui/icons-material/ShareOutlined";
import SubjectRoundedIcon from "@mui/icons-material/SubjectRounded";
import TaskAltOutlinedIcon from "@mui/icons-material/TaskAltOutlined";
import WatchLaterOutlinedIcon from "@mui/icons-material/WatchLaterOutlined";
import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Modal from "@mui/material/Modal";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { styled } from "@mui/material/styles";
import { cloneDeep } from "lodash";
import { useConfirm } from "material-ui-confirm";
import { Suspense, lazy, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";

import type { BoardLabelType } from "@workspace/shared/schemas/board.schema";
import type {
  ChecklistItemType,
  IncomingCardMemberInfoType,
  UpdateCardInputType,
} from "@workspace/shared/schemas/card.schema";
import { CARD_MEMBER_ACTIONS } from "@workspace/shared/utils/constants";

import { deleteCardDetailsAPI, updateBoardDetailsAPI, updateCardDetailsAPI } from "src/apis";
import ToggleFocusInput from "src/components/Form/ToggleFocusInput";
import VisuallyHiddenInput from "src/components/Form/VisuallyHiddenInput";
import { useCardComments } from "src/hooks/useCardComments";
import {
  fetchBoardDetailsAPI,
  selectCurrentActiveBoard,
  updateCardInBoard,
  updateCurrentActiveBoard,
} from "src/redux/activeBoard/activeBoardSlice";
import {
  clearAndHideCurrentActiveCard,
  selectCurrentActiveCard,
  selectIsShowModalActiveCard,
  updateCurrentActiveCard,
} from "src/redux/activeCard/activeCardSlice";
import type { AppDispatch } from "src/redux/store";
import { selectCurrentUser } from "src/redux/user/userSlice";
import { cardVersion, normalizeBoard } from "src/utils/board";
import { cloudinaryImage } from "src/utils/formatters";
import { singleFileValidator } from "src/utils/validators";

import CardActivitySection from "./CardActivitySection";
import { CardLabelChips, DueDateChip } from "./CardBadges";
import CardChecklistSection from "./CardChecklistSection";
import CardDatesPopover from "./CardDatesPopover";
import CardHistorySection from "./CardHistorySection";
import CardLabelsPopover from "./CardLabelsPopover";
import CardUserGroup from "./CardUserGroup";

const CardDescriptionMdEditor = lazy(() => import("./CardDescriptionMdEditor"));

const SidebarItem = styled(Box)(({ theme }) => ({
  position: "relative",
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
  const board = useSelector(selectCurrentActiveBoard);
  const confirmDeleteCard = useConfirm();
  const [datesAnchor, setDatesAnchor] = useState<HTMLElement | null>(null);
  const [labelsAnchor, setLabelsAnchor] = useState<HTMLElement | null>(null);
  const [isChecklistOpen, setIsChecklistOpen] = useState(false);
  const boardLabels = board?.labels ?? [];
  const cardLabelIds = (activeCard?.labelIds ?? []).filter((id) => boardLabels.some((label) => label._id === id));
  const checklist = activeCard?.checklist ?? [];
  const activeCardVersion = cardVersion(activeCard);
  const {
    comments,
    isLoading: isLoadingComments,
    replaceComments,
  } = useCardComments(activeCard?._id, activeCard?.updatedAt ?? "");

  const handleCloseModal = () => {
    setIsChecklistOpen(false);
    dispatch(clearAndHideCurrentActiveCard());
  };

  const callApiUpdateCard = async (updatedCardData: UpdateCardInputType) => {
    const { comments: updatedComments, ...updatedCard } = await updateCardDetailsAPI(
      activeCard?._id || "",
      updatedCardData
    );
    const boardCard = { ...updatedCard, commentCount: updatedComments?.length ?? updatedCard.commentCount };
    if (updatedComments) replaceComments(boardCard._id, updatedComments);
    dispatch(updateCurrentActiveCard(boardCard));
    dispatch(updateCardInBoard(boardCard));
    return boardCard;
  };

  const updateCardQuietly = (updatedCardData: UpdateCardInputType) => {
    callApiUpdateCard(updatedCardData).catch(() => {});
  };

  const onUpdateCardTitle = (newTitle: string) => callApiUpdateCard({ title: newTitle.trim() });

  const onUpdateCardDescription = (newDescription: string) => {
    updateCardQuietly({ description: newDescription });
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
    const toastId = toast.loading("Uploading...");
    callApiUpdateCard(reqData as unknown as { title?: string; description?: string })
      .catch(() => {})
      .finally(() => {
        event.target.value = "";
        toast.dismiss(toastId);
      });
  };

  const onAddCardComment = async (commentToAdd: { content: string }) => {
    await callApiUpdateCard({
      commentToAdd,
    });
  };

  const onUpdateComment = async (commentToUpdate: { _id: string; content: string }) => {
    await callApiUpdateCard({ commentToUpdate });
  };

  const onDeleteComment = async (commentId: string) => {
    await callApiUpdateCard({ commentToDelete: { _id: commentId } });
  };

  const updateCardArrays = (patch: Pick<UpdateCardInputType, "labelIds" | "checklist">) => {
    if (!activeCard) return;
    dispatch(updateCurrentActiveCard({ ...activeCard, ...patch }));
    callApiUpdateCard(patch).catch(() => dispatch(updateCurrentActiveCard(activeCard)));
  };

  const onToggleCardLabel = (labelId: string) => {
    const labelIds = cardLabelIds.includes(labelId)
      ? cardLabelIds.filter((id) => id !== labelId)
      : [...cardLabelIds, labelId];
    updateCardArrays({ labelIds });
  };

  const onBoardLabelsChange = (labels: BoardLabelType[]) => {
    if (!board) return;
    dispatch(updateCurrentActiveBoard({ ...board, labels }));
    updateBoardDetailsAPI(board._id, { labels }).catch(() => {
      dispatch(fetchBoardDetailsAPI(board._id));
    });
  };

  const onUpdateChecklist = (nextChecklist: ChecklistItemType[]) => {
    updateCardArrays({ checklist: nextChecklist });
  };

  const onUpdateCardMembers = async (incomingMemberInfo: IncomingCardMemberInfoType) => {
    await callApiUpdateCard({
      incomingMemberInfo,
    });
  };

  const removeActiveCardFromBoard = () => {
    if (!board || !activeCard) return;
    const newBoard = cloneDeep(board);
    const targetColumn = newBoard.columns.find((col) => col._id === activeCard.columnId);
    if (targetColumn) {
      targetColumn.cards = targetColumn.cards.filter((c) => c._id !== activeCard._id);
      targetColumn.cardOrderIds = targetColumn.cardOrderIds.filter((id) => id !== activeCard._id);
    }
    dispatch(updateCurrentActiveBoard(normalizeBoard(newBoard)));
    handleCloseModal();
  };

  const handleArchiveCard = () => {
    if (!activeCard) return;
    const { _id: cardId, boardId } = activeCard;
    removeActiveCardFromBoard();
    updateCardDetailsAPI(cardId, { archived: true })
      .then(() => {
        toast.success("Card archived");
      })
      .catch(() => {
        dispatch(fetchBoardDetailsAPI(boardId));
      });
  };

  const handleDeleteCard = () => {
    confirmDeleteCard({
      title: "Delete Card?",
      description: "This action will permanently delete this Card! Are you sure?",
      confirmationText: "Confirm",
      cancellationText: "Cancel",
    })
      .then(({ confirmed }) => {
        if (confirmed) {
          if (!activeCard) return;
          const { _id: cardId, boardId } = activeCard;
          removeActiveCardFromBoard();

          deleteCardDetailsAPI(cardId)
            .then((res) => {
              toast.success(res?.deleteResult);
            })
            .catch(() => {
              dispatch(fetchBoardDetailsAPI(boardId));
            });
        }
      })
      .catch(() => {});
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
          <Box sx={{ mb: 4, position: "relative" }}>
            <img
              style={{ width: "100%", height: "320px", borderRadius: "6px", objectFit: "cover" }}
              src={cloudinaryImage(activeCard.cover, 900)}
              alt='card cover'
            />
            <Tooltip title='Remove cover'>
              <IconButton
                aria-label='Remove cover'
                size='small'
                onClick={() => updateCardQuietly({ cover: null })}
                sx={{
                  position: "absolute",
                  bottom: 8,
                  right: 8,
                  bgcolor: "rgba(0,0,0,0.5)",
                  color: "#fff",
                  "&:hover": { bgcolor: "rgba(0,0,0,0.7)" },
                }}
              >
                <DeleteOutlineOutlinedIcon fontSize='small' />
              </IconButton>
            </Tooltip>
          </Box>
        )}

        <Box sx={{ mb: 1, mt: -3, pr: 2.5, display: "flex", alignItems: "center", gap: 1 }}>
          <CreditCardIcon />
          <ToggleFocusInput
            inputFontSize='22px'
            value={activeCard?.title || ""}
            onChangedValue={onUpdateCardTitle}
            inputLabel='Card title'
          />
        </Box>

        <Box sx={{ mb: 3, display: "flex", gap: 2, flexDirection: { xs: "column", sm: "row" } }}>
          {/* Left side */}
          <Box sx={{ width: { xs: "100%", sm: "75%" } }}>
            <Box sx={{ mb: 3 }}>
              <Typography sx={{ fontWeight: "600", color: "primary.main", mb: 1 }}>Members</Typography>
              <CardUserGroup cardMemberIds={activeCard?.memberIds || []} onUpdateCardMembers={onUpdateCardMembers} />
            </Box>

            {cardLabelIds.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography sx={{ fontWeight: "600", color: "primary.main", mb: 1 }}>Labels</Typography>
                <CardLabelChips boardLabels={boardLabels} labelIds={cardLabelIds} />
              </Box>
            )}

            {activeCard?.dueDate && (
              <Box sx={{ mb: 3 }}>
                <Typography sx={{ fontWeight: "600", color: "primary.main", mb: 1 }}>Due date</Typography>
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <Checkbox
                    size='small'
                    checked={Boolean(activeCard.dueComplete)}
                    onChange={(event) => updateCardQuietly({ dueComplete: event.target.checked })}
                    slotProps={{ input: { "aria-label": "Mark due date complete" } }}
                  />
                  <DueDateChip
                    dueDate={activeCard.dueDate}
                    dueComplete={activeCard.dueComplete}
                    onClick={(event) => setDatesAnchor(event.currentTarget)}
                  />
                </Box>
              </Box>
            )}

            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <SubjectRoundedIcon />
                <Typography component='span' sx={{ fontWeight: "600", fontSize: "20px" }}>
                  Description
                </Typography>
              </Box>
              <Suspense fallback={<Skeleton variant='rounded' height={120} sx={{ mt: 1 }} />}>
                <CardDescriptionMdEditor
                  cardDescriptionProp={activeCard?.description || ""}
                  handleUpdateCardDescription={onUpdateCardDescription}
                />
              </Suspense>
            </Box>

            {(checklist.length > 0 || isChecklistOpen) && (
              <Box sx={{ mb: 3 }}>
                <CardChecklistSection checklist={checklist} onChange={onUpdateChecklist} />
              </Box>
            )}

            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <DvrOutlinedIcon />
                <Typography component='span' sx={{ fontWeight: "600", fontSize: "20px" }}>
                  Activity
                </Typography>
              </Box>
              <CardActivitySection
                cardComments={comments}
                isLoading={isLoadingComments}
                onAddCardComment={onAddCardComment}
                onUpdateComment={onUpdateComment}
                onDeleteComment={onDeleteComment}
              />
            </Box>

            {activeCard && (
              <Box sx={{ mb: 3 }}>
                <CardHistorySection
                  cardId={activeCard._id}
                  version={activeCardVersion}
                  boardUsers={board?.FE_allUsers ?? []}
                />
              </Box>
            )}
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
              <SidebarItem className='active' onClick={(event) => setLabelsAnchor(event.currentTarget)}>
                <LocalOfferOutlinedIcon fontSize='small' />
                Labels
              </SidebarItem>
              <SidebarItem className='active' onClick={() => setIsChecklistOpen(true)}>
                <TaskAltOutlinedIcon fontSize='small' />
                Checklist
              </SidebarItem>
              <SidebarItem className='active' onClick={(event) => setDatesAnchor(event.currentTarget)}>
                <WatchLaterOutlinedIcon fontSize='small' />
                Dates
              </SidebarItem>
              {datesAnchor && (
                <CardDatesPopover
                  anchorEl={datesAnchor}
                  onClose={() => setDatesAnchor(null)}
                  dueDate={activeCard?.dueDate}
                  onSave={(dueDate) => updateCardQuietly({ dueDate, dueComplete: false })}
                />
              )}
              <CardLabelsPopover
                anchorEl={labelsAnchor}
                onClose={() => setLabelsAnchor(null)}
                boardLabels={boardLabels}
                selectedLabelIds={cardLabelIds}
                onToggleLabel={onToggleCardLabel}
                onBoardLabelsChange={onBoardLabelsChange}
              />
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
              <SidebarItem className='active' onClick={handleArchiveCard}>
                <ArchiveOutlinedIcon fontSize='small' />
                Archive
              </SidebarItem>
              <SidebarItem className='active' onClick={handleDeleteCard}>
                <DeleteForeverIcon fontSize='small' />
                Delete
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
