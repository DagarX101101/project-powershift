import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '../components/common/ProtectedRoute';
import AppLayout from '../layouts/AppLayout';
import Login from '../pages/Login';
import ForgotPassword from '../pages/ForgotPassword';
import Unauthorized from '../pages/Unauthorized';
import Dashboard from '../pages/Dashboard';
import MasterSheet from '../pages/MasterSheet';
import StrapData from '../pages/StrapData';
import Reports from '../pages/Reports';
import Profile from '../pages/Profile';
import Settings from '../pages/Settings';
import NotFound from '../pages/NotFound';
import RequestAccess from '../pages/RequestAccess';
import RequestAccessSuccess from '../pages/RequestAccessSuccess';
import AccessRequests from '../pages/admin/AccessRequests';
import Users from '../pages/admin/Users';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/request-access" element={<RequestAccess />} />
      <Route path="/access-request-success" element={<RequestAccessSuccess />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* Protected App Routes */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="master-sheet" element={<MasterSheet />} />
        <Route path="strap-data" element={<StrapData />} />
        <Route path="reports" element={<Reports />} />
        <Route path="profile" element={<Profile />} />
        <Route path="settings" element={<Settings />} />
        <Route path="admin/access-requests" element={<AccessRequests />} />
        <Route path="admin/users" element={<Users />} />
      </Route>

      {/* 404 Fallback */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;
