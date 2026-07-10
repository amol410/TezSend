import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { useState, useEffect } from 'react';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import Payment from './pages/Payment';
import PhoneVerifyPage from './pages/PhoneVerifyPage';
import Layout from './components/Layout';
import api from './api';
import './index.css';

// ─── Auth guard: must be logged in ───────────────────────────────────────────
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = !!localStorage.getItem('token');
  return isAuthenticated ? children : <Navigate to="/login" />;
};

// ─── Phone guard: must have a verified phone to access the app ────────────────
function PhoneGatedRoute({ children }) {
  const [status, setStatus] = useState('loading'); // 'loading' | 'has-phone' | 'no-phone'

  useEffect(() => {
    api.get('/auth/me')
      .then(res => {
        setStatus(res.data.phone ? 'has-phone' : 'no-phone');
      })
      .catch(() => {
        // Token invalid — clear and go to login
        localStorage.removeItem('token');
        setStatus('no-phone');
      });
  }, []);

  if (status === 'loading') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)' }}>
        <div style={{ color: 'var(--text-secondary)' }}>Loading…</div>
      </div>
    );
  }

  if (status === 'no-phone') return <Navigate to="/verify-phone" />;
  return children;
}

const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID_HERE'; // Replace with actual Client ID

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <Router>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<AuthPage />} />

          {/* Phone verification — requires a token but no phone yet */}
          <Route
            path="/verify-phone"
            element={
              <ProtectedRoute>
                <PhoneVerifyPage />
              </ProtectedRoute>
            }
          />

          {/* Protected + phone-gated */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <PhoneGatedRoute>
                  <Layout />
                </PhoneGatedRoute>
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="payment" element={<Payment />} />
          </Route>
        </Routes>
      </Router>
    </GoogleOAuthProvider>
  );
}

export default App;
