import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Typography from "@mui/material/Typography";
import { useCallback, useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { toast } from "sonner";

import { fetchArchivedItemsAPI, updateCardDetailsAPI, updateColumnDetailsAPI } from "src/apis";
import { fetchBoardDetailsAPI } from "src/redux/activeBoard/activeBoardSlice";
import type { AppDispatch } from "src/redux/store";
import type { ArchivedItems } from "src/types/board.type";
import { formatDateTime } from "src/utils/formatters";

function ArchivedRow({ title, archivedAt, onRestore }: { title: string; archivedAt: string; onRestore: () => void }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.5 }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography noWrap>{title}</Typography>
        <Typography sx={{ fontSize: "12px", color: "text.secondary" }}>
          Archived {formatDateTime(archivedAt)}
        </Typography>
      </Box>
      <Button size='small' onClick={onRestore}>
        Restore
      </Button>
    </Box>
  );
}

function ArchivedItemsDialog({ boardId, onClose }: { boardId: string; onClose: () => void }) {
  const dispatch = useDispatch<AppDispatch>();
  const [items, setItems] = useState<ArchivedItems | null>(null);

  const loadItems = useCallback(() => {
    fetchArchivedItemsAPI(boardId).then(setItems);
  }, [boardId]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const restore = (request: Promise<unknown>) => {
    request
      .then(() => {
        toast.success("Restored");
        loadItems();
        dispatch(fetchBoardDetailsAPI(boardId));
      })
      .catch(() => {});
  };

  const isEmpty = items && !items.cards.length && !items.columns.length;

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth='xs'>
      <DialogTitle>Archived items</DialogTitle>
      <DialogContent>
        {!items && <Typography>Loading...</Typography>}
        {isEmpty && <Typography sx={{ color: "text.secondary" }}>Nothing is archived.</Typography>}

        {(items?.columns.length ?? 0) > 0 && <Typography sx={{ fontWeight: 600, mt: 1 }}>Columns</Typography>}
        {items?.columns.map((column) => (
          <ArchivedRow
            key={column._id}
            title={column.title}
            archivedAt={column.archivedAt}
            onRestore={() => restore(updateColumnDetailsAPI(column._id, { archived: false }))}
          />
        ))}

        {(items?.cards.length ?? 0) > 0 && <Typography sx={{ fontWeight: 600, mt: 1 }}>Cards</Typography>}
        {items?.cards.map((card) => (
          <ArchivedRow
            key={card._id}
            title={card.title}
            archivedAt={card.archivedAt}
            onRestore={() => restore(updateCardDetailsAPI(card._id, { archived: false }))}
          />
        ))}
      </DialogContent>
    </Dialog>
  );
}

export default ArchivedItemsDialog;
