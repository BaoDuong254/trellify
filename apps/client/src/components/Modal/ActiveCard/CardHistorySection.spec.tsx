import { screen } from "@testing-library/react";
import { HttpResponse, delay, http as mock } from "msw";
import { describe, expect, it } from "vitest";

import CardHistorySection from "src/components/Modal/ActiveCard/CardHistorySection";
import { renderWithProviders } from "src/test/render";
import { apiUrl, server } from "src/test/server";

const created = {
  _id: "a1",
  actorId: "user-1",
  type: "CARD_CREATED",
  data: {},
  createdAt: "2026-01-10T12:00:00.000Z",
  actor: { displayName: "Ada", avatar: null },
};

const serveHistory = (cardId: string, entries: unknown[], delayMs = 0) =>
  server.use(
    mock.get(apiUrl(`/api/v1/cards/${cardId}/activities`), async () => {
      if (delayMs) await delay(delayMs);
      return HttpResponse.json({ data: entries });
    })
  );

const renderHistory = (cardId: string) =>
  renderWithProviders(<CardHistorySection cardId={cardId} version='v1' boardUsers={[]} />);

describe("<CardHistorySection />", () => {
  it("never flashes a skeleton when the history arrives quickly", async () => {
    serveHistory("card-fast", [created]);

    renderHistory("card-fast");

    expect(screen.queryByTestId("card-history-skeleton")).not.toBeInTheDocument();
    expect(await screen.findByText("created this card")).toBeInTheDocument();
    expect(screen.queryByTestId("card-history-skeleton")).not.toBeInTheDocument();
  });

  it("shows a skeleton only once loading takes a while", async () => {
    serveHistory("card-slow", [created], 600);

    renderHistory("card-slow");

    expect(await screen.findAllByTestId("card-history-skeleton")).toHaveLength(3);
    expect(await screen.findByText("created this card", undefined, { timeout: 2000 })).toBeInTheDocument();
    expect(screen.queryByTestId("card-history-skeleton")).not.toBeInTheDocument();
  });

  it("renders nothing at any point for a card without history", async () => {
    serveHistory("card-empty", []);

    renderHistory("card-empty");

    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(screen.queryByText("History")).not.toBeInTheDocument();
    expect(screen.queryByTestId("card-history-skeleton")).not.toBeInTheDocument();
  });

  it("shows the cached history straight away when the card is opened again", async () => {
    serveHistory("card-cached", [created]);
    const first = renderHistory("card-cached");
    await screen.findByText("created this card");
    first.unmount();

    serveHistory("card-cached", [created], 600);
    renderHistory("card-cached");

    expect(screen.getByText("created this card")).toBeInTheDocument();
  });
});
