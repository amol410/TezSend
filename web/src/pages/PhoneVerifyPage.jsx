import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Phone, ShieldCheck, AlertCircle } from 'lucide-react';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { auth } from '../firebase';
import api from '../api';

export default function PhoneVerifyPage() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [recaptchaSolved, setRecaptchaSolved] = useState(false);

  useEffect(() => {
    if (confirmationResult) return; // hide after OTP sent
    const timer = setTimeout(() => {
      if (window.recaptchaVerifierPhone) return;
      window.recaptchaVerifierPhone = new RecaptchaVerifier(auth, 'recaptcha-phone-container', {
        size: 'normal',
        callback: () => setRecaptchaSolved(true),
        'expired-callback': () => setRecaptchaSolved(false),
      });
      window.recaptchaVerifierPhone.render();
    }, 100);
    return () => {
      clearTimeout(timer);
      if (window.recaptchaVerifierPhone) {
        try { window.recaptchaVerifierPhone.clear(); } catch (_) {}
        window.recaptchaVerifierPhone = null;
      }
    };
  }, [confirmationResult]);

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setError('');
    if (!phone) {
      setError('Please enter a valid phone number with country code (e.g., +91...)');
      return;
    }
    if (!recaptchaSolved) {
      setError('Please complete the reCAPTCHA check first.');
      return;
    }
    setLoading(true);
    try {
      const appVerifier = window.recaptchaVerifierPhone;
      if (!appVerifier) {
        setError('reCAPTCHA not ready. Please refresh and try again.');
        return;
      }
      const confirmation = await signInWithPhoneNumber(auth, phone, appVerifier);
      setConfirmationResult(confirmation);
    } catch (err) {
      setRecaptchaSolved(false);
      if (window.recaptchaVerifierPhone) {
        try { window.recaptchaVerifierPhone.clear(); } catch (_) {}
        window.recaptchaVerifierPhone = null;
      }
      console.error('[TezSend] sendOTP error:', err);
      setError(err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await confirmationResult.confirm(otp);
      const idToken = await result.user.getIdToken(true);

      // Link the verified phone to the existing account
      await api.post('/auth/link-phone', { idToken });
      navigate('/');
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data?.detail || err.message;
      setError(msg || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page fade-in">
      {/* Visible reCAPTCHA checkbox — shown before OTP is sent */}
      <div
        id="recaptcha-phone-container"
        style={{
          position: 'fixed', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)',
          zIndex: 999,
          display: !confirmationResult ? 'block' : 'none'
        }}
      />

      {/* Brand Side */}
      <div className="auth-brand">
        <div className="auth-brand-logo">
          <div className="logo-icon"><Send size={24} color="var(--brand)" /></div>
          <span className="logo-text gradient-text">TezSend</span>
        </div>
        <div style={{ zIndex: 1 }}>
          <h2 className="auth-brand-tagline" style={{ marginBottom: '1.5rem' }}>
            One last step —<br /><span>verify your phone.</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: 320 }}>
            A verified phone number is required for sending payments and securing your account.
            We'll send you a one-time code to confirm.
          </p>
          <ul className="auth-brand-features" style={{ marginTop: '2rem' }}>
            <li>
              <div className="feat-icon"><ShieldCheck size={16} color="var(--brand)" /></div>
              Required for all payment operations
            </li>
            <li>
              <div className="feat-icon"><Phone size={16} color="var(--brand)" /></div>
              Used for OTP transaction confirmation
            </li>
          </ul>
        </div>
      </div>

      {/* Form Side */}
      <div className="auth-form-side">
        <div className="auth-form-box">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div className="logo-icon" style={{ width: 36, height: 36 }}>
              <Phone size={18} color="var(--brand)" />
            </div>
            <h2 style={{ margin: 0 }}>Verify Your Phone</h2>
          </div>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.9rem' }}>
            {confirmationResult
              ? `We sent a 6-digit code to ${phone}`
              : 'Enter your mobile number to receive a one-time verification code.'}
          </p>

          {error && (
            <div className="error-msg flex-row">
              <AlertCircle size={18} /> {error}
            </div>
          )}

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
                  autoFocus
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary btn-full mt-1"
                disabled={loading || !recaptchaSolved}
                title={!recaptchaSolved ? 'Complete the reCAPTCHA check below first' : ''}
              >
                {loading ? 'Sending…' : 'Send Verification Code'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP}>
              <div className="form-group">
                <label className="form-label">6-Digit Code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  className="form-input"
                  placeholder="••••••"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  maxLength={6}
                  required
                  autoFocus
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary btn-full mt-1"
                disabled={loading}
              >
                {loading ? 'Verifying…' : 'Verify & Continue'}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-full mt-1"
                onClick={() => { setConfirmationResult(null); setOtp(''); setError(''); }}
              >
                ← Change Phone Number
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
