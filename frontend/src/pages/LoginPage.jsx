import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { 
  validatePasswordWithFeedback, 
  isCommonPassword,
  getPasswordStrengthInfo,
  getPasswordChecklist 
} from "../utils/passwordUtils";
import "../styles.css";
import logo from "../assets/hinahon.png";
import logo1 from "../assets/lpunigga.png";
import logo2 from "../assets/catc.png";
import bgImage from "../assets/bg-login.jpg";
import logomark from "../assets/hinahon2.png";

export default function LoginPage({ setSession }) {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: ""
  });

  useEffect(() => {
    let mounted = true;

    const checkInitialSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      if (data?.session?.user && !data.session.user.email_confirmed_at) {
        console.log("🔄 Clearing password recovery session");
        await supabase.auth.signOut();
      }
    };

    checkInitialSession();

    return () => {
      mounted = false;
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError("");
  };

  async function signInWithGoogle() {
    try {
      setLoading(true);
      setError("");
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { 
          redirectTo: window.location.origin,
          queryParams: {
            access_type: 'offline'
          }
        }
      });

      if (error) throw error;
    } catch (err) {
      console.error("Google sign in error:", err);
      setError(err.message || "Failed to sign in with Google");
      setLoading(false);
    }
  }

  async function handleEmailAuth(e) {
    e.preventDefault();
    setError("");
    
    if (!formData.email || !formData.password) {
      setError("Please fill in all fields");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Please enter a valid email address");
      return;
    }

    const tempEmailDomains = [
      'tempmail.com', 'guerrillamail.com', '10minutemail.com', 
      'mailinator.com', 'throwaway.email', 'temp-mail.org',
      'fakeinbox.com', 'trashmail.com', 'maildrop.cc'
    ];
    const emailDomain = formData.email.split('@')[1]?.toLowerCase();
    if (tempEmailDomains.includes(emailDomain)) {
      setError("Temporary email addresses are not allowed. Please use a valid email.");
      return;
    }

    if (isSignUp) {
      // Check Terms & Conditions acceptance
      if (!acceptedTerms) {
        setError("You must accept the Terms & Conditions to create an account");
        return;
      }

      if (formData.password.length < 8) {
        setError("Password must be at least 8 characters long");
        return;
      }

      const validation = validatePasswordWithFeedback(formData.password);
      if (!validation.isValid) {
        setError(`Password must contain: ${validation.failedRequirements.join(", ")}`);
        return;
      }

      if (isCommonPassword(formData.password)) {
        setError("This password is too common and easily guessable. Please choose a more unique password.");
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        setError("Passwords do not match");
        return;
      }
    } else {
      if (formData.password.length < 6) {
        setError("Password must be at least 6 characters");
        return;
      }
    }

    setLoading(true);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
            data: {
              email: formData.email
            }
          }
        });

        if (error) throw error;

        if (data?.user) {
          if (data.user.identities && data.user.identities.length === 0) {
            setError("This email is already registered. Please sign in instead.");
            setIsSignUp(false);
            setLoading(false);
            return;
          }

          alert(
            "✅ Account created successfully!\n\n" +
            "📧 We've sent a verification email to:\n" +
            formData.email + "\n\n" +
            "Please check your inbox and click the verification link to activate your account.\n\n" +
            "⚠️ Check your spam folder if you don't see it within a few minutes."
          );
          
          setIsSignUp(false);
          setFormData({ email: "", password: "", confirmPassword: "" });
          setAcceptedTerms(false);
          setLoading(false);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password
        });

        if (error) throw error;

        if (data?.user && !data.user.email_confirmed_at) {
          setError(
            "Email not verified. Please check your inbox for the verification email.\n\n" +
            "Need a new verification link? Contact support."
          );
          setLoading(false);
          return;
        }

        if (data?.session) {
          setSession(data.session);
        }
      }
    } catch (err) {
      console.error("Auth error:", err);
      
      if (err.message.includes("Invalid login credentials")) {
        setError("Invalid email or password. Please check your credentials and try again.");
      } else if (err.message.includes("Email not confirmed")) {
        setError("Please verify your email address before signing in. Check your inbox for the verification link.");
      } else if (err.message.includes("Email rate limit exceeded")) {
        setError("Too many requests. Please wait a few minutes before trying again.");
      } else {
        setError(err.message || "Authentication failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordReset(e) {
    e.preventDefault();
    setResetMessage("");
    
    if (!resetEmail) {
      setResetMessage("Please enter your email address");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(resetEmail)) {
      setResetMessage("Please enter a valid email address");
      return;
    }

    setResetLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setResetMessage(
        "✅ Password reset email sent!\n\n" +
        "Please check your inbox and click the link to reset your password.\n\n" +
        "⚠️ Check your spam folder if you don't see it within a few minutes."
      );
      
      setTimeout(() => {
        setResetEmail("");
        setShowForgotPassword(false);
        setResetMessage("");
      }, 5000);

    } catch (err) {
      console.error("Password reset error:", err);
      setResetMessage(err.message || "Failed to send reset email. Please try again.");
    } finally {
      setResetLoading(false);
    }
  }

  const toggleAuthMode = () => {
    setIsSignUp(!isSignUp);
    setError("");
    setFormData({ email: "", password: "", confirmPassword: "" });
    setShowPassword(false);
    setAcceptedTerms(false);
  };

  const passwordStrength = isSignUp && formData.password 
    ? getPasswordStrengthInfo(formData.password) 
    : null;

  const passwordChecklist = isSignUp && formData.password 
    ? getPasswordChecklist(formData.password) 
    : null;

  // Modal Component
  const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;

    return (
      <div 
        className="footer-modal-overlay" 
        onClick={onClose}
      >
        <div 
          className="footer-modal-container" 
          onClick={(e) => e.stopPropagation()}
        >
          <div className="footer-modal-header">
            <h2>{title}</h2>
            <button
              className="footer-modal-close"
              onClick={onClose}
              aria-label="Close modal"
            >
              ×
            </button>
          </div>
          <div className="footer-modal-content">
            {children}
          </div>
        </div>
      </div>
    );
  };

   return (
    <div
     className="auth-page"
     style={{
    backgroundImage: `url(${bgImage})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    position: "relative",
        }}
      >


     <div
    style={{
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      backgroundColor: "rgba(255, 255, 255, 0.4)", 
      zIndex: 0,
    }}
  ></div>

  <div class="auth-container">

      <div className="auth-hero">
        <div className="nav-slim" style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center", 
          gap: "10px", 
        }}>
        <img 
          src={logo1} 
          alt="Logo 1" 
          style={{ height: "50px", width: "auto" }} 
        />
        <img 
          src={logo2} 
          alt="Logo 2" 
          style={{ height: "50px", width: "auto" }} 
        />
        </div>
        
        <div className="hero-content">
          <img 
            src={logo} 
            alt="Hinahon Logo" 
            className="brand-big" 
            style={{ width: "690px", height: "auto", justifyContent: "center" }} 
          />
          <p className="hero-sub1">
           The Digital Solution for Mental Wellness Counselling in LPU-Batangas.
          </p>
          <p className="hero-sub2">
            {isSignUp 
              ? "Join our community and start your journey to better mental health."
              : "Welcome back! Sign in to continue your mental health journey."
            }
          </p>
        </div>
      </div>

      <div className="auth-card">
        <div className="card-header">
          <div className="logo-small" style={{fontSize: "35px", fontFamily: "Playfair Display" }}>Step into Calm</div>
          <div className="small-tag" style={{fontSize: "17px"}}>
            {isSignUp ? "Create your account" : "Sign in to your account"}
          </div>
        </div>

        {error && (
          <div style={{
            backgroundColor: "#ffebee",
            color: "#c62828",
            padding: "12px",
            borderRadius: "8px",
            fontSize: "13px",
            marginBottom: "12px"
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleEmailAuth} className="login-form">
          <div className="field">
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Email address"
              disabled={loading}
              required
            />
          </div>

          <div className="field">
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Password"
                disabled={loading}
                required
                style={{ paddingRight: "45px" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "5px",
                  color: "#666",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                )}
              </button>
            </div>

            {isSignUp && formData.password && passwordStrength && (
              <div style={{ marginTop: '8px' }}>
                <div style={{
                  height: '4px',
                  backgroundColor: '#e0e0e0',
                  borderRadius: '2px',
                  overflow: 'hidden',
                  marginBottom: '6px'
                }}>
                  <div style={{
                    height: '100%',
                    width: `${passwordStrength.percentage}%`,
                    backgroundColor: passwordStrength.color,
                    transition: 'all 0.3s ease'
                  }}></div>
                </div>
                <div style={{
                  fontSize: '12px',
                  color: passwordStrength.color,
                  fontWeight: '600'
                }}>
                  Password Strength: {passwordStrength.label}
                </div>
              </div>
            )}
          </div>

          {isSignUp && formData.password && passwordChecklist && (
            <div style={{
              backgroundColor: '#f5f9ff',
              padding: '12px',
              borderRadius: '8px',
              fontSize: '12px',
              marginBottom: '12px',
              border: '1px solid #e3f2fd'
            }}>
              <p style={{ 
                margin: '0 0 10px 0', 
                fontWeight: '600',
                color: '#1976d2',
                fontSize: '13px'
              }}>
                🔐 Password Requirements:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {passwordChecklist.map(item => (
                  <div 
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: item.met ? '#388e3c' : '#666'
                    }}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isSignUp && (
            <div className="field">
              <input
                type={showPassword ? "text" : "password"}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm password"
                disabled={loading}
                required
              />
            </div>
          )}

          {/* Terms & Conditions Checkbox for Sign Up */}
          {isSignUp && (
            <div style={{
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px'
            }}>
              <input
                type="checkbox"
                id="terms-checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                disabled={loading}
                style={{
                  marginTop: '4px',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              />
              <label 
                htmlFor="terms-checkbox"
                style={{
                  fontSize: '13px',
                  color: '#666',
                  lineHeight: '1.5',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                I agree to the{' '}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowTermsModal(true);
                  }}
                  disabled={loading}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--pink)',
                    textDecoration: 'underline',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    padding: 0,
                    fontSize: '13px'
                  }}
                >
                  Terms & Conditions
                </button>
              </label>
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{
              opacity: loading ? 0.6 : 1,
              cursor: loading ? "not-allowed" : "pointer"
            }}
          >
            {loading ? "Please wait..." : (isSignUp ? "Join Hinahon" : "Log In")}
          </button>
        </form>

        <div className="divider">or</div>

        <button
          className="btn-google"
          onClick={signInWithGoogle}
          disabled={loading}
          aria-label="Continue with Google"
        >
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
            <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
            <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/>
            <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/>
          </svg>
          Continue with Google
        </button>

        <div style={{ 
          textAlign: "center", 
          marginTop: "16px",
          fontSize: "14px"
        }}>
          <button
            onClick={toggleAuthMode}
            disabled={loading}
            style={{
              background: "none",
              border: "none",
              color: "var(--pink)",
              cursor: loading ? "not-allowed" : "pointer",
              textDecoration: "underline",
              fontSize: "14px",
              padding: "0",
              opacity: loading ? 0.6 : 1
            }}
          >
            {isSignUp 
              ? "Already with us? Sign in."
              : "New here? Start the path to wellness today."
            }
          </button>
        </div>

        <div className="card-footer" style={{ marginTop: 12 }}>
          {!isSignUp && (
            <a 
              className="link-muted" 
              href="#" 
              onClick={(e) => {
                e.preventDefault();
                setShowForgotPassword(true);
              }}
            >
              Forgot Password?
            </a>
          )}
          <a 
            className="link-muted" 
            href="#" 
            onClick={(e) => {
              e.preventDefault();
              setShowHelpModal(true);
            }}
          >
            Help
          </a>
        </div>
      </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "20px"
        }}>
          <div style={{
            backgroundColor: "white",
            borderRadius: "12px",
            padding: "24px",
            maxWidth: "400px",
            width: "100%",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)"
          }}>
            <h2 style={{ 
              margin: "0 0 8px 0", 
              fontSize: "20px",
              fontWeight: 600
            }}>
              Reset Password
            </h2>
            <p style={{ 
              margin: "0 0 20px 0", 
              fontSize: "14px", 
              color: "#666" 
            }}>
              Enter your email address and we'll send you a link to reset your password.
            </p>

            {resetMessage && (
              <div style={{
                backgroundColor: resetMessage.includes("✅") ? "#e8f5e9" : "#ffebee",
                color: resetMessage.includes("✅") ? "#2e7d32" : "#c62828",
                padding: "12px",
                borderRadius: "8px",
                fontSize: "13px",
                marginBottom: "16px",
                whiteSpace: "pre-line"
              }}>
                {resetMessage}
              </div>
            )}

            <form onSubmit={handlePasswordReset}>
              <div className="field">
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="Enter your email"
                  disabled={resetLoading}
                  required
                  style={{
                    width: "100%",
                    padding: "12px",
                    borderRadius: "8px",
                    border: "1px solid #ddd",
                    fontSize: "14px"
                  }}
                />
              </div>

              <div style={{ 
                display: "flex", 
                gap: "12px", 
                marginTop: "20px" 
              }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setResetEmail("");
                    setResetMessage("");
                  }}
                  disabled={resetLoading}
                  style={{
                    flex: 1,
                    padding: "12px",
                    borderRadius: "8px",
                    border: "1px solid #ddd",
                    backgroundColor: "white",
                    cursor: resetLoading ? "not-allowed" : "pointer",
                    fontSize: "14px",
                    fontWeight: 500,
                    opacity: resetLoading ? 0.6 : 1
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="btn-primary"
                  style={{
                    flex: 1,
                    padding: "12px",
                    borderRadius: "8px",
                    border: "none",
                    cursor: resetLoading ? "not-allowed" : "pointer",
                    fontSize: "14px",
                    fontWeight: 500,
                    opacity: resetLoading ? 0.6 : 1
                  }}
                >
                  {resetLoading ? "Sending..." : "Send Reset Link"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Terms & Conditions Modal */}
      <Modal 
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        title={<span className="modal-title">📝 Terms & Conditions</span>}
      >
        <div className="footer-modal-body">
          <h3>1. Acceptance of Terms</h3>
          <p>
            By accessing and using the Hinahon mental health consultation platform, you accept and agree to be bound by the terms and provisions of this agreement. If you do not agree to these terms, please do not use our services.
          </p>

          <h3>2. Description of Services</h3>
          <p>
            Hinahon provides an online platform connecting students with licensed mental health counselors. Our services include:
          </p>
          <ul>
            <li>Video consultation scheduling and booking</li>
            <li>Access to mental health articles and resources</li>
            <li>Secure communication between students and counselors</li>
            <li>Confidential mental health support services</li>
          </ul>

          <h3>3. User Responsibilities</h3>
          <p>As a user of Hinahon, you agree to:</p>
          <ul>
            <li>Provide accurate and complete information during registration</li>
            <li>Maintain the confidentiality of your account credentials</li>
            <li>Notify us immediately of any unauthorized access to your account</li>
            <li>Use the platform in compliance with all applicable laws</li>
            <li>Respect the professional boundaries with counselors</li>
            <li>Attend scheduled consultations or cancel with appropriate notice</li>
          </ul>

          <h3>4. Emergency Situations</h3>
          <div className="footer-warning-box">
            <strong>⚠️ Important:</strong> Our platform is NOT designed for emergency mental health crises. If you are experiencing a mental health emergency, please contact your local emergency services (911 in the Philippines) or visit the nearest emergency room immediately.
          </div>

          <h3>5. Confidentiality and Privacy</h3>
          <p>
            We take your privacy seriously. All consultations and personal information are kept confidential in accordance with professional ethics and applicable privacy laws. Please refer to our Privacy Policy for detailed information.
          </p>

          <h3>6. Booking and Cancellation Policy</h3>
          <ul>
            <li>Bookings are confirmed upon counselor acceptance</li>
            <li>Cancellations should be made at least 24 hours in advance when possible</li>
            <li>Repeated no-shows may result in booking restrictions</li>
            <li>Counselors reserve the right to decline consultation requests</li>
          </ul>

          <h3>7. Limitation of Liability</h3>
          <p>
            While we strive to provide quality mental health services, Hinahon and its counselors are not liable for any outcomes resulting from the use of our platform. Our services are provided "as is" without warranties of any kind.
          </p>

          <h3>8. Modifications to Terms</h3>
          <p>
            We reserve the right to modify these terms at any time. Users will be notified of significant changes, and continued use of the platform constitutes acceptance of modified terms.
          </p>

          <h3>9. Contact Information</h3>
          <p>
            For questions about these Terms & Conditions, please contact us at support@hinahon.ph
          </p>
        </div>
      </Modal>

      {/* Help/Contact Modal */}
      <Modal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
        title="Contact Us"
      >
        <div className="footer-contact-body">
              <img
                src={logomark}
                alt="Hinahon Logo"
                style={{
                  height: "auto",
                  width: "150px",
                  objectFit: "contain",
                  display: "inline-block",
                  verticalAlign: "middle",
                }}
              />
          
          <h2 className="footer-contact-title" style={{fontSize: "35px" }} >Get in Touch With Us!</h2>

          <p className="footer-contact-subtitle">
            We're here to help! Reach out to us through any of the following channels:
          </p>

          <div className="footer-contact-methods">
            <div className="footer-contact-item">
              <span className="footer-contact-emoji">📧</span>
              <div>
                <div className="footer-contact-label">EMAIL</div>
                <a 
                  href="mailto:support@hinahon.ph"
                  className="footer-contact-link"
                >
                  support@hinahon.ph
                </a>
              </div>
            </div>

            <div className="footer-contact-item">
              <span className="footer-contact-emoji">📲</span>
              <div>
                <div className="footer-contact-label">CRISIS HOTLINE</div>
                <a 
                  href="tel:09195871553"
                  className="footer-contact-link"
                >
                  0919-587-1553
                </a>
              </div>
            </div>

            <div className="footer-contact-item">
              <span className="footer-contact-emoji">🌐</span>
              <div>
                <div className="footer-contact-label">WEBSITE</div>
                <a 
                  href="https://lpubatangas.edu.ph/counseling-and-testing-center/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-contact-link"
                >
                  LPU Counseling Center
                </a>
              </div>
            </div>

            <div className="footer-contact-item">
              <span className="footer-contact-emoji">👩🏻‍⚕️</span>
              <div>
                <div className="footer-contact-label">FACEBOOK</div>
                <a 
                  href="https://www.facebook.com/LPUCATC"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-contact-link"
                >
                  @LPUCATC
                </a>
              </div>
            </div>
          </div>

          <div className="footer-contact-note">
            <strong>💡 Need immediate help?</strong>
            <p>If you're experiencing a mental health emergency, please call 911 or visit your nearest emergency room.</p>
          </div>
        </div>
      </Modal>
    </div>
  );
}