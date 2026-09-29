import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http as mock } from "msw";
import { describe, expect, it } from "vitest";

import ArchivedItemsDialog from "src/pages/Boards/BoardBar/ArchivedItemsDialog";
import { buildBoard } from "src/test/fixtures";
import { renderWithProviders } from "src/test/render";
import { apiUrl, server } from "src/test/server";

const ARCHIVED_URL = apiUrl("/api/v1/boards/board-1/archived");

describe("<ArchivedItemsDialog />", () => {
  it("offers a retry when loading fails and shows the items once it succeeds", async () => {
    let attempts = 0;
    server.use(
      mock.get(ARCHIVED_URL, () => {
        attempts++;
        if (attempts === 1) return HttpResponse.json({ message: "boom" }, { status: 500 });
        return HttpResponse.json({
          data: {
            cards: [{ _id: "card-1", title: "Old card", columnId: "column-1", archivedAt: "2026-01-10T12:00:00Z" }],
            columns: [],
          },
        });
      })
    );

    renderWithProviders(<ArchivedItemsDialog boardId='board-1' onClose={() => {}} />);

    expect(await screen.findByText("Could not load archived items.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByText("Old card")).toBeInTheDocument();
    expect(screen.queryByText("Could not load archived items.")).not.toBeInTheDocument();
    expect(attempts).toBe(2);
  });

  it("keeps the current list when refreshing after a restore fails", async () => {
    let attempts = 0;
    server.use(
      mock.get(ARCHIVED_URL, () => {
        attempts++;
        if (attempts > 1) return HttpResponse.json({ message: "boom" }, { status: 500 });
        return HttpResponse.json({
          data: {
            cards: [
              { _id: "card-1", title: "First card", columnId: "column-1", archivedAt: "2026-01-10T12:00:00Z" },
              { _id: "card-2", title: "Second card", columnId: "column-1", archivedAt: "2026-01-10T11:00:00Z" },
            ],
            columns: [],
          },
        });
      }),
      mock.put(apiUrl("/api/v1/cards/card-1"), () => HttpResponse.json({ data: { _id: "card-1", comments: [] } })),
      mock.get(apiUrl("/api/v1/boards/board-1"), () => HttpResponse.json({ data: buildBoard() }))
    );

    renderWithProviders(<ArchivedItemsDialog boardId='board-1' onClose={() => {}} />);

    await screen.findByText("First card");
    await userEvent.click(screen.getAllByRole("button", { name: "Restore" })[0] as HTMLElement);

    expect(await screen.findByText("Could not refresh archived items.")).toBeInTheDocument();
    expect(screen.getByText("Second card")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });
});
