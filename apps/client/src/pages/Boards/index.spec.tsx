import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http as mock } from "msw";
import { describe, expect, it, vi } from "vitest";

import Boards from "src/pages/Boards";
import { renderWithProviders } from "src/test/render";
import { apiUrl, server } from "src/test/server";

vi.mock("src/components/AppBar/AppBar", () => ({ default: () => null }));
vi.mock("src/pages/Boards/create", () => ({ default: () => null }));
vi.mock("src/hooks/useStarredBoards", () => ({
  useStarredBoards: () => ({ isStarred: () => false, toggleStar: vi.fn() }),
}));

describe("Boards", () => {
  it("offers a retry instead of loading forever when the server is unreachable", async () => {
    let online = false;
    server.use(
      mock.get(apiUrl("/api/v1/boards"), () =>
        online ? HttpResponse.json({ data: { boards: [], totalBoards: 0 } }) : HttpResponse.error()
      )
    );

    renderWithProviders(<Boards />, { route: "/boards" });

    const retry = await screen.findByRole("button", { name: "Retry" });
    online = true;
    await userEvent.click(retry);

    expect(await screen.findByText("No result found!")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
  });
});
