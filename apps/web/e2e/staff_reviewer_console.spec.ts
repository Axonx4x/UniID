import { test, expect } from "@playwright/test";

test.describe("UniID Institutional Reviewer Console E2E", () => {
  test("redirects unauthenticated user accessing /staff to /login", async ({ page }) => {
    // Intercept auth/me to return 401 unauthenticated
    await page.route("**/api/v1/auth/me", async (route) => {
      await route.fulfill({ status: 401, json: { detail: "Not authenticated" } });
    });

    await page.goto("/staff");
    await expect(page).toHaveURL(/\/login/);
  });

  test.describe("Authenticated Institutional Reviewer", () => {
    test.beforeEach(async ({ page }) => {
      // Mock authenticated reviewer session with structured membership and institution context
      await page.route("**/api/v1/auth/me", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: "c1f7a627-2c96-48c2-bb58-e4b7b3796d11",
            email: "reviewer@unima.ac.mw",
            full_name: "Dr. Chimwemwe Phiri",
            memberships: [
              {
                id: "c1f7a627-2c96-48c2-bb58-e4b7b3796d12",
                role: "registry_admin",
                status: "active",
                institution: {
                  id: "c1f7a627-2c96-48c2-bb58-e4b7b3796d13",
                  name: "University of Malawi",
                  slug: "unima",
                  institution_code: "UNIMA",
                  status: "active",
                },
              },
            ],
          }),
        });
      });
    });

    test("renders Operational Overview with live institution metrics and sidebar", async ({ page }) => {
      // Mock staff overview API
      await page.route("**/api/v1/staff/overview*", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            institution_id: "c1f7a627-2c96-48c2-bb58-e4b7b3796d13",
            institution_name: "University of Malawi",
            institution_code: "UNIMA",
            verification_mode: "roster_review",
            pending_reviews_count: 5,
            needs_attention_count: 2,
            completed_decisions_30d: 38,
            roster_freshness_status: "fresh",
            roster_freshness_days: 30,
            roster_last_imported_at: "2026-10-15T12:00:00Z",
            roster_active_version: "v2026-10-15",
            total_active_students: 4250,
            total_archived_students: 120,
            total_imports_count: 8,
          }),
        });
      });

      await page.goto("/staff");

      // Verify Institution Header and Role Badge
      await expect(page.locator("text=Institutional Reviewer Console")).toBeVisible();
      await expect(page.getByRole("heading", { name: "Operational Overview" })).toBeVisible();
      await expect(page.locator(".uni-staff-topbar").getByText("University of Malawi")).toBeVisible();
      await expect(page.locator("text=Roster Fresh")).toBeVisible();

      // Verify KPI Metrics Cards
      await expect(page.locator("text=Verification Queue").first()).toBeVisible();
      await expect(page.locator("text=5").first()).toBeVisible();
      await expect(page.locator("text=Needs Attention").first()).toBeVisible();
      await expect(page.locator("text=Institutional Registry").first()).toBeVisible();
      await expect(page.getByText("4250", { exact: true })).toBeVisible();

      // Verify Sidebar Navigation Links
      const sidebar = page.locator(".uni-staff-sidebar");
      await expect(sidebar.getByRole("link", { name: "Operational Overview" })).toBeVisible();
      await expect(sidebar.getByRole("link", { name: "Verification Queue" })).toBeVisible();
      await expect(sidebar.getByRole("link", { name: "Student Registry" })).toBeVisible();
      await expect(sidebar.getByRole("link", { name: "Roster Imports" })).toBeVisible();
      await expect(sidebar.getByRole("link", { name: "Audit History" })).toBeVisible();
    });

    test("supports Student Registry search, filtering, and Add Record modal", async ({ page }) => {
      // Mock staff overview for layout
      await page.route("**/api/v1/staff/overview*", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            institution_id: "c1f7a627-2c96-48c2-bb58-e4b7b3796d13",
            institution_name: "University of Malawi",
            pending_reviews_count: 5,
            follow_up_needed_count: 2,
            active_students_count: 4250,
            archived_students_count: 120,
            decisions_completed_30d: 38,
            roster_freshness_status: "fresh",
          }),
        });
      });

      // Mock staff records list
      await page.route("**/api/v1/staff/records*", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            items: [
              {
                id: "rec-001",
                student_number: "BSC-COM-01-2024",
                full_name: "Chisomo Banda",
                institutional_email: "cbanda@unima.ac.mw",
                campus_name: "Chichiri Campus",
                programme_name: "BSc Computer Science",
                enrollment_status: "active",
                record_status: "active",
                source: "roster_import",
                updated_at: "2026-10-15T12:00:00Z",
              },
            ],
            total: 1,
            page: 1,
            page_size: 20,
            total_pages: 1,
          }),
        });
      });

      // Mock campuses and programmes
      await page.route("**/api/v1/institutions/*/campuses*", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([{ id: "camp-001", name: "Chichiri Campus", code: "CHI" }]),
        });
      });
      await page.route("**/api/v1/institutions/*/programmes*", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([{ id: "prog-001", name: "BSc Computer Science", code: "BSC-CS" }]),
        });
      });

      await page.goto("/staff/records");

      await expect(page.getByRole("heading", { name: "Institutional Student Registry" })).toBeVisible();
      await expect(page.locator("text=BSC-COM-01-2024")).toBeVisible();
      await expect(page.locator("text=Chisomo Banda")).toBeVisible();
      await expect(page.locator("text=cbanda@unima.ac.mw")).toBeVisible();

      // Click Add Student Record to open modal
      await page.getByRole("button", { name: "Add Student Record" }).click();
      await expect(page.locator("h3:has-text('Create Institutional Student Record')")).toBeVisible();
      await expect(page.locator("label:has-text('Registration Number *')")).toBeVisible();
      await expect(page.locator("label:has-text('Full Legal Name *')")).toBeVisible();
      await expect(page.locator("label:has-text('Institutional Email Address *')")).toBeVisible();

      // Close modal
      await page.getByRole("button", { name: "Cancel" }).click();
      await expect(page.locator("h3:has-text('Create Institutional Student Record')")).toHaveCount(0);
    });

    test("renders Verification Queue with status filters", async ({ page }) => {
      // Mock overview for layout
      await page.route("**/api/v1/staff/overview*", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            institution_id: "c1f7a627-2c96-48c2-bb58-e4b7b3796d13",
            institution_name: "University of Malawi",
            pending_reviews_count: 5,
            follow_up_needed_count: 2,
            active_students_count: 4250,
            archived_students_count: 120,
            decisions_completed_30d: 38,
            roster_freshness_status: "fresh",
          }),
        });
      });

      await page.route("**/api/v1/staff/reviews*", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            items: [
              {
                id: "case-001",
                reference: "ONB-2026-UNIMA-001",
                full_name: "Chisomo Banda",
                student_number: "BSC-COM-01-2024",
                institutional_email: "cbanda@unima.ac.mw",
                verification_mode: "roster_review",
                submitted_at: "2026-10-16T10:00:00Z",
                status: "submitted",
              },
            ],
            total: 1,
            page: 1,
            page_size: 15,
            total_pages: 1,
          }),
        });
      });

      await page.goto("/staff/reviews");

      await expect(page.getByRole("heading", { name: "Student Verification Queue" })).toBeVisible();
      await expect(page.locator("text=ONB-2026-UNIMA-001")).toBeVisible();
      await expect(page.locator("text=Chisomo Banda")).toBeVisible();
      await expect(page.getByRole("link", { name: "Inspect Case" })).toBeVisible();
    });

    test("guides reviewer through the Roster Import Wizard", async ({ page }) => {
      // Mock overview for layout
      await page.route("**/api/v1/staff/overview*", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            institution_id: "c1f7a627-2c96-48c2-bb58-e4b7b3796d13",
            institution_name: "University of Malawi",
            pending_reviews_count: 5,
            follow_up_needed_count: 2,
            active_students_count: 4250,
            archived_students_count: 120,
            decisions_completed_30d: 38,
            roster_freshness_status: "fresh",
          }),
        });
      });

      // Mock templates
      await page.route("**/api/v1/staff/mapping-templates*", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([]),
        });
      });

      await page.goto("/staff/imports/wizard");

      // Verify Stepper items
      await expect(page.locator(".uni-wizard-stepper").getByText("Upload File")).toBeVisible();
      await expect(page.locator(".uni-wizard-stepper").getByText("Column Mapping")).toBeVisible();
      await expect(page.locator(".uni-wizard-stepper").getByText("Transformations")).toBeVisible();
      await expect(page.locator(".uni-wizard-stepper").getByText("Preview & Reconciliation")).toBeVisible();
      await expect(page.locator(".uni-wizard-stepper").getByText("Commit Results")).toBeVisible();

      // Verify file dropzone
      await expect(page.locator("text=Click to browse or drop CSV roster file here")).toBeVisible();
      await expect(page.locator("text=Supports CSV with UTF-8 / Latin-1 encoding")).toBeVisible();
    });

    test("displays Tamper-Evident Audit Trail with filter controls", async ({ page }) => {
      // Mock overview for layout
      await page.route("**/api/v1/staff/overview*", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            institution_id: "c1f7a627-2c96-48c2-bb58-e4b7b3796d13",
            institution_name: "University of Malawi",
            pending_reviews_count: 5,
            follow_up_needed_count: 2,
            active_students_count: 4250,
            archived_students_count: 120,
            decisions_completed_30d: 38,
            roster_freshness_status: "fresh",
          }),
        });
      });

      await page.route("**/api/v1/staff/audit*", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            items: [
              {
                id: "aud-001",
                action: "student_record_created",
                entity_type: "student",
                entity_id: "rec-001",
                actor_id: "rev-user-001",
                actor_name: "Dr. Chimwemwe Phiri",
                created_at: "2026-10-15T14:30:00Z",
                changes: {
                  student_number: "BSC-COM-01-2024",
                  full_name: "Chisomo Banda",
                },
              },
            ],
            total: 1,
            page: 1,
            page_size: 50,
            total_pages: 1,
          }),
        });
      });

      await page.goto("/staff/audit");

      await expect(page.getByRole("heading", { name: "Authorized Audit History" })).toBeVisible();
      await expect(page.locator("text=student_record_created")).toBeVisible();
      await expect(page.getByRole("table").getByText("Dr. Chimwemwe Phiri")).toBeVisible();
      await expect(page.locator("text=Immutable Ledger")).toBeVisible();
    });
  });
});
