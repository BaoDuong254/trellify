import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import BoardLinksMenu from "src/components/AppBar/Menus/BoardLinksMenu";
import { renderWithProviders } from "src/test/render";
import type { BoardLink } from "src/types/board.type";

describe("<BoardLinksMenu />", () => {
  it("has the list ready when opened, without a loading state", async () => {
    const loadBoards = (): Promise<BoardLink[]> => Promise.resolve([{ _id: "board-1", title: "Roadmap" }]);
    renderWithProviders(
      <BoardLinksMenu id='starred' label='Starred' emptyText='Nothing here' loadBoards={loadBoards} />
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    await userEvent.click(screen.getByRole("button", { name: "Starred" }));

    expect(screen.getByText("Roadmap")).toBeInTheDocument();
    expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
  });

  it("ignores a slow answer from an earlier load", async () => {
    const resolvers: ((boards: BoardLink[]) => void)[] = [];
    const loadBoards = (): Promise<BoardLink[]> => new Promise((resolve) => resolvers.push(resolve));
    renderWithProviders(<BoardLinksMenu id='recent' label='Recent' emptyText='Nothing here' loadBoards={loadBoards} />);

    const button = screen.getByRole("button", { name: "Recent" });
    await userEvent.click(button);
    await userEvent.keyboard("{Escape}");
    await userEvent.click(button);

    resolvers.at(-1)?.([{ _id: "board-new", title: "Fresh board" }]);
    for (const resolve of resolvers.slice(0, -1)) resolve([{ _id: "board-old", title: "Stale board" }]);

    expect(await screen.findByText("Fresh board")).toBeInTheDocument();
    expect(screen.queryByText("Stale board")).not.toBeInTheDocument();
  });
});
