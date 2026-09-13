import { expect, test as setup } from "@playwright/test";

import { seedActiveUser } from "../support/database";
import { AUTH_STATE_PATH, E2E_USER, TURNSTILE_TOKEN_TIMEOUT_MS } from "../support/environment";

setup("log in through the real login form", async ({ page }) => {
  await seedActiveUser(E2E_USER);

  await page.goto("/login");
  await page.getByLabel("Enter Email...").fill(E2E_USER.email);
  await page.getByLabel("Enter Password...").fill(E2E_USER.password);

  const turnstileResponse = page.locator('input[name="cf-turnstile-response"]');
  await turnstileResponse.waitFor({ state: "attached", timeout: TURNSTILE_TOKEN_TIMEOUT_MS });
  await expect
    .poll(() => turnstileResponse.inputValue(), {
      timeout: TURNSTILE_TOKEN_TIMEOUT_MS,
      message: "Turnstile never issued a token, so the login form would never submit",
    })
    .not.toBe("");

  await page.getByRole("button", { name: "Login" }).click();

  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
  await expect(page.getByText("Create a new board")).toBeVisible();

  await page.context().storageState({ path: AUTH_STATE_PATH });
});
