import { HttpResponse, delay, http as mock } from "msw";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SOCKET_ID_HEADER } from "@workspace/shared/utils/socket-events";

import type { store } from "src/redux/store";
import { apiUrl, server } from "src/test/server";
import http, { injectStore } from "src/utils/http";
import { recordApiError } from "src/utils/metrics";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("src/socketClient", () => ({ getSocketId: () => "socket-123" }));
vi.mock("src/utils/metrics", () => ({ recordApiError: vi.fn() }));

const BOARD_URL = apiUrl("/api/v1/boards/board-1");
const REFRESH_URL = apiUrl("/api/v1/users/refresh_token");

const dispatch = vi.fn();
const getState = vi.fn();

describe("http client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getState.mockReturnValue({ user: { currentUser: { _id: "user-1" } } });
    injectStore({ dispatch, getState } as unknown as typeof store);
  });

  it("sends the socket id so the server can exclude this tab from its own broadcast", async () => {
    let received: string | null = null;
    server.use(
      mock.get(BOARD_URL, ({ request }) => {
        received = request.headers.get(SOCKET_ID_HEADER);
        return HttpResponse.json({ data: {} });
      })
    );

    await http.get(BOARD_URL);

    expect(received).toBe("socket-123");
  });

  it("refreshes once for concurrent 410s and replays every original request", async () => {
    let refreshCalls = 0;
    let refreshed = false;
    server.use(
      mock.get(REFRESH_URL, async () => {
        refreshCalls += 1;
        await delay(30);
        refreshed = true;
        return HttpResponse.json({ statusCode: 200 });
      }),
      mock.get(BOARD_URL, () =>
        refreshed ? HttpResponse.json({ data: "fresh" }) : HttpResponse.json({ message: "expired" }, { status: 410 })
      )
    );

    const responses = await Promise.all([http.get(BOARD_URL), http.get(BOARD_URL)]);

    expect(refreshCalls).toBe(1);
    expect(responses.map((response) => response.data.data)).toEqual(["fresh", "fresh"]);
    expect(toast.error).not.toHaveBeenCalled();
    expect(recordApiError).not.toHaveBeenCalled();
  });

  it("logs out when the refresh itself fails", async () => {
    server.use(
      mock.get(REFRESH_URL, () => HttpResponse.json({ message: "Please login again." }, { status: 403 })),
      mock.get(BOARD_URL, () => HttpResponse.json({ message: "expired" }, { status: 410 }))
    );

    await expect(http.get(BOARD_URL)).rejects.toMatchObject({ response: { status: 403 } });

    expect(dispatch).toHaveBeenCalledWith(expect.any(Function));
  });

  it("logs out on 401 and shows the server message", async () => {
    server.use(mock.get(BOARD_URL, () => HttpResponse.json({ message: "Unauthorized!" }, { status: 401 })));

    await expect(http.get(BOARD_URL)).rejects.toMatchObject({ response: { status: 401 } });

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledWith("Unauthorized!");
  });

  it("does not log out on 401 when nobody is logged in, such as a failed login", async () => {
    getState.mockReturnValue({ user: { currentUser: null } });
    server.use(mock.get(BOARD_URL, () => HttpResponse.json({ message: "Wrong password" }, { status: 401 })));

    await expect(http.get(BOARD_URL)).rejects.toMatchObject({ response: { status: 401 } });

    expect(dispatch).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("Wrong password");
  });

  it("shows one offline toast and stays logged in when the server cannot be reached", async () => {
    server.use(mock.get(BOARD_URL, () => HttpResponse.error()));

    await Promise.allSettled([http.get(BOARD_URL), http.get(BOARD_URL)]);

    const [[, firstOptions], [, secondOptions]] = vi.mocked(toast.error).mock.calls;
    expect(firstOptions?.id).toBe("server-unreachable");
    expect(secondOptions?.id).toBe(firstOptions?.id);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("treats Cloudflare's 530 for a stopped tunnel as offline", async () => {
    server.use(mock.get(BOARD_URL, () => new HttpResponse("origin down", { status: 530 })));

    await expect(http.get(BOARD_URL)).rejects.toMatchObject({ response: { status: 530 } });

    expect(toast.error).toHaveBeenCalledWith(expect.any(String), { id: "server-unreachable" });
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("shows the API's own message when the server itself answers 503", async () => {
    server.use(
      mock.get(BOARD_URL, () => HttpResponse.json({ message: "Turnstile service unavailable" }, { status: 503 }))
    );

    await expect(http.get(BOARD_URL)).rejects.toMatchObject({ response: { status: 503 } });

    expect(toast.error).toHaveBeenCalledWith("Turnstile service unavailable");
  });

  it("stays logged in when the refresh fails because the server went away", async () => {
    server.use(
      mock.get(REFRESH_URL, () => HttpResponse.error()),
      mock.get(BOARD_URL, () => HttpResponse.json({ message: "expired" }, { status: 410 }))
    );

    await expect(http.get(BOARD_URL)).rejects.toBeDefined();

    expect(dispatch).not.toHaveBeenCalled();
  });

  it("counts a failed request under its status code", async () => {
    server.use(mock.get(BOARD_URL, () => HttpResponse.json({ message: "Boom" }, { status: 500 })));

    await expect(http.get(BOARD_URL)).rejects.toMatchObject({ response: { status: 500 } });

    expect(recordApiError).toHaveBeenCalledWith(500);
  });

  it("joins Zod issue messages into one toast", async () => {
    const issues = JSON.stringify([{ message: "Title too short" }, { message: "Type is invalid" }]);
    server.use(mock.put(BOARD_URL, () => HttpResponse.json({ message: issues }, { status: 422 })));

    await expect(http.put(BOARD_URL, {})).rejects.toBeDefined();

    expect(toast.error).toHaveBeenCalledWith("Title too short, Type is invalid");
    expect(dispatch).not.toHaveBeenCalled();
  });
});
