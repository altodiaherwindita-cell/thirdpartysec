import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { authService } from './services/api';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

// Lazy load pages for code splitting
const VendorAssessment = React.lazy(() => import('./pages/VendorAssessment'));
const VendorDetail = React.lazy(() => import('./pages/VendorDetail'));
const VendorForm = React.lazy(() => import('./pages/VendorForm'));

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = authService.isAuthenticated();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/assessment/:token" element={<VendorAssessment />} />
          
          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/vendors"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/vendors/new"
            element={
              <ProtectedRoute>
                <VendorForm />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/vendors/:id"
            element={
              <ProtectedRoute>
                <VendorDetail />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/vendors/:id/edit"
            element={
              <ProtectedRoute>
                <VendorForm />
              </ProtectedRoute>
            }
          />
          
          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          {/* 404 */}
          <Route path="*" element={<div className="p-8 text-center">Page not found</div>} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
