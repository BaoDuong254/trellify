import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import BoardLinksMenu from "src/components/AppBar/Menus/BoardLinksMenu";
import { renderWithProviders } from "src/test/render";
import type { BoardLink } from "src/types/board.type";

describe("<BoardLinksMenu />", () => {
  it("ignores a slow answer from an earlier opening", async () => {
    const resolvers: ((boards: BoardLink[]) => void)[] = [];
    const loadBoards = (): Promise<BoardLink[]> => new Promise((resolve) => resolvers.push(resolve));
    renderWithProviders(<BoardLinksMenu id='recent' label='Recent' emptyText='Nothing here' loadBoards={loadBoards} />);

    const button = screen.getByRole("button", { name: "Recent" });
    await userEvent.click(button);
    await userEvent.keyboard("{Escape}");
    await userEvent.click(button);

    resolvers[1]?.([{ _id: "board-new", title: "Fresh board" }]);
    resolvers[0]?.([{ _id: "board-old", title: "Stale board" }]);

    expect(await screen.findByText("Fresh board")).toBeInTheDocument();
    expect(screen.queryByText("Stale board")).not.toBeInTheDocument();
  });
});
