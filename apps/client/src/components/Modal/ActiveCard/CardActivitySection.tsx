import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Link from "@mui/material/Link";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { useSelector } from "react-redux";

import type { CardCommentType } from "@workspace/shared/schemas/card.schema";

import { selectCurrentUser } from "src/redux/user/userSlice";
import { cloudinaryThumb, formatDateTime } from "src/utils/formatters";

function CardActivitySection({
  cardComments,
  onAddCardComment,
  onUpdateComment,
  onDeleteComment,
}: {
  cardComments?: CardCommentType[];
  onAddCardComment: (commentToAdd: { userAvatar: string; userDisplayName: string; content: string }) => Promise<void>;
  onUpdateComment: (commentToUpdate: { _id: string; content: string }) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
}) {
  const currentUser = useSelector(selectCurrentUser);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);

  const handleAddCardComment = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      const target = event.target as HTMLInputElement;
      if (!target.value.trim()) return;

      const commentToAdd = {
        userAvatar: currentUser?.avatar || "",
        userDisplayName: currentUser?.displayName || "Unknown User",
        content: target.value.trim(),
      };
      onAddCardComment(commentToAdd).then(() => {
        target.value = "";
      });
    }
  };

  const handleEditKeyDown = (commentId: string) => (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setEditingCommentId(null);
      return;
    }
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    const content = (event.target as HTMLInputElement).value.trim();
    if (!content) return;
    onUpdateComment({ _id: commentId, content }).then(() => setEditingCommentId(null));
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <Avatar
          sx={{ width: 36, height: 36, cursor: "pointer" }}
          alt='user avatar'
          src={cloudinaryThumb(currentUser?.avatar, 36)}
        />
        <TextField
          fullWidth
          placeholder='Write a comment...'
          type='text'
          variant='outlined'
          multiline
          onKeyDown={handleAddCardComment}
        />
      </Box>

      {cardComments?.length === 0 && (
        <Typography sx={{ pl: "45px", fontSize: "14px", fontWeight: "500", color: "#b1b1b1" }}>
          No activity found!
        </Typography>
      )}
      {cardComments?.map((comment) => {
        const commentId = comment._id;
        const isOwnComment = Boolean(commentId) && comment.userId === currentUser?._id;
        const isEditing = Boolean(commentId) && editingCommentId === commentId;

        return (
          <Box
            sx={{ display: "flex", gap: 1, width: "100%", mb: 1.5 }}
            key={commentId ?? comment.commentedAt.toString()}
          >
            <Tooltip title={comment.userDisplayName}>
              <Avatar
                sx={{ width: 36, height: 36, cursor: "pointer" }}
                alt={comment.userDisplayName}
                src={cloudinaryThumb(comment.userAvatar, 36)}
              />
            </Tooltip>
            <Box sx={{ width: "inherit" }}>
              <Typography component='span' sx={{ fontWeight: "bold", mr: 1 }}>
                {comment.userDisplayName}
              </Typography>

              <Typography component='span' sx={{ fontSize: "12px" }}>
                {formatDateTime(comment.commentedAt)}
                {comment.editedAt && " (edited)"}
              </Typography>

              {isEditing && commentId ? (
                <TextField
                  fullWidth
                  multiline
                  size='small'
                  defaultValue={comment.content}
                  onKeyDown={handleEditKeyDown(commentId)}
                  helperText='Enter to save, Esc to cancel'
                  sx={{ mt: "4px" }}
                />
              ) : (
                <Box
                  sx={{
                    display: "block",
                    bgcolor: (theme) => (theme.palette.mode === "dark" ? "#33485D" : "white"),
                    p: "8px 12px",
                    mt: "4px",
                    border: "0.5px solid rgba(0, 0, 0, 0.2)",
                    borderRadius: "4px",
                    wordBreak: "break-word",
                    boxShadow: "0 0 1px rgba(0, 0, 0, 0.2)",
                  }}
                >
                  {comment.content}
                </Box>
              )}

              {isOwnComment && commentId && !isEditing && (
                <Box sx={{ display: "flex", gap: 1, mt: 0.5, fontSize: "12px" }}>
                  <Link component='button' type='button' onClick={() => setEditingCommentId(commentId)}>
                    Edit
                  </Link>
                  <Link component='button' type='button' color='error' onClick={() => onDeleteComment(commentId)}>
                    Delete
                  </Link>
                </Box>
              )}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

export default CardActivitySection;
