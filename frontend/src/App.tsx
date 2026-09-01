import { Suspense } from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import { ErrorProvider } from './shared/errors/ErrorContext';
import { ToastContainer } from './shared/errors/ToastContainer';
import { AppLayout } from './layout/AppLayout';
import { DesktopPage } from './features/desktop/DesktopPage';
import { UserListPage } from './features/users/pages/UserListPage/UserListPage';
import { UserCreatePage } from './features/users/pages/UserCreatePage/UserCreatePage';
import { UserDetailPage } from './features/users/pages/UserDetailPage/UserDetailPage';
import { UserGroupListPage } from './features/user-groups/pages/UserGroupListPage/UserGroupListPage';
import { UserGroupCreatePage } from './features/user-groups/pages/UserGroupCreatePage/UserGroupCreatePage';
import { UserGroupAddUserPage } from './features/user-groups/pages/UserGroupAddUserPage/UserGroupAddUserPage';
import { UserGroupDetailPage } from './features/user-groups/pages/UserGroupDetailPage/UserGroupDetailPage';
import { ClassifierListPage } from './features/classifiers/pages/ClassifierListPage/ClassifierListPage';
import { ClassifierDetailPage } from './features/classifiers/pages/ClassifierDetailPage/ClassifierDetailPage';
import { ClassifierValueCreatePage } from './features/classifiers/pages/ClassifierValueCreatePage/ClassifierValueCreatePage';
import { ClassifierValueEditPage } from './features/classifiers/pages/ClassifierValueEditPage/ClassifierValueEditPage';
import { LogListPage } from './features/audit-logs/pages/LogListPage/LogListPage';
import { RiskScoresListPage } from './features/risk-scores/pages/RiskScoresListPage/RiskScoresListPage';
import { LogDetailPage } from './features/audit-logs/pages/LogDetailPage/LogDetailPage';
import { NotificationsPage } from './features/notifications/NotificationsPage';
import { LoginPage } from './features/auth/LoginPage/LoginPage';
import { AuthCallback } from './features/auth/AuthCallback';
import { ForeignViolationFormCreatePage } from './features/control-forms/pages/foreign-violation-form/ForeignViolationFormCreatePage';
import { ForeignViolationFormPage } from './features/control-forms/pages/foreign-violation-form/ForeignViolationFormPage';
import { CompoundFormCreatePage } from './features/control-forms/pages/compound-form/CompoundFormCreatePage';
import { CompoundFormPage } from './features/control-forms/pages/compound-form/CompoundFormPage';
import { LabourInspectionFormCreatePage } from './features/control-forms/pages/labour-inspection/LabourInspectionFormCreatePage';
import { LabourInspectionFormPage } from './features/control-forms/pages/labour-inspection/LabourInspectionFormPage';
import { CtudListPage } from './features/erru/pages/ctud/CtudListPage';
import { CtudFormCreatePage } from './features/erru/pages/ctud/CtudFormCreatePage';
import { CtudFormPage } from './features/erru/pages/ctud/CtudFormPage';
import { CgrListPage } from './features/erru/pages/cgr/CgrListPage';
import { CgrFormCreatePage } from './features/erru/pages/cgr/CgrFormCreatePage';
import { CgrFormPage } from './features/erru/pages/cgr/CgrFormPage';
import { RsiListPage } from './features/erru/pages/rsi/RsiListPage';
import { RsiFormCreatePage } from './features/erru/pages/rsi/RsiFormCreatePage';
import { RsiFormPage } from './features/erru/pages/rsi/RsiFormPage';
import { NcrListPage } from './features/erru/pages/ncr/NcrListPage';
import { NcrFormCreatePage } from './features/erru/pages/ncr/NcrFormCreatePage';
import { NcrFormPage } from './features/erru/pages/ncr/NcrFormPage';
import { TechnicalCheckFormPage } from './features/control-forms/pages/technical-check-form/TechnicalCheckFormPage';
import { TransportInterruptionFormPage } from './features/control-forms/pages/transport-interruption-form/TransportInterruptionFormPage';
import { AdrFormPage } from './features/control-forms/pages/adr-form/AdrFormPage';
import { GoodReputeFormCreatePage } from './features/control-forms/pages/good-repute-form/GoodReputeFormCreatePage';
import { GoodReputeFormPage } from './features/control-forms/pages/good-repute-form/GoodReputeFormPage';
import { DriveRestFormPage } from './features/control-forms/pages/drive-rest-form/DriveRestFormPage';
import { TRAMDriverFormPage } from './features/control-forms/pages/tram-driver-form/TRAMDriverFormPage';
import { FormSearchPage } from './features/control-forms/pages/search/FormSearchPage';
import { CompanyFormsListPage } from './features/citizen/pages/CompanyFormsListPage/CompanyFormsListPage';
import { CitizenDashboardPage } from './features/citizen/pages/CitizenDashboardPage/CitizenDashboardPage';
import { CitizenLabourInspectionDetailPage } from './features/citizen/pages/CitizenLabourInspectionDetailPage/CitizenLabourInspectionDetailPage';
import { CitizenCompoundDetailPage } from './features/citizen/pages/CitizenCompoundDetailPage/CitizenCompoundDetailPage';
import { CitizenForeignViolationDetailPage } from './features/citizen/pages/CitizenForeignViolationDetailPage/CitizenForeignViolationDetailPage';
import { CitizenGoodReputeDetailPage } from './features/citizen/pages/CitizenGoodReputeDetailPage/CitizenGoodReputeDetailPage';
import { AuthProvider, useAuth } from './features/auth/AuthContext';
import { ClassifierProvider } from './features/classifiers/ClassifierProvider';

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  // Handle OAuth callback before auth check — user is not yet authenticated
  if (window.location.pathname === '/auth/callback') {
    return <AuthCallback />;
  }

  if (!user) {
    return <LoginPage />;
  }

  // Citizen sessions (citizen-self / company) have no permissions and get
  // their own read-only dashboard instead of the officer desktop — officer
  // routes below are still guarded server-side too (POST/.guard's
  // check-user-authority), this is UX-only, not the security boundary.
  const isCitizen = user.activeRole !== 'officer';

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Routes>
        <Route element={<AppLayout />}>
          {isCitizen ? (
            <>
              <Route path="/" element={<CitizenDashboardPage />} />
              {/* Legacy single-company/activeRole-scoped view — kept as a
                  deep link for existing bookmarks; the landing page is now
                  CitizenDashboardPage. */}
              <Route
                path="/my-companies"
                element={<CompanyFormsListPage />}
              />
              <Route
                path="/my-companies/labour-inspection/:id"
                element={<CitizenLabourInspectionDetailPage />}
              />
              <Route
                path="/my-companies/compound/:id"
                element={<CitizenCompoundDetailPage />}
              />
              <Route
                path="/my-companies/foreign-violation/:id"
                element={<CitizenForeignViolationDetailPage />}
              />
              <Route
                path="/my-companies/good-repute/:id"
                element={<CitizenGoodReputeDetailPage />}
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          ) : (
            <>
              <Route path="/" element={<DesktopPage />} />
          <Route path="/search" element={<FormSearchPage />} />
          <Route path="/users" element={<UserListPage />} />
          <Route path="/users/new" element={<UserCreatePage />} />
          <Route path="/users/:id" element={<UserDetailPage />} />
          <Route path="/user-groups" element={<UserGroupListPage />} />
          <Route path="/user-groups/new" element={<UserGroupCreatePage />} />
          <Route
            path="/user-groups/:id/add-user"
            element={<UserGroupAddUserPage />}
          />
          <Route path="/user-groups/:id" element={<UserGroupDetailPage />} />
          <Route path="/classifiers" element={<ClassifierListPage />} />
          <Route path="/classifiers/:id" element={<ClassifierDetailPage />} />
          <Route
            path="/classifiers/:id/add-value"
            element={<ClassifierValueCreatePage />}
          />
          <Route
            path="/classifiers/:id/:valueId"
            element={<ClassifierValueEditPage />}
          />
          <Route path="/logs" element={<LogListPage />} />
          <Route path="/admin/risk-scores" element={<RiskScoresListPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/logs/:id" element={<LogDetailPage />} />
          <Route
            path="/control-forms/foreign-violation/new"
            element={<ForeignViolationFormCreatePage />}
          />
          <Route
            path="/control-forms/foreign-violation/:id"
            element={<ForeignViolationFormPage />}
          />
          <Route
            path="/control-forms/foreign-violation/:id/:snapshotId"
            element={<ForeignViolationFormPage />}
          />
          <Route
            path="/control-forms/compound/new"
            element={<CompoundFormCreatePage />}
          />
          <Route
            path="/control-forms/compound/:id"
            element={<CompoundFormPage />}
          />
          <Route
            path="/control-forms/compound/:id/:snapshotId"
            element={<CompoundFormPage />}
          />
          <Route
            path="/control-forms/sp-driver/:id"
            element={<DriveRestFormPage entryType="driver" />}
          />
          <Route
            path="/control-forms/sp-driver/:id/:snapshotId"
            element={<DriveRestFormPage entryType="driver" />}
          />
          <Route
            path="/control-forms/tram-driver/new"
            element={<TRAMDriverFormPage />}
          />
          <Route
            path="/control-forms/tram-driver/:id"
            element={<TRAMDriverFormPage />}
          />
          <Route
            path="/control-forms/tram-driver/:id/:snapshotId"
            element={<TRAMDriverFormPage />}
          />
          <Route
            path="/control-forms/sp-teammate/:id"
            element={<DriveRestFormPage entryType="teammate" />}
          />
          <Route
            path="/control-forms/sp-teammate/:id/:snapshotId"
            element={<DriveRestFormPage entryType="teammate" />}
          />
          <Route
            path="/control-forms/labour-inspection/new"
            element={<LabourInspectionFormCreatePage />}
          />
          <Route
            path="/control-forms/labour-inspection/:id"
            element={<LabourInspectionFormPage />}
          />
          <Route
            path="/control-forms/labour-inspection/:id/:snapshotId"
            element={<LabourInspectionFormPage />}
          />
          {/* ERRU — CTUD (tegevusloa kontroll) */}
          <Route path="/erru/ctud" element={<CtudListPage />} />
          <Route path="/erru/ctud/new" element={<CtudFormCreatePage />} />
          <Route path="/erru/ctud/:id" element={<CtudFormPage />} />
          {/* ERRU — CGR (mainepäring). List (LJVIS2-140) is OUTGOING requests only. */}
          <Route path="/erru/cgr" element={<CgrListPage />} />
          <Route path="/erru/cgr/new" element={<CgrFormCreatePage />} />
          <Route path="/erru/cgr/:id" element={<CgrFormPage />} />
          {/* ERRU — RSI (tehnokontrolli teade) — list (LJVIS2-149) + form (LJVIS2-147/-148). */}
          <Route path="/erru/rsi" element={<RsiListPage />} />
          <Route path="/erru/rsi/new" element={<RsiFormCreatePage />} />
          <Route path="/erru/rsi/:id" element={<RsiFormPage />} />
          {/* ERRU — NCR (kontrollitulemuse teade), LJVIS2-62/-63/-64/-65. */}
          <Route path="/erru/ncr" element={<NcrListPage />} />
          <Route path="/erru/ncr/new" element={<NcrFormCreatePage />} />
          <Route path="/erru/ncr/:businessCaseId" element={<NcrFormPage />} />
          <Route
            path="/control-forms/vehicle-technical/new/:compoundFormKey"
            element={<TechnicalCheckFormPage variant="vehicle" />}
          />
          <Route
            path="/control-forms/vehicle-technical/:id"
            element={<TechnicalCheckFormPage variant="vehicle" />}
          />
          <Route
            path="/control-forms/vehicle-technical/:id/:snapshotId"
            element={<TechnicalCheckFormPage variant="vehicle" />}
          />
          <Route
            path="/control-forms/trailer-technical/new/:compoundFormKey"
            element={<TechnicalCheckFormPage variant="trailer" />}
          />
          <Route
            path="/control-forms/trailer-technical/:id"
            element={<TechnicalCheckFormPage variant="trailer" />}
          />
          <Route
            path="/control-forms/trailer-technical/:id/:snapshotId"
            element={<TechnicalCheckFormPage variant="trailer" />}
          />
          <Route
            path="/control-forms/transport-interruption/new/:compoundFormKey"
            element={<TransportInterruptionFormPage />}
          />
          <Route
            path="/control-forms/transport-interruption/:id"
            element={<TransportInterruptionFormPage />}
          />
          <Route
            path="/control-forms/transport-interruption/:id/:snapshotId"
            element={<TransportInterruptionFormPage />}
          />
          <Route
            path="/control-forms/adr/new/:compoundFormKey"
            element={<AdrFormPage />}
          />
          <Route path="/control-forms/adr/:id" element={<AdrFormPage />} />
          <Route
            path="/control-forms/adr/:id/:snapshotId"
            element={<AdrFormPage />}
          />
          <Route
            path="/control-forms/good-repute/new"
            element={<GoodReputeFormCreatePage />}
          />
          <Route
            path="/control-forms/good-repute/:id"
            element={<GoodReputeFormPage />}
          />
          <Route
            path="/control-forms/good-repute/:id/:snapshotId"
            element={<GoodReputeFormPage />}
          />
              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          )}
        </Route>
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorProvider>
      <AuthProvider>
        <ClassifierProvider>
          <AppRoutes />
          <ToastContainer />
        </ClassifierProvider>
      </AuthProvider>
    </ErrorProvider>
  );
}

export default App;
