// FILE: src/pages/ProfilePage.jsx
// Complete version with integrated password change functionality
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Footer from '../components/Footer';
import logomark from "../assets/hinahon2.png";
import "../styles.css";

export default function ProfilePage({ session }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [userProfile, setUserProfile] = useState(null);
  
  // Password change modal states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    student_id: "",
    birthday: "",
    department: "",
    program: "",
    year_level: "",
    role: ""
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  useEffect(() => {
    if (session?.user) {
      fetchUserProfile();
    }
  }, [session]);

  const fetchUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (error) throw error;

      setUserProfile(data);
      setFormData({
        name: data.name || "",
        email: data.email || session.user.email || "",
        student_id: data.student_id || "",
        birthday: data.birthday || "",
        role: data.role || "student"
      });
    } catch (err) {
      console.error("Error fetching profile:", err);
      setError("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!formData.name) {
      setError("Name is required");
      return;
    }

    if (formData.student_id && formData.role === "student") {
      if (!/^\d{8}$/.test(formData.student_id)) {
        setError("Student ID must be exactly 8 digits");
        return;
      }
    }

    if (formData.birthday) {
      const birthDate = new Date(formData.birthday);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      if (age < 13) {
        setError("You must be at least 13 years old");
        return;
      }
    }

    setSaving(true);

    try {
      const updateData = {
        name: formData.name,
        email: formData.email
      };

      if (formData.role === "student") {
        updateData.student_id = formData.student_id || null;
        updateData.birthday = formData.birthday || null;
      }

      const { error: updateError } = await supabase
        .from("users")
        .update(updateData)
        .eq("id", session.user.id);

      if (updateError) throw updateError;

      setSuccess("Profile updated successfully!");
      await fetchUserProfile();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Error updating profile:", err);
      setError(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
    setPasswordError("");
    setPasswordSuccess("");
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordError("All fields are required");
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters");
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    if (passwordData.currentPassword === passwordData.newPassword) {
      setPasswordError("New password must be different from current password");
      return;
    }

    setChangingPassword(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: session.user.email,
        password: passwordData.currentPassword
      });

      if (signInError) {
        setPasswordError("Current password is incorrect");
        setChangingPassword(false);
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (updateError) throw updateError;

      setPasswordSuccess("Password changed successfully!");
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });

      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess("");
      }, 2000);

    } catch (err) {
      console.error("Error changing password:", err);
      setPasswordError(err.message || "Failed to change password");
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="landing-root">
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid var(--pink)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <p style={{ color: '#666' }}>Loading profile...</p>
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="landing-root">
      <header className="landing-header">
   <div
      className="header-left"
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-start",
        gap: "10px",
      }}
    >
    <img
      src={logomark}
      alt="Hinahon Logo"
      style={{
        height: "45px",
        width: "45px",
        objectFit: "contain",
        display: "inline-block",
        verticalAlign: "middle",
      }}
    />
  
  <div style={{ lineHeight: "1.2" }}>
    <div
      style={{
        fontWeight: "700",
        fontSize: "22px",
        color: "#e91e63",
        margin: 0,
        padding: 0,
      }}
    >
      Hinahon
    </div>
    <div
      style={{
        fontSize: "13px",
        color: "#666",
        margin: 0,
        padding: 0,
      }}
    >
      Tell Us more About yourself!
    </div>
  </div>
