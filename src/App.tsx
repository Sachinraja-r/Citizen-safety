import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LocationProvider } from './contexts/LocationContext';
import { IncidentProvider } from './contexts/IncidentContext';
import { AppLayout } from './components/layout/AppLayout';
import { LandingPage } from './pages/Landing/LandingPage';
import { LoginPage } from './pages/Login/LoginPage';
import { OnboardingPage } from './pages/Onboarding/OnboardingPage';
import { DashboardPage } from './pages/Dashboard/DashboardPage';
import { SOSActivationPage } from './pages/SOS/SOSActivationPage';
import { ActiveIncidentPage } from './pages/ActiveIncident/ActiveIncidentPage';
import { ContactsPage } from './pages/Contacts/ContactsPage';
import { ProfilePage } from './pages/Profile/ProfilePage';
import { LoadingSpinner } from './components/common/LoadingSpinner';
import { ResponderLoginPage } from './pages/Responder/ResponderLoginPage';
import { ResponderDashboard } from './pages/Responder/ResponderDashboard';
import { DevAdminDashboard } from './pages/Responder/DevAdminDashboard';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <LoadingSpinner size="lg" color="text-pink-600" />
        <p className="text-xs text-slate-500 mt-3 font-bold tracking-wider uppercase">
          Initializing Safety Protocol...
        </p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!user.isOnboarded && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <LocationProvider>
          <IncidentProvider>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />

              {/* Onboarding Flow */}
              <Route
                path="/onboarding"
                element={
                  <ProtectedRoute>
                    <OnboardingPage />
                  </ProtectedRoute>
                }
              />

              {/* Authenticated Application Shell */}
              <Route
                path="/app"
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<DashboardPage />} />
                <Route path="sos" element={<SOSActivationPage />} />
                <Route path="incidents/:id" element={<ActiveIncidentPage />} />
                <Route path="contacts" element={<ContactsPage />} />
                <Route path="profile" element={<ProfilePage />} />
              </Route>

              {/* Responder / Police Portal — uses own session, not AuthProvider */}
              <Route path="/responder" element={<ResponderLoginPage />} />
              <Route path="/responder/dashboard" element={<ResponderDashboard />} />
              <Route path="/responder/dev" element={<DevAdminDashboard />} />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </IncidentProvider>
        </LocationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
