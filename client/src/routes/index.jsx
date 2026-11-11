import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import ProtectedRoute from '../components/ProtectedRoute.jsx';
import { RouteFallback } from '../components/Skeleton.jsx';

const Landing = lazy(() => import('../pages/Landing.jsx'));
const Login = lazy(() => import('../pages/Login.jsx'));
const Register = lazy(() => import('../pages/Register.jsx'));
const ForgotPassword = lazy(() => import('../pages/ForgotPassword.jsx'));
const ResetPassword = lazy(() => import('../pages/ResetPassword.jsx'));
const Dashboard = lazy(() => import('../pages/Dashboard.jsx'));
const Projects = lazy(() => import('../pages/Projects.jsx'));
const ProjectDetail = lazy(() => import('../pages/ProjectDetail.jsx'));
const Endpoints = lazy(() => import('../pages/Endpoints.jsx'));
const Keys = lazy(() => import('../pages/Keys.jsx'));
const Logs = lazy(() => import('../pages/Logs.jsx'));
const Webhooks = lazy(() => import('../pages/Webhooks.jsx'));
const Docs = lazy(() => import('../pages/Docs.jsx'));
const Analytics = lazy(() => import('../pages/Analytics.jsx'));
const Profile = lazy(() => import('../pages/Profile.jsx'));
const AdminOverview = lazy(() => import('../pages/AdminOverview.jsx'));
const AdminUsers = lazy(() => import('../pages/AdminUsers.jsx'));
const AdminProjects = lazy(() => import('../pages/AdminProjects.jsx'));
const AdminRequests = lazy(() => import('../pages/AdminRequests.jsx'));
const AdminHealth = lazy(() => import('../pages/AdminHealth.jsx'));
const AdminSettings = lazy(() => import('../pages/AdminSettings.jsx'));
const Contact = lazy(() => import('../pages/Contact.jsx'));
const Status = lazy(() => import('../pages/Status.jsx'));
const Demo = lazy(() => import('../pages/Demo.jsx'));
const NotFound = lazy(() => import('../pages/NotFound.jsx'));

const guard = (el, roles) => <ProtectedRoute roles={roles}>{el}</ProtectedRoute>;
const adminGuard = (el) => guard(el, ['admin']);

export default function AppRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
    <Routes>
      {/* Public */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/status" element={<Status />} />
      <Route path="/demo" element={<Demo />} />

      {/* App shell */}
      <Route element={<Layout />}>
        <Route path="/dashboard" element={guard(<Dashboard />)} />
        <Route path="/projects" element={guard(<Projects />)} />
        <Route path="/projects/:id" element={guard(<ProjectDetail />)} />
        <Route path="/endpoints" element={guard(<Endpoints />)} />
        <Route path="/keys" element={guard(<Keys />)} />
        <Route path="/logs" element={guard(<Logs />)} />
        <Route path="/webhooks" element={guard(<Webhooks />)} />
        <Route path="/docs" element={guard(<Docs />)} />
        <Route path="/analytics" element={guard(<Analytics />)} />
        <Route path="/profile" element={guard(<Profile />)} />

        {/* Admin */}
        <Route path="/admin" element={adminGuard(<AdminOverview />)} />
        <Route path="/admin/users" element={adminGuard(<AdminUsers />)} />
        <Route path="/admin/projects" element={adminGuard(<AdminProjects />)} />
        <Route path="/admin/requests" element={adminGuard(<AdminRequests />)} />
        <Route path="/admin/health" element={adminGuard(<AdminHealth />)} />
        <Route path="/admin/settings" element={adminGuard(<AdminSettings />)} />
      </Route>

      <Route path="/404" element={<NotFound />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
    </Suspense>
  );
}
