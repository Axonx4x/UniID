import { test } from "@playwright/test";
import path from "path";

test("capture hero and login screenshots", async ({ page }) => {
  // Set viewport to desktop 1440x900
  await page.setViewportSize({ width: 1440, height: 900 });

  // 1. Capture Hero Page
  await page.goto("/");
  await page.waitForTimeout(1000);
  await page.screenshot({
    path: path.resolve(process.cwd(), "../../docs/screenshots/hero_page.png"),
    fullPage: false,
  });

  // 2. Capture Login Page
  await page.goto("/login");
  await page.waitForTimeout(1000);
  await page.screenshot({
    path: path.resolve(process.cwd(), "../../docs/screenshots/login_page.png"),
    fullPage: false,
  });

  // 3. Capture Onboarding Page
  await page.goto("/onboarding");
  await page.waitForTimeout(1000);
  await page.screenshot({
    path: path.resolve(process.cwd(), "../../docs/screenshots/onboarding_page.png"),
    fullPage: false,
  });

  // 3b. Capture Onboarding Page with Custom Universities Dropdown Open
  await page.locator(".uni-custom-select-trigger").click();
  await page.waitForTimeout(400);
  await page.screenshot({
    path: path.resolve(process.cwd(), "../../docs/screenshots/onboarding_dropdown_open.png"),
    fullPage: false,
  });

  // 4. Capture Public Verification Page
  await page.goto("/verify");
  await page.waitForTimeout(1000);
  await page.screenshot({
    path: path.resolve(process.cwd(), "../../docs/screenshots/verification_page.png"),
    fullPage: false,
  });
});

