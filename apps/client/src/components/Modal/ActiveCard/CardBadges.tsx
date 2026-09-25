import WatchLaterOutlinedIcon from "@mui/icons-material/WatchLaterOutlined";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";

import type { BoardLabelType } from "@workspace/shared/schemas/board.schema";

import { type DueStatus, dueStatus, formatDateTime } from "src/utils/formatters";

const DUE_STATUS_COLORS: Record<DueStatus, "success" | "error" | "warning" | "default"> = {
  complete: "success",
  overdue: "error",
  dueSoon: "warning",
  upcoming: "default",
};

export function CardLabelChips({
  boardLabels,
  labelIds,
  size = "medium",
}: {
  boardLabels: BoardLabelType[];
  labelIds?: string[];
  size?: "small" | "medium";
}) {
  const labels = boardLabels.filter((label) => labelIds?.includes(label._id));
  if (!labels.length) return null;

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
      {labels.map((label) => (
        <Chip
          key={label._id}
          label={label.name}
          size={size}
          sx={{
            bgcolor: label.color,
            color: "#fff",
            fontWeight: 600,
            minWidth: size === "small" ? 40 : 56,
            height: size === "small" ? 18 : undefined,
            fontSize: size === "small" ? "11px" : undefined,
          }}
        />
      ))}
    </Box>
  );
}

export function DueDateChip({
  dueDate,
  dueComplete,
  onClick,
}: {
  dueDate: string;
  dueComplete?: boolean;
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
}) {
  return (
    <Chip
      size='small'
      icon={<WatchLaterOutlinedIcon />}
      label={formatDateTime(dueDate)}
      color={DUE_STATUS_COLORS[dueStatus(dueDate, dueComplete)]}
      onClick={onClick}
    />
  );
}
