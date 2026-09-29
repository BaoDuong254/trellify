import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http as mock } from "msw";
import { Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";

import { useBoardLoader } from "src/hooks/useBoardLoader";
import { buildBoard } from "src/test/fixtures";
import { renderWithProviders } from "src/test/render";
import { apiUrl, server } from "src/test/server";
import { getRecentBoards, rememberRecentBoard } from "src/utils/recentBoards";

const BOARD_URL = apiUrl("/api/v1/boards/board-1");

function Probe() {
  const { loadError, retry } = useBoardLoader("board-1");
  return (
    <div>
      <span>{loadError ? `failed:${String(loadError.status)}` : "no error"}</span>
      <button type='button' onClick={retry}>
        retry
      </button>
    </div>
  );
}

const renderProbe = () =>
  renderWithProviders(
    <Routes>
      <Route path='/boards/:boardId' element={<Probe />} />
      <Route path='/boards' element={<div>Board list</div>} />
    </Routes>,
    { route: "/boards/board-1" }
  );

describe("useBoardLoader", () => {
  beforeEach(() => {
    localStorage.clear();
    rememberRecentBoard({ _id: "board-1", title: "Roadmap" });
  });

  it("sends the user back to the board list and forgets the board when it is gone", async () => {
    server.use(mock.get(BOARD_URL, () => HttpResponse.json({ message: "Error.BoardNotFound" }, { status: 404 })));

    renderProbe();

    expect(await screen.findByText("Board list")).toBeInTheDocument();
    expect(getRecentBoards()).toEqual([]);
  });

  it("stays on the board and offers a retry when the failure is temporary", async () => {
    let attempts = 0;
    server.use(
      mock.get(BOARD_URL, () => {
        attempts++;
        if (attempts === 1) return HttpResponse.json({ message: "boom" }, { status: 500 });
        return HttpResponse.json({ data: buildBoard({ _id: "board-1" }) });
      })
    );

    const rendered = renderProbe();

    expect(await screen.findByText("failed:500")).toBeInTheDocument();
    expect(getRecentBoards()).toEqual([{ _id: "board-1", title: "Roadmap" }]);

    await userEvent.click(screen.getByRole("button", { name: "retry" }));

    await waitFor(() => expect(attempts).toBe(2));
    const { store } = rendered;
    await waitFor(() => expect(store.getState().activeBoard.currentActiveBoard?._id).toBe("board-1"));
    expect(screen.getByText("no error")).toBeInTheDocument();
  });
});
