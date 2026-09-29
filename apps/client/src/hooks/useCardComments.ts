import { useEffect, useRef, useState } from "react";

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
  const latestRequestRef = useRef(0);

  useEffect(() => {
    if (!cardId) return;
    let cancelled = false;
    const request = ++latestRequestRef.current;
    const isCurrent = (): boolean => !cancelled && request === latestRequestRef.current;
    fetchCardCommentsAPI(cardId)
      .then((comments) => {
        if (isCurrent()) setLoaded({ cardId, comments });
      })
      .catch(() => {
        if (isCurrent()) setLoaded({ cardId, comments: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [cardId, version]);

  const isLoading = Boolean(cardId) && loaded?.cardId !== cardId;

  return {
    comments: isLoading ? [] : (loaded?.comments ?? []),
    isLoading,
    replaceComments: (nextCardId, comments) => {
      latestRequestRef.current++;
      setLoaded({ cardId: nextCardId, comments });
    },
  };
};
