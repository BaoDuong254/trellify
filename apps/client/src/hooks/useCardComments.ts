import { useEffect, useState } from "react";

import type { CardCommentType } from "@workspace/shared/schemas/card.schema";

import { fetchCardCommentsAPI } from "src/apis";

type LoadedComments = { cardId: string; comments: CardCommentType[] };

export const useCardComments = (
  cardId: string | undefined,
  version: string
): {
  comments: CardCommentType[];
  isLoading: boolean;
  replaceComments: (cardId: string, comments: CardCommentType[]) => void;
} => {
  const [loaded, setLoaded] = useState<LoadedComments | null>(null);

  useEffect(() => {
    if (!cardId) return;
    let cancelled = false;
    fetchCardCommentsAPI(cardId)
      .then((comments) => {
        if (!cancelled) setLoaded({ cardId, comments });
      })
      .catch(() => {
        if (!cancelled) setLoaded({ cardId, comments: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [cardId, version]);

  const isLoading = Boolean(cardId) && loaded?.cardId !== cardId;

  return {
    comments: isLoading ? [] : (loaded?.comments ?? []),
    isLoading,
    replaceComments: (nextCardId, comments) => setLoaded({ cardId: nextCardId, comments }),
  };
};
