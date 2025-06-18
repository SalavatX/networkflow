import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { BlockedProvider } from './contexts/BlockedContext';
import ApprovedRoute from './components/auth/ApprovedRoute';
import AdminRoute from './components/auth/AdminRoute';
import BlockedRoute from './components/auth/BlockedRoute';
import Navbar from './components/layout/Navbar';
import { Suspense, lazy } from 'react';

// Лениво загружаемые компоненты
const Login = lazy(() => import('./components/auth/Login'));
const Register = lazy(() => import('./components/auth/Register'));
const ForgotPassword = lazy(() => import('./components/auth/ForgotPassword'));
const ChangePassword = lazy(() => import('./components/auth/ChangePassword'));
const PostFeed = lazy(() => import('./components/posts/PostFeed'));
const Profile = lazy(() => import('./components/profile/Profile'));
const Messages = lazy(() => import('./components/messages/Messages'));
const Notifications = lazy(() => import('./components/notifications/Notifications'));
const AdminDashboard = lazy(() => import('./components/admin/AdminDashboard'));
const AdminUsers = lazy(() => import('./components/admin/AdminUsers'));
const AdminPendingApprovals = lazy(() => import('./components/admin/AdminPendingApprovals'));
const AdminStats = lazy(() => import('./components/admin/AdminStats'));
const EmailTest = lazy(() => import('./components/admin/EmailTest'));
const TagSearch = lazy(() => import('./components/search/TagSearch'));
const UserSearch = lazy(() => import('./components/search/UserSearch'));
const FilteredPosts = lazy(() => import('./components/posts/FilteredPosts'));
const PostItem = lazy(() => import('./components/posts/PostItem'));

function App() {
  return (
    <AuthProvider>
      <BlockedProvider>
        <Router>
          <div className="animated-gradient-bg"></div>
          <div className="min-h-screen">
            
            <Routes>
              <Route path="/login" element={null} />
              <Route path="/register" element={null} />
              <Route path="/forgot-password" element={null} />
              <Route path="*" element={<Navbar />} />
            </Routes>

            <main className="content-container">
              <Suspense fallback={<div className="text-center py-10">Загрузка...</div>}>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />

                  <Route element={<BlockedRoute />}>
                    <Route element={<ApprovedRoute />}>
                      <Route path="/" element={<PostFeed />} />
                      <Route path="/profile/:userId" element={<Profile />} />
                      <Route path="/post/:id" element={<PostItem />} />
                      <Route path="/messages" element={<Messages />} />
                      <Route path="/notifications" element={<Notifications />} />
                      <Route path="/explore" element={<FilteredPosts />} />
                      <Route path="/search/tags" element={<TagSearch />} />
                      <Route path="/search/users" element={<UserSearch />} />
                      <Route path="/change-password" element={<ChangePassword />} />
                    </Route>

                    <Route element={<AdminRoute />}>
                      <Route path="/admin" element={<AdminDashboard />} />
                      <Route path="/admin/users" element={<AdminUsers />} />
                      <Route path="/admin/pending" element={<AdminPendingApprovals />} />
                      <Route path="/admin/stats" element={<AdminStats />} />
                      <Route path="/admin/email-test" element={<EmailTest />} />
                      <Route path="/admin/dashboard" element={<AdminDashboard />} />
                    </Route>
                  </Route>

                  <Route path="*" element={<Navigate to="/" />} />
                </Routes>
              </Suspense>
            </main>
          </div>
        </Router>
      </BlockedProvider>
    </AuthProvider>
  );
}

export default App;
