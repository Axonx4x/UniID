import { test, expect } from "@playwright/test";

test.describe("UniID Digital Student ID — Landing Page E2E", () => {
  test("renders the public landing page with hero and key sections", async ({
    page,
  }) => {
    await page.goto("/");

    // Verify page title
    await expect(page).toHaveTitle(/AstraMind Digital Student ID/i);

    // Verify Main Heading (h1)
    const heading = page.locator("h1");
    await expect(heading).toContainText(/Your Student Identity/i);

    // Verify features section exists
    const featuresSection = page.locator("#features");
    await expect(featuresSection).toBeVisible();
    await expect(featuresSection).toContainText(/Secure/i);

    // Verify How It Works section exists
    const howItWorks = page.locator("#how-it-works");
    await expect(howItWorks).toBeVisible();
    await expect(howItWorks).toContainText(/How It Works/i);

    // Verify How It Works steps are present
    await expect(page.getByRole("heading", { name: "University Enrollment" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Credential Issuance" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Access & Verify" })).toBeVisible();

    // Verify Why Universities section exists
    const aboutSection = page.locator("#about");
    await expect(aboutSection).toBeVisible();
    await expect(aboutSection).toContainText(/Why Universities Choose UniID/i);

    // Verify the university directory section exists.
    const universitiesSection = page.locator("#universities");
    await expect(universitiesSection).toBeVisible();
    await expect(universitiesSection).toContainText(/University directory/i);
    await expect(universitiesSection).toContainText(/University of Livingstonia/i);

    // Verify header navigation tabs only brief the user
    const nav = page.locator(".desktop-nav");
    await expect(nav.getByRole("link", { name: "About" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Features" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "How It Works" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Universities" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Support" })).toBeVisible();

    // Verify internal dashboard and demo buttons are NOT present in landing navbar
    await expect(page.locator("header").getByRole("link", { name: /Student Onboarding/i })).toHaveCount(0);
    await expect(page.locator("header").getByRole("link", { name: /Verify ID/i })).toHaveCount(0);

    // Verify Sign In and Get Started CTAs
    await expect(page.locator("header").getByRole("link", { name: "Sign In" })).toBeVisible();
    await expect(page.locator("header").getByRole("link", { name: "Get Started" })).toBeVisible();

    // Verify 'Secure • Verified • University Managed' badge is removed
    await expect(page.locator("text=Secure • Verified • University Managed")).toHaveCount(0);
  });
});
