import { expect, test as setup } from "@playwright/test";

import { seedActiveUser } from "../support/database";
import { AUTH_STATE_PATH, E2E_USER } from "../support/environment";

setup("log in through the real login form", async ({ page }) => {
  await seedActiveUser(E2E_USER);

  await page.goto("/login");
  await page.getByLabel("Enter Email...").fill(E2E_USER.email);
  await page.getByLabel("Enter Password...").fill(E2E_USER.password);
  await page.getByRole("button", { name: "Login" }).click();

  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
  await expect(page.getByText("Create a new board")).toBeVisible();

  await page.context().storageState({ path: AUTH_STATE_PATH });
});
