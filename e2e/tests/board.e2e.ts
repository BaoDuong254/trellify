import { type Locator, type Page, expect, test } from "@playwright/test";

const columnNamed = (page: Page, title: string): Locator =>
  page.locator('[aria-roledescription="sortable"]').filter({ has: page.locator(`input[value="${title}"]`) });

const createBoard = async (page: Page, title: string): Promise<void> => {
  await page.goto("/boards");
  await page.getByText("Create a new board").click();
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Description").fill("Created by the Playwright suite");
  await page.getByRole("button", { name: "Create" }).click();

  const boardCard = page.locator(".MuiCard-root").filter({ hasText: title });
  await boardCard.getByText("Go to board").click();
  await page.waitForURL(/\/boards\/[0-9a-f]{24}$/);
};

const addColumn = async (page: Page, title: string): Promise<void> => {
  await page.getByText("Add new column").click();
  await page.getByLabel("Enter column title...").fill(title);
  await page.getByRole("button", { name: "Add Column" }).click();
  await expect(columnNamed(page, title)).toBeVisible();
};

const addCard = async (page: Page, columnTitle: string, cardTitle: string): Promise<void> => {
  const column = columnNamed(page, columnTitle);
  await column.getByRole("button", { name: "Add new card" }).click();
  await column.getByLabel("Enter card title...").fill(cardTitle);
  await column.getByLabel("Enter card title...").press("Enter");
  await expect(column.getByText(cardTitle)).toBeVisible();
};

const dragOnto = async (page: Page, source: Locator, target: Locator): Promise<void> => {
  const from = await source.boundingBox();
  const to = await target.boundingBox();
  if (!from || !to) throw new Error("Drag source or target is not on screen");

  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + from.width / 2 + 15, from.y + from.height / 2, { steps: 5 });
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 25 });
  await page.mouse.up();
};

test("a card dragged to another column stays there after a reload", async ({ page }) => {
  const boardTitle = `E2E board ${Date.now()}`;
  await createBoard(page, boardTitle);
  await addColumn(page, "To do");
  await addColumn(page, "Done");
  await addCard(page, "To do", "Ship the test suite");

  const moved = page.waitForResponse(
    (response) => response.url().includes("/api/v1/boards/supports/moving_card") && response.ok()
  );
  await dragOnto(page, columnNamed(page, "To do").getByText("Ship the test suite"), columnNamed(page, "Done"));
  await moved;

  await page.reload();
  await expect(columnNamed(page, "Done").getByText("Ship the test suite")).toBeVisible();
  await expect(columnNamed(page, "To do").getByText("Ship the test suite")).toHaveCount(0);
});

test("renaming a column persists", async ({ page }) => {
  await createBoard(page, `E2E rename ${Date.now()}`);
  await addColumn(page, "Backlog");

  const saved = page.waitForResponse(
    (response) => response.request().method() === "PUT" && response.url().includes("/api/v1/columns/")
  );
  await columnNamed(page, "Backlog").locator('input[value="Backlog"]').click();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.type("Icebox");
  await page.keyboard.press("Tab");
  await saved;

  await page.reload();
  await expect(columnNamed(page, "Icebox")).toBeVisible();
});
