import { ARCHIVED_POSITION_SCHEMA, type ArchivedPositionType } from "@workspace/shared/schemas/archive.schema";

const toIdList = (orderIds: unknown): string[] => (Array.isArray(orderIds) ? orderIds.map(String) : []);

export const captureArchivedPosition = (orderIds: unknown, id: unknown): ArchivedPositionType => {
  const ids = toIdList(orderIds);
  const index = ids.indexOf(String(id));
  if (index === -1) return null;
  return {
    prevId: ids[index - 1] ?? null,
    nextId: ids[index + 1] ?? null,
    index,
  };
};

export const resolveRestorePosition = (orderIds: unknown, savedPosition: unknown): number | null => {
  const parsed = ARCHIVED_POSITION_SCHEMA.safeParse(savedPosition);
  const saved = parsed.success ? parsed.data : null;
  if (!saved) return null;

  const ids = toIdList(orderIds);
  const previousIndex = saved.prevId ? ids.indexOf(saved.prevId) : -1;
  if (previousIndex !== -1) return previousIndex + 1;
  const nextIndex = saved.nextId ? ids.indexOf(saved.nextId) : -1;
  if (nextIndex !== -1) return nextIndex;
  return saved.index;
};
