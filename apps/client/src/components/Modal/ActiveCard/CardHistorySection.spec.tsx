import { screen } from "@testing-library/react";
import { HttpResponse, http as mock } from "msw";
import { describe, expect, it } from "vitest";

import CardHistorySection from "src/components/Modal/ActiveCard/CardHistorySection";
import { renderWithProviders } from "src/test/render";
import { apiUrl, server } from "src/test/server";

const ACTIVITIES_URL = apiUrl("/api/v1/cards/card-1/activities");

describe("<CardHistorySection />", () => {
  it("shows a skeleton while loading, then the history", async () => {
    server.use(
      mock.get(ACTIVITIES_URL, () =>
        HttpResponse.json({
          data: [
            {
              _id: "a1",
              actorId: "user-1",
              type: "CARD_CREATED",
              data: {},
              createdAt: "2026-01-10T12:00:00.000Z",
              actor: { displayName: "Ada", avatar: null },
            },
          ],
        })
      )
    );

    renderWithProviders(<CardHistorySection cardId='card-1' version={1} boardUsers={[]} />);

    expect(screen.getAllByTestId("card-history-skeleton")).toHaveLength(3);
    expect(await screen.findByText("created this card")).toBeInTheDocument();
    expect(screen.queryByTestId("card-history-skeleton")).not.toBeInTheDocument();
  });

  it("renders nothing once an empty history has loaded", async () => {
    server.use(mock.get(ACTIVITIES_URL, () => HttpResponse.json({ data: [] })));

    renderWithProviders(<CardHistorySection cardId='card-1' version={1} boardUsers={[]} />);

    await screen.findByText("History");
    await expect.poll(() => screen.queryByText("History")).toBeNull();
  });
});
