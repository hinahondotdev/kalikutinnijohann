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

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [session, setSession] = useState(null);
  const [validating, setValidating] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [countdown, setCountdown] = useState(3);

  // Handle redirect countdown when success is true
  useEffect(() => {
    if (!success) return;

    console.log("✅ Success state detected, starting countdown and redirect...");
    let timeLeft = 3;
    setCountdown(timeLeft);
    
    const countdownInterval = setInterval(() => {
      timeLeft--;
      setCountdown(timeLeft);
      console.log(`⏱️ Redirecting in ${timeLeft} seconds...`);
      
      if (timeLeft <= 0) {
        clearInterval(countdownInterval);
        console.log("⏱️ Countdown complete!");
      }
    }, 1000);

    // Sign out and redirect after 3 seconds
    const redirectTimeout = setTimeout(() => {
      console.log("🔄 Timeout fired! Force redirecting without signout...");
      // Just redirect - let the login page handle signout
      window.location.href = "/";
    }, 3000);

    console.log("⏱️ Countdown interval and timeout set");

    return () => {
      console.log("🧹 Cleanup: clearing intervals and timeouts");
      clearInterval(countdownInterval);
      clearTimeout(redirectTimeout);
    };
  }, [success]);

  useEffect(() => {
    let mounted = true;
    let updateSuccessful = false;

    const checkSession = async () => {
      try {
        // Get current session
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        
        if (!mounted) return;

        if (error) {
          console.error("Session check error:", error);
          setError("Failed to validate reset link. Please try again.");
          setValidating(false);
          return;
        }

        if (currentSession) {
          console.log("✅ Valid session found for password reset");
          setSession(currentSession);
        } else {
          console.log("❌ No session - invalid or expired link");
          setError("Invalid or expired password reset link. Please request a new one.");
        }
        
        setValidating(false);
      } catch (err) {
        console.error("Session validation error:", err);
        if (mounted) {
          setError("Failed to validate reset link. Please try again.");
          setValidating(false);
        }
      }
    };

    checkSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;
        
        console.log("🔔 Reset page auth event:", event);
        
        if (event === 'PASSWORD_RECOVERY') {
          console.log("✅ Password recovery session detected");
          setSession(newSession);
          setValidating(false);
        } else if (event === 'USER_UPDATED' && isUpdating && !updateSuccessful) {
          // Password was successfully updated!
          console.log("✅ Password update detected via USER_UPDATED event");
          updateSuccessful = true;
          setIsUpdating(false);
          setLoading(false);
          setSuccess(true); // This triggers the countdown useEffect
        } else if (event === 'SIGNED_OUT') {
          console.log("👋 Signed out during reset");
          if (!updateSuccessful) {
            setSession(null);
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [isUpdating]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!password || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }

    // Check minimum length first
    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    // Use password utility for validation
    const validation = validatePasswordWithFeedback(password);
    if (!validation.isValid) {
      setError(`Password must contain: ${validation.failedRequirements.join(", ")}`);
      return;
    }

    // Check for common passwords
    if (isCommonPassword(password)) {
      setError("This password is too common and easily guessable. Please choose a more unique password.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    setIsUpdating(true);

    try {
      console.log("🔄 Attempting to update password...");
      
      // Call updateUser - the USER_UPDATED event will handle success
      const { data, error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      console.log("📊 Update response received:", { data, error: updateError });

      if (updateError) {
        console.error("❌ Update error:", updateError);
        setIsUpdating(false);
        setLoading(false);
        
        if (updateError.message.includes("session_not_found")) {
          setError("Your session has expired. Please request a new password reset link.");
        } else if (updateError.message.includes("same_password") || updateError.message.includes("New password should be different")) {
          setError("New password must be different from your current password.");
        } else {
          setError(updateError.message || "Failed to update password. Please try again.");
        }
      }
      // Success is handled by the USER_UPDATED event listener

    } catch (err) {
      console.error("❌ Unexpected error:", err);
      setIsUpdating(false);
      setLoading(false);
      setError("An unexpected error occurred. Please try again.");
    }
  };

  const handleBackToLogin = async () => {
    console.log("🔄 Back to login button clicked");
    // Just redirect - let the login page handle any cleanup
    window.location.href = "/";
  };

  // Get password strength and checklist
  const passwordStrength = password ? getPasswordStrengthInfo(password) : null;
  const passwordChecklist = password ? getPasswordChecklist(password) : null;

  // Loading state
  if (validating) {
    return (
      <div className="auth-page">
        <div className="auth-hero">
          <div className="hero-content">
            <h1 className="brand-big">Hinahon</h1>
            <p className="hero-sub">Validating reset link...</p>
          </div>
        </div>
        <div className="auth-card" style={{ textAlign: "center", padding: "40px" }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid var(--pink)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }}></div>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-hero">
          <div className="hero-content">
            <h1 className="brand-big">Success!</h1>
            <p className="hero-sub">
              Your password has been updated successfully.
            </p>
          </div>
        </div>

        <div className="auth-card">
          <div style={{
            textAlign: "center",
            padding: "30px 20px"
          }}>
            <div style={{
              fontSize: "72px",
              marginBottom: "20px",
              animation: "scaleIn 0.5s ease-out"
            }}>
              ✅
            </div>
            <h3 style={{ 
              color: "var(--pink)", 
              marginBottom: "12px",
              fontSize: "22px",
              fontWeight: "600"
            }}>
              Password Reset Complete
            </h3>
            <p style={{ 
              color: "#666", 
              marginBottom: "24px",
              fontSize: "15px"
            }}>
              You can now sign in with your new password.
            </p>
            <p style={{ 
              color: "#999", 
              fontSize: "14px",
              marginBottom: "20px"
            }}>
              Redirecting to login page in {countdown} seconds...
            </p>
            <button
              onClick={handleBackToLogin}
              className="btn-primary"
              style={{ marginTop: "10px" }}
            >
              Go to Login Now
            </button>
          </div>
          <style>{`
            @keyframes scaleIn {
              0% { transform: scale(0); }
              50% { transform: scale(1.1); }
              100% { transform: scale(1); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-hero">
        <div className="nav-slim">
          <span>Reset Your Password</span>
        </div>
        
        <div className="hero-content">
          <h1 className="brand-big">Hinahon</h1>
          <p className="hero-sub">
            Create a new password for your account.
          </p>
          <p className="hero-sub" style={{ marginTop: "16px", fontSize: "14px" }}>
            Choose a strong password that you haven't used before.
          </p>
        </div>
      </div>

      <div className="auth-card">
        <div className="card-header">
          <div className="logo-small">Reset Password</div>
          <div className="small-tag">Enter your new password</div>
        </div>

        {error && (
          <div style={{
            backgroundColor: "#ffebee",
            color: "#c62828",
            padding: "14px",
            borderRadius: "8px",
            fontSize: "13px",
            marginBottom: "16px",
            display: "flex",
            alignItems: "flex-start",
            gap: "10px"
          }}>
            <span style={{ fontSize: "18px" }}>⚠️</span>
            <span style={{ flex: 1 }}>{error}</span>
          </div>
        )}

        {!session ? (
          <div style={{ textAlign: "center", padding: "30px 20px" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔒</div>
            <h3 style={{ 
              color: "#333", 
              marginBottom: "12px",
              fontSize: "18px"
            }}>
              Invalid Reset Link
            </h3>
            <p style={{ 
              color: "#666", 
              marginBottom: "24px",
              fontSize: "14px",
              lineHeight: "1.6"
            }}>
              This password reset link is invalid or has expired.<br />
              Password reset links are valid for 1 hour.
            </p>
            <button
              onClick={handleBackToLogin}
              className="btn-primary"
              style={{ width: "100%" }}
            >
              Back to Login
            </button>
            <p style={{
              marginTop: "16px",
              fontSize: "13px",
              color: "#999"
            }}>
              Need help? Request a new password reset link from the login page.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="login-form">
            {/* Password Requirements Checklist */}
            {password && passwordChecklist && (
              <div style={{
                backgroundColor: "#f5f9ff",
                padding: "12px",
                borderRadius: "8px",
                fontSize: "12px",
                marginBottom: "16px",
                border: "1px solid #e3f2fd"
              }}>
                <p style={{ 
                  margin: "0 0 10px 0", 
                  fontWeight: "600",
                  color: "#1976d2",
                  fontSize: "13px"
                }}>
                  🔐 Password Requirements:
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {passwordChecklist.map(item => (
                    <div 
                      key={item.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        color: item.met ? "#388e3c" : "#666"
                      }}
                    >
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="field">
              <label style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "13px",
                fontWeight: "600",
                color: "#333"
              }}>
                New Password *
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password"
                  disabled={loading}
                  required
                  minLength="8"
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
                    fontSize: "18px",
                    padding: "5px",
                    color: "#666"
                  }}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "👁️" : "👁️‍🗨️"}
                </button>
              </div>

              {/* Password Strength Indicator */}
              {password && passwordStrength && (
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

            <div className="field">
              <label style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "13px",
                fontWeight: "600",
                color: "#333"
              }}>
                Confirm New Password *
              </label>
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                disabled={loading}
                required
                minLength="8"
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{
                opacity: loading ? 0.6 : 1,
                cursor: loading ? "not-allowed" : "pointer",
                marginTop: "8px"
              }}
            >
              {loading ? "Updating Password..." : "Update Password"}
            </button>
          </form>
        )}

        <div style={{ 
          textAlign: "center", 
          marginTop: "20px",
          paddingTop: "20px",
          borderTop: "1px solid #e0e0e0"
        }}>
          <button
            onClick={handleBackToLogin}
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
            ← Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}