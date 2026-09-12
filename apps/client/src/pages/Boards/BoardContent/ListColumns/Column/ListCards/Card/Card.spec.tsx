import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import Card from "src/pages/Boards/BoardContent/ListColumns/Column/ListCards/Card/Card";
import { buildCard } from "src/test/fixtures";
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
});
