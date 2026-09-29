import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";

function StarBoardButton({
  starred,
  boardTitle,
  onToggle,
  onSurface = false,
}: {
  starred: boolean;
  boardTitle: string;
  onToggle: () => void;
  onSurface?: boolean;
}) {
  const starredColor = onSurface ? "warning.main" : "#f2d600";
  const idleColor = onSurface ? "text.secondary" : "white";

  return (
    <Tooltip title={starred ? "Unstar board" : "Star board"}>
      <IconButton
        size='small'
        aria-label={`${starred ? "Unstar" : "Star"} board ${boardTitle}`}
        aria-pressed={starred}
        onClick={onToggle}
        sx={{
          color: starred ? starredColor : idleColor,
          "&:hover": { color: starredColor, bgcolor: onSurface ? "action.hover" : "rgba(0, 0, 0, 0.25)" },
        }}
      >
        {starred ? <StarIcon fontSize='small' /> : <StarBorderIcon fontSize='small' />}
      </IconButton>
    </Tooltip>
  );
}

export default StarBoardButton;
