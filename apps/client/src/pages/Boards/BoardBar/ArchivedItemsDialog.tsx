import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
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
  const [reloadKey, setReloadKey] = useState(0);
  const [result, setResult] = useState<{ reloadKey: number; items: ArchivedItems | null; hasFailed: boolean } | null>(
    null
  );

  useEffect(() => {
    let cancelled = false;
    fetchArchivedItemsAPI(boardId)
      .then((archived) => {
        if (!cancelled) setResult({ reloadKey, items: archived, hasFailed: false });
      })
      .catch(() => {
        if (!cancelled) setResult((previous) => ({ reloadKey, items: previous?.items ?? null, hasFailed: true }));
      });
    return () => {
      cancelled = true;
    };
  }, [boardId, reloadKey]);

  const reload = () => setReloadKey((key) => key + 1);
  const items = result?.items ?? null;
  const hasFailed = result?.reloadKey === reloadKey && result.hasFailed;

  const restore = (request: Promise<unknown>) => {
    request
      .then(() => {
        toast.success("Restored");
        reload();
        dispatch(fetchBoardDetailsAPI(boardId));
      })
      .catch(() => {});
  };

  const isEmpty = items && !items.cards.length && !items.columns.length;

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth='xs'>
      <DialogTitle>Archived items</DialogTitle>
      <DialogContent>
        {!items && !hasFailed && <Typography>Loading...</Typography>}
        {hasFailed && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography sx={{ color: "error.main" }}>
              {items ? "Could not refresh archived items." : "Could not load archived items."}
            </Typography>
            <Button size='small' onClick={reload}>
              Retry
            </Button>
          </Box>
        )}
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
