import HistoryIcon from "@mui/icons-material/History";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";

import { CARD_ACTIVITY_TYPES, type CardActivityEntryType } from "@workspace/shared/schemas/activity.schema";

import { fetchCardActivitiesAPI } from "src/apis";
import { useDelayedFlag } from "src/hooks/useDelayedFlag";
import type { User } from "src/types/user.type";
import { cloudinaryThumb, formatDateTime } from "src/utils/formatters";
import { createRecentCache } from "src/utils/recentCache";

type BoardUser = Pick<User, "displayName"> & { _id: string };

const describeMember = (entry: CardActivityEntryType, users: BoardUser[], self: string, other: string): string => {
  const userId = String(entry.data.userId ?? "");
  if (userId === entry.actorId) return self;
  const name = users.find((user) => user._id === userId)?.displayName ?? "a member";
  return other.replace("{name}", name);
};

const describeActivity = (entry: CardActivityEntryType, users: BoardUser[]): string => {
  const { data } = entry;
  switch (entry.type) {
    case CARD_ACTIVITY_TYPES.CARD_CREATED:
      return "created this card";
    case CARD_ACTIVITY_TYPES.CARD_MOVED:
      return `moved this card from ${String(data.from)} to ${String(data.to)}`;
    case CARD_ACTIVITY_TYPES.TITLE_CHANGED:
      return `renamed this card to "${String(data.to)}"`;
    case CARD_ACTIVITY_TYPES.DESCRIPTION_CHANGED:
      return "updated the description";
    case CARD_ACTIVITY_TYPES.DUE_DATE_SET:
      return `set the due date to ${formatDateTime(String(data.dueDate))}`;
    case CARD_ACTIVITY_TYPES.DUE_DATE_REMOVED:
      return "removed the due date";
    case CARD_ACTIVITY_TYPES.DUE_COMPLETED:
      return "marked the due date complete";
    case CARD_ACTIVITY_TYPES.LABELS_CHANGED:
      return "changed the labels";
    case CARD_ACTIVITY_TYPES.CHECKLIST_CHANGED:
      return `updated the checklist (${String(data.done)}/${String(data.total)})`;
    case CARD_ACTIVITY_TYPES.MEMBER_ADDED:
      return describeMember(entry, users, "joined this card", "added {name} to this card");
    case CARD_ACTIVITY_TYPES.MEMBER_REMOVED:
      return describeMember(entry, users, "left this card", "removed {name} from this card");
    case CARD_ACTIVITY_TYPES.COVER_CHANGED:
      return "changed the cover";
    case CARD_ACTIVITY_TYPES.ARCHIVED:
      return "archived this card";
    case CARD_ACTIVITY_TYPES.RESTORED:
      return "restored this card";
  }
};

const HISTORY_SKELETON_ROWS = [0, 1, 2];

const historyCache = createRecentCache<CardActivityEntryType[]>();

function CardHistorySection({
  cardId,
  version,
  boardUsers,
}: {
  cardId: string;
  version: string;
  boardUsers: BoardUser[];
}) {
  const [loaded, setLoaded] = useState<{ cardId: string; entries: CardActivityEntryType[] } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchCardActivitiesAPI(cardId)
      .then((entries) => {
        if (cancelled) return;
        historyCache.set(cardId, entries);
        setLoaded({ cardId, entries });
      })
      .catch(() => {
        if (!cancelled && !historyCache.get(cardId)) setLoaded({ cardId, entries: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [cardId, version]);

  const knownEntries = loaded?.cardId === cardId ? loaded.entries : historyCache.get(cardId);
  const isLoading = knownEntries === undefined;
  const showSkeleton = useDelayedFlag(isLoading);
  const entries = knownEntries ?? [];

  if (isLoading ? !showSkeleton : entries.length === 0) return null;

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
        <HistoryIcon />
        <Typography component='span' sx={{ fontWeight: "600", fontSize: "20px" }}>
          History
        </Typography>
      </Box>
      {showSkeleton &&
        HISTORY_SKELETON_ROWS.map((row) => (
          <Box key={row} data-testid='card-history-skeleton' sx={{ display: "flex", gap: 1, mb: 1 }}>
            <Skeleton variant='circular' width={28} height={28} />
            <Box sx={{ flex: 1 }}>
              <Skeleton variant='text' width='70%' sx={{ fontSize: "14px" }} />
              <Skeleton variant='text' width='35%' sx={{ fontSize: "12px" }} />
            </Box>
          </Box>
        ))}
      {entries.map((entry) => (
        <Box key={entry._id} sx={{ display: "flex", gap: 1, alignItems: "flex-start", mb: 1 }}>
          <Avatar
            sx={{ width: 28, height: 28 }}
            alt={entry.actor?.displayName}
            src={cloudinaryThumb(entry.actor?.avatar, 28)}
          />
          <Box>
            <Typography sx={{ fontSize: "14px" }}>
              <Box component='span' sx={{ fontWeight: 600 }}>
                {entry.actor?.displayName ?? "Someone"}
              </Box>{" "}
              {describeActivity(entry, boardUsers)}
            </Typography>
            <Typography sx={{ fontSize: "12px", color: "text.secondary" }}>
              {formatDateTime(entry.createdAt)}
            </Typography>
          </Box>
        </Box>
      ))}
    </Box>
  );
}

export default CardHistorySection;
