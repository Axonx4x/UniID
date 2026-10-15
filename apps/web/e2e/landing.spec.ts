import { test, expect } from "@playwright/test";

test.describe("AstraMind Digital Student ID - Phase 1 Foundation E2E", () => {
  test("renders the public landing screen with demo indicator and architecture tenets", async ({
    page,
  }) => {
    await page.goto("/");

    // Verify title
    await expect(page).toHaveTitle(/AstraMind Digital Student ID/i);

    // Verify Simulation Mode Banner
    const simulationBanner = page.locator('aside[aria-label="Simulation Mode Notice"]');
    await expect(simulationBanner).toBeVisible();
    await expect(simulationBanner).toContainText(/SIMULATION MODE/i);

    // Verify Main Heading
    const heading = page.locator("h1");
    await expect(heading).toContainText(/Unified Digital Student ID/i);

    // Verify Diagnostics Section exists
    const diagnosticsSection = page.locator("#diagnostics");
    await expect(diagnosticsSection).toBeVisible();
    await expect(diagnosticsSection).toContainText(/System Readiness/i);

    // Verify Architecture Tenets exist
    await expect(page.getByRole("heading", { name: "Institution-Scoped Tenants" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Payment Separation" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Registry as Authority" })).toBeVisible();
  });
});
