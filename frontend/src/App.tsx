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
import { AuthProvider, useAuth } from './features/auth/AuthContext';

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DesktopPage />} />
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
        <AppRoutes />
        <ToastContainer />
      </AuthProvider>
    </ErrorProvider>
  );
}

export default App;
