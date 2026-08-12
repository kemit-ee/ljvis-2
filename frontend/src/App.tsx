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
import { LogDetailPage } from './features/audit-logs/pages/LogDetailPage/LogDetailPage';
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
import { CgrFormCreatePage } from './features/erru/pages/cgr/CgrFormCreatePage';
import { CgrFormPage } from './features/erru/pages/cgr/CgrFormPage';
import { TechnicalCheckFormPage } from './features/control-forms/pages/technical-check-form/TechnicalCheckFormPage';
import { TransportInterruptionFormPage } from './features/control-forms/pages/transport-interruption-form/TransportInterruptionFormPage';
import { AdrFormPage } from './features/control-forms/pages/adr-form/AdrFormPage';
import { GoodReputeFormCreatePage } from './features/control-forms/pages/good-repute-form/GoodReputeFormCreatePage';
import { GoodReputeFormPage } from './features/control-forms/pages/good-repute-form/GoodReputeFormPage';
import { DriveRestFormPage } from './features/control-forms/pages/drive-rest-form/DriveRestFormPage';
import { FormSearchPage } from './features/control-forms/pages/search/FormSearchPage';
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

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Routes>
        <Route element={<AppLayout />}>
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
          {/* ERRU — CGR (mainepäring). Vorm stage only (LJVIS2-138) — list (-140,
              bare "/erru/cgr") lands in a later stage, so "new"/":id" are reachable
              only via direct URL / copyFrom for now. */}
          <Route path="/erru/cgr/new" element={<CgrFormCreatePage />} />
          <Route path="/erru/cgr/:id" element={<CgrFormPage />} />
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