</div>
        <div className="header-right">
          <button
            className="btn-profile"
            onClick={() => navigate("/landing")}
            style={{ borderColor: "var(--pink)", color: "var(--pink)" }}
          >
            ← Back
          </button>
          <button className="btn-logout" onClick={handleSignOut}>
            Sign Out
          </button>
        </div>
      </header>

      <main style={{ padding: "40px 24px", maxWidth: "900px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <h1 style={{
            fontSize: "69px",
            color: "var(--pink)",
            marginBottom: "8px",
            fontFamily: "'Playfair Display', serif"
          }}>
            My Profile
          </h1>
          <p style={{ color: "#666", fontSize: "16px" }}>
            Manage your personal information and preferences
          </p>
        </div>

        <div style={{
          backgroundColor: "white",
          borderRadius: "12px",
          padding: "32px",
          boxShadow: "var(--card-shadow)",
          border: "1px solid #f0f0f0"
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "24px",
            paddingBottom: "16px",
            borderBottom: "1px solid #e0e0e0"
          }}>
            <div>
              <h2 style={{ margin: "0 0 4px 0", fontSize: "24px", color: "var(--text)" }}>
                Account Information
              </h2>
              <p style={{ margin: "0", color: "#999", fontSize: "14px" }}>
                Update your personal details
              </p>
            </div>
            <span style={{
              padding: "6px 16px",
              borderRadius: "20px",
              fontSize: "13px",
              fontWeight: "600",
              textTransform: "capitalize",
              backgroundColor: formData.role === "admin" 
                ? "#e3f2fd" 
                : formData.role === "counselor" 
                ? "#f3e5f5" 
                : "#e8f5e9",
              color: formData.role === "admin" 
                ? "#1976d2" 
                : formData.role === "counselor" 
                ? "#7b1fa2" 
                : "#388e3c"
            }}>
              {formData.role}
            </span>
          </div>

          {error && (
            <div style={{
              backgroundColor: "#ffebee",
              color: "#c62828",
              padding: "12px 16px",
              borderRadius: "8px",
              marginBottom: "20px",
              fontSize: "14px",
              border: "1px solid #ef9a9a"
            }}>
              {error}
            </div>
          )}

          {success && (
            <div style={{
              backgroundColor: "#e8f5e9",
              color: "#2e7d32",
              padding: "12px 16px",
              borderRadius: "8px",
              marginBottom: "20px",
              fontSize: "14px",
              border: "1px solid #a5d6a7",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}>
              <span>✓</span> {success}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ display: "grid", gap: "20px" }}>
              <div>
                <label style={{
                  display: "block",
                  marginBottom: "8px",
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#333"
                }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: "8px",
                    border: "1px solid #e0e0e0",
                    fontSize: "15px",
                    boxSizing: "border-box",
                    transition: "border-color 0.2s"
                  }}
                  onFocus={(e) => e.target.style.borderColor = "var(--teal)"}
                  onBlur={(e) => e.target.style.borderColor = "#e0e0e0"}
                />
              </div>

              <div>
                <label style={{
                  display: "block",
                  marginBottom: "8px",
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#333"
                }}>
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  readOnly
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: "8px",
                    border: "1px solid #e0e0e0",
                    fontSize: "15px",
                    boxSizing: "border-box",
                    backgroundColor: "#f5f5f5",
                    cursor: "not-allowed",
                    color: "#666"
                  }}
                />
                <small style={{ color: "#999", fontSize: "12px", marginTop: "4px", display: "block" }}>
                  Email cannot be changed. Contact support if needed.
                </small>
              </div>

              {formData.role === "student" && (
                <div>
                  <label style={{
                    display: "block",
                    marginBottom: "8px",
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#333"
                  }}>
                    Student ID
                  </label>
                  <input
                    type="text"
                    name="student_id"
                    value={formData.student_id}
                    readOnly
                    style={{
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: "8px",
                    border: "1px solid #e0e0e0",
                    fontSize: "15px",
                    boxSizing: "border-box",
                    backgroundColor: "#f5f5f5",
                    cursor: "not-allowed",
                    color: "#666"
                  }}
                  />
                  <small style={{ color: "#666", fontSize: "12px", marginTop: "4px", display: "block" }}>
                    8-digit student ID number
                  </small>
                </div>
              )}

              {formData.role === "student" && (
                <div>
                  <label style={{
                    display: "block",
                    marginBottom: "8px",
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#333"
                  }}>
                    Birthday
                  </label>
                  <input
                    type="date"
                    name="birthday"
                    value={formData.birthday}
                    onChange={handleChange}
                    max={new Date().toISOString().split('T')[0]}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      borderRadius: "8px",
                      border: "1px solid #e0e0e0",
                      fontSize: "15px",
                      boxSizing: "border-box",
                      transition: "border-color 0.2s"
                    }}
                    onFocus={(e) => e.target.style.borderColor = "var(--teal)"}
                    onBlur={(e) => e.target.style.borderColor = "#e0e0e0"}
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: "14px 24px",
                  backgroundColor: saving ? "#ccc" : "var(--teal)",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "16px",
                  fontWeight: "600",
                  cursor: saving ? "not-allowed" : "pointer",
                  transition: "all 0.2s",
                  marginTop: "8px"
                }}
                onMouseEnter={(e) => {
                  if (!saving) {
                    e.target.style.backgroundColor = "var(--teal-dark)";
                    e.target.style.transform = "translateY(-2px)";
                    e.target.style.boxShadow = "0 4px 12px rgba(0,191,165,0.3)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = saving ? "#ccc" : "var(--teal)";
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow = "none";
                }}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>

          <div style={{
            marginTop: "32px",
            paddingTop: "24px",
            borderTop: "1px solid #e0e0e0"
          }}>
            <h3 style={{
              margin: "0 0 16px 0",
              fontSize: "18px",
              color: "var(--text)",
              fontWeight: "600"
            }}>
              Account Actions
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <button
                onClick={() => setShowPasswordModal(true)}
                style={{
                  padding: "12px 20px",
                  backgroundColor: "#fff",
                  color: "var(--text)",
                  border: "1px solid #e0e0e0",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px"
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = "#f8f9fa";
                  e.target.style.borderColor = "var(--teal)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = "#fff";
                  e.target.style.borderColor = "#e0e0e0";
                }}
              >
                <span style={{ fontSize: "18px" }}>🔒</span>
                <span>Change Password</span>
              </button>

              <button
                onClick={handleSignOut}
                style={{
                  padding: "12px 20px",
                  backgroundColor: "#fff",
                  color: "#d32f2f",
                  border: "1px solid #ffcdd2",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px"
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = "#ffebee";
                  e.target.style.borderColor = "#d32f2f";
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = "#fff";
                  e.target.style.borderColor = "#ffcdd2";
                }}
              >
                <span style={{ fontSize: "18px" }}>🚪</span>
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>

        <div style={{
          backgroundColor: "#f8f9fa",
          borderRadius: "12px",
          padding: "24px",
          marginTop: "24px",
          border: "1px solid #e0e0e0"
        }}>
          <h3 style={{
            margin: "0 0 12px 0",
            fontSize: "16px",
            color: "var(--text)",
            fontWeight: "600"
          }}>
            💡 Profile Tips
          </h3>
          <ul style={{
            margin: "0",
            paddingLeft: "20px",
            color: "#666",
            fontSize: "14px",
            lineHeight: "1.8"
          }}>
            <li>Keep your information up to date for better service</li>
            <li>Your email is used for important notifications</li>
            <li>Contact support if you need to change your email address</li>
            <li>Your information is kept private and secure</li>
          </ul>
        </div>
      </main>

      {showPasswordModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "20px"
        }}>
          <div style={{
            backgroundColor: "white",
            borderRadius: "12px",
            padding: "32px",
            maxWidth: "500px",
            width: "100%",
            maxHeight: "90vh",
            overflowY: "auto",
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)"
          }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "24px"
            }}>
              <h2 style={{
                margin: 0,
                color: "var(--pink)",
                fontSize: "24px",
                fontFamily: "'Playfair Display', serif"
              }}>
                Change Password
              </h2>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordData({
                    currentPassword: "",
                    newPassword: "",
                    confirmPassword: ""
                  });
                  setPasswordError("");
                  setPasswordSuccess("");
                }}
                disabled={changingPassword}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "28px",
                  cursor: changingPassword ? "not-allowed" : "pointer",
                  color: "#999",
                  padding: "0",
                  width: "32px",
                  height: "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: changingPassword ? 0.5 : 1
                }}
              >
                ×
              </button>
            </div>

            {passwordError && (
              <div style={{
                backgroundColor: "#ffebee",
                color: "#c62828",
                padding: "12px 16px",
                borderRadius: "8px",
                marginBottom: "20px",
                fontSize: "14px",
                border: "1px solid #ef9a9a"
              }}>
                {passwordError}
              </div>
            )}

            {passwordSuccess && (
              <div style={{
                backgroundColor: "#e8f5e9",
                color: "#2e7d32",
                padding: "12px 16px",
                borderRadius: "8px",
                marginBottom: "20px",
                fontSize: "14px",
                border: "1px solid #a5d6a7",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}>
                <span>✓</span> {passwordSuccess}
              </div>
            )}

            <form onSubmit={handlePasswordSubmit}>
              <div style={{ display: "grid", gap: "20px" }}>
                <div>
                  <label style={{
                    display: "block",
                    marginBottom: "8px",
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#333"
                  }}>
                    Current Password *
                  </label>
                  <input
                    type="password"
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    required
                    disabled={changingPassword}
                    placeholder="Enter your current password"
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      borderRadius: "8px",
                      border: "1px solid #e0e0e0",
                      fontSize: "15px",
                      boxSizing: "border-box",
                      transition: "border-color 0.2s"
                    }}
                    onFocus={(e) => e.target.style.borderColor = "var(--teal)"}
                    onBlur={(e) => e.target.style.borderColor = "#e0e0e0"}
                  />
                </div>

                <div>
                  <label style={{
                    display: "block",
                    marginBottom: "8px",
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#333"
                  }}>
                    New Password *
                  </label>
                  <input
                    type="password"
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    required
                    disabled={changingPassword}
                    minLength="6"
                    placeholder="Enter your new password"
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      borderRadius: "8px",
                      border: "1px solid #e0e0e0",
                      fontSize: "15px",
                      boxSizing: "border-box",
                      transition: "border-color 0.2s"
                    }}
                    onFocus={(e) => e.target.style.borderColor = "var(--teal)"}
                    onBlur={(e) => e.target.style.borderColor = "#e0e0e0"}
                  />
                  <small style={{ color: "#666", fontSize: "12px", marginTop: "4px", display: "block" }}>
                    Must be at least 8 characters
                  </small>
                </div>

                <div>
                  <label style={{
                    display: "block",
                    marginBottom: "8px",
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#333"
                  }}>
                    Confirm New Password *
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    required
                    disabled={changingPassword}
                    minLength="6"
                    placeholder="Confirm your new password"
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      borderRadius: "8px",
                      border: "1px solid #e0e0e0",
                      fontSize: "15px",
                      boxSizing: "border-box",
                      transition: "border-color 0.2s"
                    }}
                    onFocus={(e) => e.target.style.borderColor = "var(--teal)"}
                    onBlur={(e) => e.target.style.borderColor = "#e0e0e0"}
                  />
                </div>

                <div style={{
                  display: "flex",
                  gap: "12px",
                  marginTop: "8px"
                }}>
                  <button
                    type="submit"
                    disabled={changingPassword}
                    style={{
                      flex: 1,
                      padding: "14px 24px",
                      backgroundColor: changingPassword ? "#ccc" : "var(--teal)",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "16px",
                      fontWeight: "600",
                      cursor: changingPassword ? "not-allowed" : "pointer",
                      transition: "all 0.2s"
                    }}
                  >
                    {changingPassword ? "Changing..." : "Change Password"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordModal(false);
                      setPasswordData({
                        currentPassword: "",
                        newPassword: "",
                        confirmPassword: ""
                      });
                      setPasswordError("");
                      setPasswordSuccess("");
                    }}
                    disabled={changingPassword}
                    style={{
                      flex: 1,
                      padding: "14px 24px",
                      backgroundColor: "#f0f0f0",
                      color: "#666",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "16px",
                      fontWeight: "600",
                      cursor: changingPassword ? "not-allowed" : "pointer",
                      opacity: changingPassword ? 0.5 : 1
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>

            <div style={{
              marginTop: "24px",
              paddingTop: "20px",
              borderTop: "1px solid #e0e0e0"
            }}>
              <h4 style={{
                margin: "0 0 12px 0",
                fontSize: "14px",
                color: "#666",
                fontWeight: "600"
              }}>
                🔐 Password Security Tips:
              </h4>
              <ul style={{
                margin: 0,
                paddingLeft: "20px",
                color: "#999",
                fontSize: "13px",
                lineHeight: "1.6"
              }}>
                <li>Use at least 8 characters</li>
                <li>Mix uppercase and lowercase letters</li>
                <li>Include numbers and special characters</li>
                <li>Don't reuse passwords from other sites</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <Footer />
    </div>
  );
}