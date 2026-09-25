import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import Card from "src/pages/Boards/BoardContent/ListColumns/Column/ListCards/Card/Card";
import { updateCurrentActiveBoard } from "src/redux/activeBoard/activeBoardSlice";
import { buildBoard, buildCard } from "src/test/fixtures";
import { renderWithProviders } from "src/test/render";

describe("<Card />", () => {
  it("shows the title and no count buttons when there is nothing to count", () => {
    renderWithProviders(<Card card={buildCard({ title: "Ship it" })} />);

    expect(screen.getByText("Ship it")).toBeInTheDocument();
    expect(screen.getAllByRole("button")).toEqual([screen.getByRole("button", { name: "Ship it" })]);
  });

  it("shows member and comment counts", () => {
    const card = buildCard({
      memberIds: ["user-1", "user-2"],
      comments: [
        {
          userId: "user-1",
          userEmail: "a@trellify.test",
          userAvatar: null,
          userDisplayName: "A",
          content: "Hi",
          commentedAt: new Date(),
        },
      ],
    });

    renderWithProviders(<Card card={card} />);

    expect(screen.getByRole("button", { name: "2" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "1" })).toBeInTheDocument();
  });

  it("keeps the placeholder card out of sight", () => {
    renderWithProviders(<Card card={buildCard({ title: "Placeholder", FE_PlaceholderCard: true })} />);

    expect(screen.getByText("Placeholder")).not.toBeVisible();
  });

  it("opens the card modal with this card when clicked", async () => {
    const card = buildCard({ title: "Open me" });
    const { store } = renderWithProviders(<Card card={card} />);

    await userEvent.click(screen.getByText("Open me"));

    expect(store.getState().activeCard).toEqual({ currentActiveCard: card, isShowModalActiveCard: true });
  });

  it("shows the card's labels and checklist progress", () => {
    const card = buildCard({
      labelIds: ["label-1"],
      checklist: [
        { _id: "item-1", text: "One", done: true },
        { _id: "item-2", text: "Two", done: false },
      ],
    });
    const { store } = renderWithProviders(<Card card={card} />);
    act(() => {
      store.dispatch(
        updateCurrentActiveBoard(
          buildBoard({
            labels: [
              { _id: "label-1", name: "Bug", color: "#eb5a46" },
              { _id: "label-2", name: "Unused", color: "#61bd4f" },
            ],
          })
        )
      );
    });

    expect(screen.getByText("Bug")).toBeInTheDocument();
    expect(screen.queryByText("Unused")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "1/2" })).toBeInTheDocument();
  });
});
