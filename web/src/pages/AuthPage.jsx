import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Lock, User, AlertCircle } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { auth } from '../firebase';
import api, { setAuthToken } from '../api';

// Validate Firebase Auth is initialized before any phone auth is attempted
if (!auth || !auth.app) {
  console.error('[TezSend] Firebase auth is not initialized. Check firebase.js.');
}

export default function AuthPage() {
  const [authMode, setAuthMode] = useState('login'); // 'login', 'signup', 'phone'
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Email Auth State
  const [formData, setFormData] = useState({
    name: '', email: '', password: ''
  });

  // Phone Auth State
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [recaptchaSolved, setRecaptchaSolved] = useState(false);

  // Initialize visible reCAPTCHA when the phone tab is active.
  // size:'normal' (checkbox widget) reliably works on localhost even when
  // reCAPTCHA Enterprise isn't configured — the user checks the box,
  // which gives Firebase a valid token before it tries to send the SMS.
  useEffect(() => {
    if (authMode !== 'phone') {
      if (window.recaptchaVerifier) {
        try { window.recaptchaVerifier.clear(); } catch (_) {}
        window.recaptchaVerifier = null;
      }
      setRecaptchaSolved(false);
      return;
    }

    // Small delay so the DOM element is mounted before we attach
    const timer = setTimeout(() => {
      if (window.recaptchaVerifier) return; // already set up
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'normal',
        callback: () => {
          setRecaptchaSolved(true);
        },
        'expired-callback': () => {
          setRecaptchaSolved(false);
        },
      });
      window.recaptchaVerifier.render();
    }, 100);

    return () => {
      clearTimeout(timer);
      if (window.recaptchaVerifier) {
        try { window.recaptchaVerifier.clear(); } catch (_) {}
        window.recaptchaVerifier = null;
      }
      setRecaptchaSolved(false);
    };
  }, [authMode]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      if (authMode === 'login') {
        const res = await api.post('/auth/login', { email: formData.email, password: formData.password });
        setAuthToken(res.data.token);
        navigate('/');
      } else if (authMode === 'signup') {
        const res = await api.post('/auth/register', formData);
        setAuthToken(res.data.token);
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication failed. Please try again.');
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const res = await api.post('/auth/google', { idToken: credentialResponse.credential });
      setAuthToken(res.data.token);
      navigate('/');
    } catch (err) {
      setError('Google Sign-In failed.');
    }
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setError('');

    if (!phone) {
      setError('Please enter a valid phone number with country code (e.g., +91...)');
      return;
    }

    if (!auth || !auth.app) {
      setError('Firebase is not initialized. Please refresh the page.');
      return;
    }

    if (!recaptchaSolved) {
      setError('Please complete the reCAPTCHA check first.');
      return;
    }

    try {
      const appVerifier = window.recaptchaVerifier;
      if (!appVerifier) {
        setError('reCAPTCHA not ready. Please refresh and try again.');
        return;
      }
      const confirmation = await signInWithPhoneNumber(auth, phone, appVerifier);
      setConfirmationResult(confirmation);
    } catch (err) {
      // Reset reCAPTCHA on failure so the user can try again
      setRecaptchaSolved(false);
      if (window.recaptchaVerifier) {
        try { window.recaptchaVerifier.clear(); } catch (_) {}
        window.recaptchaVerifier = null;
      }
      console.error('[TezSend] sendOTP error:', err);
      setError(err.message || 'Failed to send OTP. Please try again.');
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const result = await confirmationResult.confirm(otp);
      // Force-refresh ensures we always send a fresh, non-expired ID token
      const idToken = await result.user.getIdToken(true);

      const res = await api.post('/auth/firebase-phone', { idToken });
      setAuthToken(res.data.token);
      navigate('/');
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || 'Invalid OTP code. Please try again.');
    }
  };


  return (
    <div className="auth-page fade-in">
      {/* reCAPTCHA container — visible checkbox widget, shown only on phone tab */}
      <div
        id="recaptcha-container"
        style={{
          position: 'fixed', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)',
          zIndex: 999,
          display: authMode === 'phone' && !confirmationResult ? 'block' : 'none'
        }}
      />
      
      {/* Brand Side */}
      <div className="auth-brand">
        <div className="auth-brand-logo">
          <div className="logo-icon"><Send size={24} color="var(--brand)" /></div>
          <span className="logo-text gradient-text">TezSend</span>
        </div>
        
        <div style={{ zIndex: 1 }}>
          <h2 className="auth-brand-tagline" style={{ marginBottom: '2rem' }}>
            Pay your rent,<br/><span>earn rewards.</span>
          </h2>
          <ul className="auth-brand-features">
            <li>
              <div className="feat-icon"><Send size={16} color="var(--brand)" /></div>
              Instant transfer to any UPI or Bank
            </li>
            <li>
              <div className="feat-icon"><Lock size={16} color="var(--brand)" /></div>
              Bank-grade security & encryption
            </li>
            <li>
              <div className="feat-icon"><User size={16} color="var(--brand)" /></div>
              Low 2% convenience fee
            </li>
          </ul>
        </div>
      </div>

      {/* Form Side */}
      <div className="auth-form-side">
        <div className="auth-form-box">
          <div className="auth-tabs">
            <button className={`auth-tab ${authMode === 'login' ? 'active' : ''}`} onClick={() => { setAuthMode('login'); setConfirmationResult(null); }}>Login</button>
            <button className={`auth-tab ${authMode === 'signup' ? 'active' : ''}`} onClick={() => { setAuthMode('signup'); setConfirmationResult(null); }}>Sign Up</button>
            <button className={`auth-tab ${authMode === 'phone' ? 'active' : ''}`} onClick={() => { setAuthMode('phone'); setConfirmationResult(null); }}>Phone</button>
          </div>

          <h2 style={{ marginBottom: '1.5rem' }}>
            {authMode === 'login' ? 'Welcome back' : authMode === 'signup' ? 'Create an account' : 'Continue with Phone'}
          </h2>

          {error && (
            <div className="error-msg flex-row">
              <AlertCircle size={18} /> {error}
            </div>
          )}

          {authMode !== 'phone' && (
            <>
              <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setError('Google Sign-In was unsuccessful')}
                  theme="filled_black"
                  shape="rectangular"
                  size="large"
                  width="100%"
                />
              </div>

              <div className="divider">or continue with email</div>

              <form onSubmit={handleEmailSubmit}>
                {authMode === 'signup' && (
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input type="text" name="name" className="form-input" placeholder="John Doe" required onChange={handleChange} />
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input type="email" name="email" className="form-input" placeholder="you@example.com" required onChange={handleChange} />
                </div>

                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input type="password" name="password" className="form-input" placeholder="••••••••" required onChange={handleChange} />
                </div>

                <button type="submit" className="btn btn-primary btn-full mt-1">
                  {authMode === 'login' ? 'Log In' : 'Sign Up'}
                </button>
              </form>
            </>
          )}

          {authMode === 'phone' && (
            <div>
              {!confirmationResult ? (
                <form onSubmit={handleSendOTP}>
                  <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <input 
                      type="tel" 
                      className="form-input" 
                      placeholder="+91 9876543210" 
                      value={phone} 
                      onChange={(e) => setPhone(e.target.value)} 
                      required 
                    />
                  </div>
                  <button type="submit" className="btn btn-primary btn-full mt-1">
                    Send OTP
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOTP}>
                  <div className="form-group">
                    <label className="form-label">Enter 6-digit OTP</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="••••••" 
                      value={otp} 
                      onChange={(e) => setOtp(e.target.value)} 
                      required 
                    />
                  </div>
                  <button type="submit" className="btn btn-primary btn-full mt-1">
                    Verify & Login
                  </button>
                  <button type="button" className="btn btn-ghost btn-full mt-1" onClick={() => setConfirmationResult(null)}>
                    Change Phone Number
                  </button>
                </form>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
