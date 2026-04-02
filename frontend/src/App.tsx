import { Suspense } from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import { AppLayout } from './layout/AppLayout';
import { UserListPage } from './features/users/UserListPage';
import { UserDetailPage } from './features/users/UserDetailPage';
import { UserGroupListPage } from './features/user-groups/UserGroupListPage';
import { UserGroupDetailPage } from './features/user-groups/UserGroupDetailPage';

function App() {
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

export default App;
