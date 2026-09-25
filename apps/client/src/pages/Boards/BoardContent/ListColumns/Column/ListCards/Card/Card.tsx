import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import AttachmentIcon from "@mui/icons-material/Attachment";
import GroupIcon from "@mui/icons-material/Group";
import CommentIcon from "@mui/icons-material/ModeComment";
import TaskAltOutlinedIcon from "@mui/icons-material/TaskAltOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CardMui from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import CardMedia from "@mui/material/CardMedia";
import Typography from "@mui/material/Typography";
import { useDispatch, useSelector } from "react-redux";

import { CardLabelChips, DueDateChip } from "src/components/Modal/ActiveCard/CardBadges";
import { selectCurrentActiveBoard } from "src/redux/activeBoard/activeBoardSlice";
import { showModalActiveCard, updateCurrentActiveCard } from "src/redux/activeCard/activeCardSlice";
import type { AppDispatch } from "src/redux/store";
import type { Card as CardType } from "src/types/board.type";
import { cloudinaryImage } from "src/utils/formatters";

function Card({ card }: { card: CardType }) {
  const dispatch = useDispatch<AppDispatch>();
  const boardLabels = useSelector(selectCurrentActiveBoard)?.labels ?? [];
  const checklist = card.checklist ?? [];
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card._id,
    data: {
      ...card,
    },
  });

  const dndKitCardStyles = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
    border: isDragging ? "1px solid #2ecc71" : undefined,
  };

  const shouldShowCardActions = () => {
    return !!card?.memberIds?.length || !!card?.comments?.length || !!card?.attachments?.length || !!checklist.length;
  };

  const setActiveCard = () => {
    dispatch(updateCurrentActiveCard(card));
    dispatch(showModalActiveCard());
  };

  return (
    <CardMui
      onClick={setActiveCard}
      ref={setNodeRef}
      style={dndKitCardStyles}
      {...attributes}
      {...listeners}
      sx={{
        cursor: "pointer",
        boxShadow: "0 1px 1px rgba(0,0,0,0.2)",
        overflow: "unset",
        display: card?.FE_PlaceholderCard ? "none" : "block",
        border: "1px solid transparent",
        "&:hover": { borderColor: (theme) => theme.palette.primary.main },
      }}
    >
      {card?.cover && (
        <CardMedia
          sx={{ height: 140 }}
          image={cloudinaryImage(card.cover, 272)}
          title={card.description || "Card cover image"}
        />
      )}
      <CardContent sx={{ p: 1.5, "&:last-child": { p: 1.5 } }}>
        <Box sx={{ mb: card?.labelIds?.length ? 0.5 : 0 }}>
          <CardLabelChips boardLabels={boardLabels} labelIds={card?.labelIds} size='small' />
        </Box>
        <Typography>{card?.title}</Typography>
        {card?.dueDate && (
          <Box sx={{ mt: 1 }}>
            <DueDateChip dueDate={card.dueDate} dueComplete={card.dueComplete} />
          </Box>
        )}
      </CardContent>
      {shouldShowCardActions() && (
        <CardActions
          sx={{
            p: "0 4px 8px 4px",
          }}
        >
          {checklist.length > 0 && (
            <Button size='small' startIcon={<TaskAltOutlinedIcon />}>
              {checklist.filter((item) => item.done).length}/{checklist.length}
            </Button>
          )}
          {(card?.memberIds?.length ?? 0) > 0 && (
            <Button size='small' startIcon={<GroupIcon />}>
              {card.memberIds?.length}
            </Button>
          )}
          {(card?.comments?.length ?? 0) > 0 && (
            <Button size='small' startIcon={<CommentIcon />}>
              {card.comments?.length}
            </Button>
          )}
          {(card?.attachments?.length ?? 0) > 0 && (
            <Button size='small' startIcon={<AttachmentIcon />}>
              {card.attachments?.length}
            </Button>
          )}
        </CardActions>
      )}
    </CardMui>
  );
}
export default Card;
