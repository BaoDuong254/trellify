import moment from "moment";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Avatar from "@mui/material/Avatar";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import { useSelector } from "react-redux";
import { selectCurrentUser } from "src/redux/user/userSlice";
import type { CardCommentType } from "@workspace/shared/schemas/card.schema";

function CardActivitySection({
  cardComments,
  onAddCardComment,
}: {
  cardComments?: CardCommentType[];
  onAddCardComment: (commentToAdd: { userAvatar: string; userDisplayName: string; content: string }) => Promise<void>;
}) {
  const currentUser = useSelector(selectCurrentUser);

  const handleAddCardComment = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      const target = event.target as HTMLInputElement;
      if (!target.value) return;

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

  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <Avatar sx={{ width: 36, height: 36, cursor: "pointer" }} alt='user avatar' src={currentUser?.avatar || ""} />
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
      {cardComments?.map((comment) => (
        <Box sx={{ display: "flex", gap: 1, width: "100%", mb: 1.5 }} key={comment.commentedAt.toString()}>
          <Tooltip title={comment.userDisplayName}>
            <Avatar
              sx={{ width: 36, height: 36, cursor: "pointer" }}
              alt={comment.userDisplayName}
              src={comment.userAvatar || ""}
            />
          </Tooltip>
          <Box sx={{ width: "inherit" }}>
            <Typography component='span' sx={{ fontWeight: "bold", mr: 1 }}>
              {comment.userDisplayName}
            </Typography>

            <Typography component='span' sx={{ fontSize: "12px" }}>
              {moment(comment.commentedAt).format("llll")}
            </Typography>

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
          </Box>
        </Box>
      ))}
    </Box>
  );
}

export default CardActivitySection;
