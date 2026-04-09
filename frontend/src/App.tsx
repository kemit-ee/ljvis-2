import { Suspense } from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import { AppLayout } from './layout/AppLayout';
import { UserListPage } from './features/users/UserListPage';
import { UserDetailPage } from './features/users/UserDetailPage';
import { UserGroupListPage } from './features/user-groups/UserGroupListPage';
import { UserGroupDetailPage } from './features/user-groups/UserGroupDetailPage';
import { LoginPage } from './features/auth/LoginPage';
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
          <Route path="/" element={<Navigate to="/users" replace />} />
          <Route path="/users" element={<UserListPage />} />
          <Route path="/users/:id" element={<UserDetailPage />} />
          <Route path="/user-groups" element={<UserGroupListPage />} />
          <Route path="/user-groups/:id" element={<UserGroupDetailPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
