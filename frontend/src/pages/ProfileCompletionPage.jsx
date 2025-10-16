import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import "../styles.css";

export default function ProfileCompletionPage({ user, onComplete }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [formData, setFormData] = useState({
    name: "",
    student_id: "",
    birthday: "",
    department: "",
    program: "",
    year_level: ""
  });

  // Department options
  const departments = [
    { value: "CCAS", label: "CCAS - College of Computing, Arts and Sciences" },
    { value: "DENT", label: "DENT - College of Dentistry" },
    { value: "CON", label: "CON - College of Nursing" },
    { value: "CITHM", label: "CITHM - College of International Tourism and Hospitality Management" },
    { value: "CBA", label: "CBA - College of Business Administration" },
    { value: "LIMA", label: "LIMA - Lyceum International Maritime Academy" },
    { value: "CAMP", label: "CAMP - College of Allied Medical Professions" },
    { value: "CCJE", label: "CCJE - College of Criminal Justice Education" },
    { value: "SHS", label: "SHS - Senior High School" }
  ];
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!formData.name || !formData.student_id || !formData.birthday || 
        !formData.department || !formData.program || !formData.year_level) {
      setError("Please fill in all required fields");
      return;
    }

    // Validate student ID (example: must be numeric and 8 digits)
    if (!/^\d{8}$/.test(formData.student_id)) {
      setError("Student ID must be exactly 8 digits");
      return;
    }

    // Validate age (must be at least 13 years old)
    const birthDate = new Date(formData.birthday);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    if (age < 13) {
      setError("You must be at least 13 years old to use this service");
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase
        .from("users")
        .update({
          name: formData.name,
          student_id: formData.student_id,
          birthday: formData.birthday,
          department: formData.department,
          program: formData.program,
          year_level: parseInt(formData.year_level),
          profile_completed: true
        })
        .eq("id", user.id);

      if (updateError) throw updateError;

      // Call the onComplete callback to refresh the profile
      if (onComplete) {
        await onComplete();
      }

      // Navigate to landing page
      navigate("/landing");
    } catch (err) {
      console.error("Error updating profile:", err);
      setError(err.message || "Failed to update profile");
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (window.confirm("Are you sure you want to sign out? Your profile information won't be saved.")) {
      try {
        await supabase.auth.signOut();
        navigate("/");
      } catch (err) {
        console.error("Error signing out:", err);
        // Force navigation even if sign out fails
        navigate("/");
      }
    }
  };

  const handleSkipForNow = () => {
    if (window.confirm("Skip profile completion? You can complete it later, but some features may be limited.")) {
      // Option 1: Sign them out
      handleSignOut();
      
      // Option 2: Let them continue with incomplete profile (uncomment if preferred)
      // navigate("/landing");
    }
  };

  return (
    <div className="auth-page">
      {/* Header with Sign Out button */}
      <div style={{
        position: "absolute",
        top: "20px",
        right: "20px",
        zIndex: 10
      }}>
        <button
          onClick={handleSignOut}
          style={{
            padding: "8px 16px",
            backgroundColor: "transparent",
            color: "var(--pink)",
            border: "2px solid var(--pink)",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "600",
            fontSize: "14px",
            transition: "all 0.2s"
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = "var(--pink)";
            e.target.style.color = "white";
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = "transparent";
            e.target.style.color = "var(--pink)";
          }}
        >
          ← Sign Out
        </button>
      </div>

      <div className="auth-hero">
        <div className="nav-slim">
          <span>Complete Your Profile</span>
        </div>
        
        <div className="hero-content">
          <h1 className="brand-big">Welcome!</h1>
          <p className="hero-sub">
            Let's set up your profile so we can provide you with personalized mental health support.
          </p>
          <p className="hero-sub" style={{ marginTop: "16px", fontSize: "14px", color: "#999" }}>
            Signed in as: <strong>{user?.email}</strong>
          </p>
        </div>
      </div>

      <div className="auth-card" style={{ maxWidth: "500px" }}>
        <div className="card-header">
          <div className="logo-small">Complete Your Profile</div>
          <div className="small-tag">Tell us a bit about yourself</div>
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

        <form onSubmit={handleSubmit} className="login-form">
          <div className="field">
            <label style={{ 
              display: "block", 
              marginBottom: "6px", 
              fontSize: "13px", 
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
              placeholder="Juan Dela Cruz"
              disabled={loading}
              required
            />
          </div>

          <div className="field">
            <label style={{ 
              display: "block", 
              marginBottom: "6px", 
              fontSize: "13px", 
              fontWeight: "600",
              color: "#333"
            }}>
              Student ID *
            </label>
            <input
              type="text"
              name="student_id"
              value={formData.student_id}
              onChange={handleChange}
              placeholder="12345678"
              disabled={loading}
              required
              maxLength="8"
            />
            <small style={{ color: "#666", fontSize: "12px", marginTop: "4px", display: "block" }}>
              8-digit student ID number
            </small>
          </div>

          <div className="field">
            <label style={{ 
              display: "block", 
              marginBottom: "6px", 
              fontSize: "13px", 
              fontWeight: "600",
              color: "#333"
            }}>
              Birthday *
            </label>
            <input
              type="date"
              name="birthday"
              value={formData.birthday}
              onChange={handleChange}
              disabled={loading}
              required
              max={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div className="field">
            <label style={{ 
              display: "block", 
              marginBottom: "6px", 
              fontSize: "13px", 
              fontWeight: "600",
              color: "#333"
            }}>
              Department *
            </label>
            <select
              name="department"
              value={formData.department}
              onChange={handleChange}
              disabled={loading}
              required
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "8px",
                border: "1px solid #e0e0e0",
                fontSize: "14px",
                backgroundColor: "white",
                cursor: "pointer"
              }}
            >
              <option value="">Select your department</option>
              {departments.map(dept => (
                <option key={dept.value} value={dept.value}>
                  {dept.label}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label style={{ 
              display: "block", 
              marginBottom: "6px", 
              fontSize: "13px", 
              fontWeight: "600",
              color: "#333"
            }}>
              Program *
            </label>
            <input
              type="text"
              name="program"
              value={formData.program}
              onChange={handleChange}
              placeholder="e.g., BSIT"
              disabled={loading}
              required
            />
            <small style={{ color: "#666", fontSize: "12px", marginTop: "4px", display: "block" }}>
              Your course or program of study
            </small>
          </div>

          <div className="field">
            <label style={{ 
              display: "block", 
              marginBottom: "6px", 
              fontSize: "13px", 
              fontWeight: "600",
              color: "#333"
            }}>
              Year Level *
            </label>
            <select
              name="year_level"
              value={formData.year_level}
              onChange={handleChange}
              disabled={loading}
              required
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "8px",
                border: "1px solid #e0e0e0",
                fontSize: "14px",
                backgroundColor: "white",
                cursor: "pointer"
              }}
            >
              <option value="">Select your year level</option>
              <option value="1">1st Year</option>
              <option value="2">2nd Year</option>
              <option value="3">3rd Year</option>
              <option value="4">4th Year</option>
              <option value="5">5th Year</option>
              <option value="6">Graduate Level</option>
            </select>
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
            {loading ? "Saving..." : "Complete Profile"}
          </button>
        </form>

        <div style={{ 
          textAlign: "center", 
          marginTop: "16px",
          paddingTop: "16px",
          borderTop: "1px solid #e0e0e0"
        }}>
          <button
            onClick={handleSkipForNow}
            disabled={loading}
            style={{
              background: "none",
              border: "none",
              color: "#999",
              cursor: loading ? "not-allowed" : "pointer",
              textDecoration: "underline",
              fontSize: "13px",
              padding: "0",
              opacity: loading ? 0.6 : 1
            }}
          >
            I'll complete this later
          </button>
        </div>

        <div className="card-footer" style={{ marginTop: 12 }}>
          <a 
            className="link-muted" 
            href="#" 
            onClick={(e) => {
              e.preventDefault();
              alert("Your information is kept private and secure. We only use it to provide personalized mental health support.");
            }}
          >
            Privacy
          </a>
          <a 
            className="link-muted" 
            href="#" 
            onClick={(e) => {
              e.preventDefault();
              alert("Need help? Contact support@hinahon.ph or visit our help center.");
            }}
          >
            Help
          </a>
        </div>
      </div>
    </div>
  );
}