import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { LandingPage } from "@/pages/LandingPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { LoginPage } from "@/pages/LoginPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { RegistryPage } from "@/pages/RegistryPage";
import { StudentCredentialPage } from "@/pages/StudentCredentialPage";
import { VerificationPage } from "@/pages/VerificationPage";
import { OnboardingPage } from "@/pages/OnboardingPage";
import { PendingStudentPage } from "@/pages/PendingStudentPage";
import { AuthProvider } from "@/auth/AuthContext";
import { ProtectedRoute } from "@/auth/ProtectedRoute";
import { DemoBanner } from "@/components/layout/DemoBanner";

import { StaffLayout } from "@/pages/staff/StaffLayout";
import { StaffOverviewPage } from "@/pages/staff/StaffOverviewPage";
import { StaffReviewsPage } from "@/pages/staff/StaffReviewsPage";
import { StaffReviewDetailPage } from "@/pages/staff/StaffReviewDetailPage";
import { StaffApplicationsPage } from "@/pages/staff/StaffApplicationsPage";
import { StaffRequestsPage } from "@/pages/staff/StaffRequestsPage";
import { StaffReportsPage } from "@/pages/staff/StaffReportsPage";
import { StaffNotificationsPage } from "@/pages/staff/StaffNotificationsPage";
import { StaffSettingsPage } from "@/pages/staff/StaffSettingsPage";
import { StaffRecordDetailPage } from "@/pages/staff/StaffRecordDetailPage";
import { StaffRecordsPage } from "@/pages/staff/StaffRecordsPage";
import { StaffRecordWizardPage } from "@/pages/staff/StaffRecordWizardPage";
import { StaffImportsPage } from "@/pages/staff/StaffImportsPage";
import { StaffImportWizardPage } from "@/pages/staff/StaffImportWizardPage";
import { StaffAuditPage } from "@/pages/staff/StaffAuditPage";

import { StudentLayout } from "@/pages/student/StudentLayout";
import { StudentOverviewPage } from "@/pages/student/StudentOverviewPage";
import { StudentDigitalIdPage } from "@/pages/student/StudentDigitalIdPage";
import { StudentQrPresentationPage } from "@/pages/student/StudentQrPresentationPage";
import { StudentProfilePage } from "@/pages/student/StudentProfilePage";
import { StudentInstitutionPage } from "@/pages/student/StudentInstitutionPage";
import { StudentVerificationPage } from "@/pages/student/StudentVerificationPage";
import { StudentCredentialsPage } from "@/pages/student/StudentCredentialsPage";
import { StudentRequestsPage } from "@/pages/student/StudentRequestsPage";
import { StudentNotificationsPage } from "@/pages/student/StudentNotificationsPage";
import { StudentActivityPage } from "@/pages/student/StudentActivityPage";
import { StudentSecurityPage } from "@/pages/student/StudentSecurityPage";
import { StudentPrivacyPage } from "@/pages/student/StudentPrivacyPage";
import { StudentSettingsPage } from "@/pages/student/StudentSettingsPage";
import { StudentSupportPage } from "@/pages/student/StudentSupportPage";

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <DemoBanner />
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<LandingPage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="onboarding" element={<OnboardingPage />} />
            <Route path="pending" element={<PendingStudentPage />} />
            <Route path="pending/:reference" element={<PendingStudentPage />} />
            <Route path="verify" element={<VerificationPage />} />
            <Route path="verify/:reference" element={<VerificationPage />} />
            <Route path="app" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="app/registry" element={<ProtectedRoute><RegistryPage /></ProtectedRoute>} />
            <Route path="app/credential" element={<ProtectedRoute><StudentCredentialPage /></ProtectedRoute>} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>

          {/* Institutional Reviewer Console Routes */}
          <Route path="staff" element={<ProtectedRoute><StaffLayout /></ProtectedRoute>}>
            <Route index element={<StaffOverviewPage />} />
            {/* Tab 2: Student Verification */}
            <Route path="verification" element={<StaffReviewsPage />} />
            <Route path="verification/:reviewId" element={<StaffReviewDetailPage />} />
            <Route path="reviews" element={<StaffReviewsPage />} />
            <Route path="reviews/:reviewId" element={<StaffReviewDetailPage />} />
            {/* Tab 3: Applications */}
            <Route path="applications" element={<StaffApplicationsPage />} />
            <Route path="records" element={<StaffRecordsPage />} />
            <Route path="records/new" element={<StaffRecordWizardPage />} />
            <Route path="records/:recordId" element={<StaffRecordDetailPage />} />
            {/* Tab 4: Requests */}
            <Route path="requests" element={<StaffRequestsPage />} />
            {/* Tab 5: Reports & Audit */}
            <Route path="reports" element={<StaffReportsPage />} />
            <Route path="audit" element={<StaffAuditPage />} />
            <Route path="imports" element={<StaffImportsPage />} />
            <Route path="imports/wizard" element={<StaffImportWizardPage />} />
            <Route path="imports/:importId" element={<StaffImportWizardPage />} />
            {/* Tab 6: Notifications */}
            <Route path="notifications" element={<StaffNotificationsPage />} />
            {/* Tab 7: Settings */}
            <Route path="settings" element={<StaffSettingsPage />} />
          </Route>

          {/* Student Digital Identity Portal Routes */}
          <Route path="student" element={<ProtectedRoute><StudentLayout /></ProtectedRoute>}>
            <Route index element={<StudentOverviewPage />} />
            <Route path="id" element={<StudentDigitalIdPage />} />
            <Route path="id/verify" element={<StudentQrPresentationPage />} />
            <Route path="profile" element={<StudentProfilePage />} />
            <Route path="institution" element={<StudentInstitutionPage />} />
            <Route path="verification" element={<StudentVerificationPage />} />
            <Route path="credentials" element={<StudentCredentialsPage />} />
            <Route path="requests" element={<StudentRequestsPage />} />
            <Route path="requests/:requestId" element={<StudentRequestsPage />} />
            <Route path="notifications" element={<StudentNotificationsPage />} />
            <Route path="activity" element={<StudentActivityPage />} />
            <Route path="security" element={<StudentSecurityPage />} />
            <Route path="privacy" element={<StudentPrivacyPage />} />
            <Route path="settings" element={<StudentSettingsPage />} />
            <Route path="support" element={<StudentSupportPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
