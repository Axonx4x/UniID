import { test, expect } from "@playwright/test";

test.describe("UniID Enterprise Onboarding Flow & Portal Views", () => {
  test("Combined Step 1: Select Institution & Create Account", async ({ page }) => {
    await page.goto("/onboarding");
    await expect(page.locator("h2:has-text('Welcome to UniID')")).toBeVisible();
    await expect(page.locator("h1:has-text('Create your student account')")).toBeVisible();
    await expect(page.locator("text=Select your university and configure your institutional credentials.")).toBeVisible();

    // Verify professional custom dropdown trigger
    const dropdownTrigger = page.locator(".uni-custom-select-trigger");
    await expect(dropdownTrigger).toBeVisible();

    // Open dropdown menu
    await dropdownTrigger.click();
    await expect(page.locator(".uni-custom-select-menu")).toBeVisible();

    // Verify every university listed in the directory is available for selection.
    await expect(page.locator(".uni-custom-select-item:has-text('University of Malawi')")).toBeVisible();
    await expect(page.locator(".uni-custom-select-item:has-text('LUANAR')")).toBeVisible();
    await expect(page.locator(".uni-custom-select-item:has-text('MUBAS')")).toBeVisible();
    await expect(page.locator(".uni-custom-select-item:has-text('KUHeS')")).toBeVisible();
    await expect(page.locator(".uni-custom-select-item:has-text('MUST')")).toBeVisible();
    await expect(page.locator(".uni-custom-select-item:has-text('MZUNI')")).toBeVisible();
    await expect(page.locator(".uni-custom-select-item:has-text('University of Livingstonia')")).toBeVisible();
    await expect(page.locator(".uni-custom-select-item:has-text('MZUNI') img[src='/assets/logos/mzuni.jpg']")).toBeVisible();
    await expect(page.locator(".uni-custom-select-item:has-text('University of Livingstonia') img[src='/assets/logos/unilia.jpg']")).toBeVisible();

    // Select University of Malawi
    await page.locator(".uni-custom-select-item:has-text('University of Malawi')").click();
    await expect(dropdownTrigger).toContainText("University of Malawi");

    // Verify account fields and REQUIRED registration number
    await expect(page.locator("input[placeholder='e.g. Chisomo Banda']")).toBeVisible();
    await expect(page.locator("label:has-text('Registration Number')")).toBeVisible();
    const regInput = page.locator("input[placeholder='e.g. MU123456']");
    await expect(regInput).toBeVisible();
    await expect(regInput).toHaveAttribute("required", "");
    await expect(page.locator("input[type='email']")).toBeVisible();
    await expect(page.locator("button[type='submit']:has-text('Create Account & Continue')")).toBeVisible();
  });

  test("recognizes a domain and matching password briefly, then reports an unreachable onboarding service", async ({ page }) => {
    await page.route("**/api/v1/onboarding/register", async (route) => {
      await route.abort("failed");
    });
    await page.goto("/onboarding");

    await page.locator(".uni-custom-select-trigger").click();
    await page.locator(".uni-custom-select-item:has-text('University of Livingstonia')").click();

    const email = page.locator("input[type='email']");
    await email.fill("student@unilia.ac.mw");
    await expect(page.getByText("UNILIA institutional domain recognized")).toBeVisible();
    await page.waitForTimeout(3100);
    await expect(page.getByText("UNILIA institutional domain recognized")).toBeHidden();

    await page.locator("input[placeholder='Min 8 characters']").fill("ValidPassword!2026");
    await page.locator("input[placeholder='Re-enter password']").fill("ValidPassword!2026");
    await expect(page.getByText("Passwords match")).toBeVisible();
    await page.waitForTimeout(3100);
    await expect(page.getByText("Passwords match")).toBeHidden();

    await page.locator("input[placeholder='e.g. Chisomo Banda']").fill("Demo Student");
    await page.locator("input[placeholder='e.g. MU123456']").fill("cen-01-41-23");
    await page.locator("#terms-check").check();
    await page.getByRole("button", { name: "Create Account & Continue" }).click();
    await expect(page.getByText("We couldn't reach the onboarding service. Start the API, then try again.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Verify your email address" })).toBeHidden();
  });

  test("Step 2: Email OTP Verification", async ({ page }) => {
    await page.goto("/onboarding?screen=3");
    await expect(page.locator("h1:has-text('Verify your email address')")).toBeVisible();
    const boxes = page.locator(".uni-otp-box");
    await expect(boxes).toHaveCount(6);
    await expect(page.locator(".uni-otp-form button[type='submit']")).toBeVisible();
  });

  test("Step 3: Choose Verification Method", async ({ page }) => {
    await page.goto("/onboarding?screen=4");
    await expect(page.locator("h1:has-text('Verify your student status')")).toBeVisible();
    await expect(page.locator(".uni-method-name:has-text('Check via university system (API)')")).toBeVisible();
    await expect(page.locator(".uni-method-name:has-text('Email + record file (staff review)')")).toBeVisible();
    await expect(page.locator(".uni-recommended-badge")).toBeVisible();
  });

  test("Step 4: API Verification (in progress)", async ({ page }) => {
    await page.goto("/onboarding?screen=5");
    await expect(page.locator("h1:has-text('Verifying your student record')")).toBeVisible();
    await expect(page.locator(".uni-check-label:has-text('Checking student record')")).toBeVisible();
    await expect(page.locator(".uni-check-label:has-text('Validating enrollment status')")).toBeVisible();
  });

  test("Step 5: API Verification Success", async ({ page }) => {
    await page.goto("/onboarding?screen=6");
    await expect(page.locator("h1:has-text('Student record verified')")).toBeVisible();
    await expect(page.locator(".uni-detail-value:has-text('MU123456')")).toBeVisible();
    await expect(page.locator(".uni-detail-value:has-text('BSc Computer Science')")).toBeVisible();
    await expect(page.locator(".uni-active-status-badge:has-text('Active')")).toBeVisible();
  });

  test("Step 6: Email + Record File Pending Review", async ({ page }) => {
    await page.goto("/onboarding?screen=7");
    await expect(page.locator("h1:has-text('Verification in progress')")).toBeVisible();
    await expect(page.locator(".uni-pending-review-badge:has-text('Pending Review')")).toBeVisible();
    await expect(page.locator(".uni-detail-value:has-text('VR-2025-00123')")).toBeVisible();
  });

  test("Step 7: Verification Rejected View", async ({ page }) => {
    await page.goto("/onboarding?screen=11");
    await expect(page.locator("h1:has-text('Verification rejected')")).toBeVisible();
    await expect(page.locator(".uni-reason-title:has-text('Reason')")).toBeVisible();
    await expect(page.locator("text=The provided student record could not be matched")).toBeVisible();
    await expect(page.locator("a:has-text('Contact Support')")).toBeVisible();
    await expect(page.locator("button:has-text('Try again')")).toBeVisible();
  });

  test("Restricted Dashboard (Pending State)", async ({ page }) => {
    await page.goto("/pending");
    await expect(page.locator("h2:has-text('Your student verification is pending')")).toBeVisible();
    await expect(page.locator("h3:has-text('What happens next?')")).toBeVisible();
    await expect(page.locator(".uni-user-name:has-text('John Doe')")).toBeVisible();
  });

  test("Staff Review Queue", async ({ page }) => {
    await page.route("**/api/v1/auth/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "u-staff-1",
          email: "staff@must.ac.mw",
          full_name: "Registry Staff",
          role: "registry_staff",
          institution_id: "inst-must",
        }),
      });
    });

    await page.goto("/app/registry");
    await expect(page.locator("h1:has-text('Verification Queue')")).toBeVisible();
    await expect(page.locator("button.uni-queue-tab:has-text('Pending (18)')")).toBeVisible();
    await expect(page.locator("td:has-text('Amina Hassan')")).toBeVisible();
    await expect(page.locator("td:has-text('Brian Chirwa')")).toBeVisible();
  });

  test("Verified Student Portal", async ({ page }) => {
    await page.route("**/api/v1/auth/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "u-student-1",
          email: "john.doe@must.ac.mw",
          full_name: "John Doe",
          role: "student",
          institution_id: "inst-must",
        }),
      });
    });

    await page.goto("/app");
    await expect(page.locator("h2:has-text('Your student status is verified')")).toBeVisible();
    await expect(page.locator("a:has-text('View my digital ID')")).toBeVisible();
    await expect(page.locator("h3:has-text('Your information')")).toBeVisible();
    await expect(page.locator("text=Malawi University of Science and Technology")).toBeVisible();
  });

  test("Verification History Timeline View", async ({ page }) => {
    await page.goto("/pending?tab=timeline");
    await expect(page.locator("h2.uni-card-title:has-text('Verification History')")).toBeVisible();
    await expect(page.locator(".uni-timeline-event-name:has-text('Account created')")).toBeVisible();
    await expect(page.locator(".uni-timeline-event-name:has-text('Email verified')")).toBeVisible();
    await expect(page.locator(".uni-timeline-event-name:has-text('Student verification submitted')")).toBeVisible();
  });
});
