import { useEffect, useRef, useState } from "react";

import type { CardCommentType } from "@workspace/shared/schemas/card.schema";

import { fetchCardCommentsAPI } from "src/apis";
import { createRecentCache } from "src/utils/recentCache";

type LoadedComments = { cardId: string; comments: CardCommentType[] };

const commentsCache = createRecentCache<CardCommentType[]>();

export const useCardComments = (
  cardId: string | undefined,
  version: string
): {
  comments: CardCommentType[];
  isLoading: boolean;
  replaceComments: (cardId: string, comments: CardCommentType[]) => void;
} => {
  const [loaded, setLoaded] = useState<LoadedComments | null>(null);
  const latestRequestRef = useRef(0);

  useEffect(() => {
    if (!cardId) return;
    let cancelled = false;
    const request = ++latestRequestRef.current;
    const isCurrent = (): boolean => !cancelled && request === latestRequestRef.current;
    fetchCardCommentsAPI(cardId)
      .then((comments) => {
        if (!isCurrent()) return;
        commentsCache.set(cardId, comments);
        setLoaded({ cardId, comments });
      })
      .catch(() => {
        if (isCurrent() && !commentsCache.get(cardId)) setLoaded({ cardId, comments: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [cardId, version]);

  const current = cardId && loaded?.cardId === cardId ? loaded.comments : undefined;
  const comments = current ?? (cardId ? commentsCache.get(cardId) : undefined);

  return {
    comments: comments ?? [],
    isLoading: Boolean(cardId) && comments === undefined,
    replaceComments: (nextCardId, nextComments) => {
      latestRequestRef.current++;
      commentsCache.set(nextCardId, nextComments);
      setLoaded({ cardId: nextCardId, comments: nextComments });
    },
  };
};
