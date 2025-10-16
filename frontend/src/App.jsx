import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import AuthCallback from "./pages/AuthCallback";
import ProfileCompletionPage from "./pages/ProfileCompletionPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import LandingPage from "./pages/LandingPage";
import AdminPage from "./pages/AdminPage";
import CounselorPage from "./pages/CounselorPage";
import ArticlesPage from "./pages/ArticlesPage";
import BookingPage from "./pages/BookingPage";
import AboutPage from "./pages/AboutPage";
import ProfilePage from "./pages/ProfilePage";
import { supabase } from "./supabaseClient";

export default function App() {
  const [session, setSession] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch user profile
  const fetchUserProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Profile fetch error:", error);
        return { id: userId, profile_completed: false, role: 'student' };
      }

      // Auto-complete for counselors/admins
      if ((data.role === 'counselor' || data.role === 'admin') && !data.profile_completed) {
        await supabase
          .from('users')
          .update({ profile_completed: true })
          .eq('id', userId);
        
        return { ...data, profile_completed: true };
      }

      return data;
    } catch (err) {
      console.error("Profile fetch exception:", err);
      return { id: userId, profile_completed: false, role: 'student' };
    }
  };

  // Refresh profile
  const refreshUserProfile = async () => {
    if (session?.user) {
      const profile = await fetchUserProfile(session.user.id);
      setUserProfile(profile);
    }
  };

  // Single useEffect for all auth logic
  useEffect(() => {
    console.log("🚀 App mounted - setting up auth");
    let mounted = true;
    let isInitialized = false;

    // Setup auth listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;

        console.log("🔔 Auth event:", event, "Initialized:", isInitialized);

        // Handle INITIAL_SESSION specially - this is our session!
        if (event === 'INITIAL_SESSION') {
          if (newSession?.user && window.location.pathname !== '/reset-password') {
            console.log("✅ Initial session found:", newSession.user.email);
            setSession(newSession);
            const profile = await fetchUserProfile(newSession.user.id);
            if (mounted) {
              setUserProfile(profile);
            }
          } else {
            console.log("📦 No initial session");
          }
          
          // Mark as initialized and stop loading
          isInitialized = true;
          if (mounted) {
            console.log("✅ Loading complete");
            setLoading(false);
          }
          return;
        }

        // Skip other events until initialized
        if (!isInitialized) {
          console.log("⏭️ Skipping event - not initialized yet");
          return;
        }

        // Skip events on reset password page
        if (window.location.pathname === '/reset-password') {
          if (event === 'USER_UPDATED' || event === 'PASSWORD_RECOVERY') {
            console.log("⏭️ Skipping event - on reset password page");
            return;
          }
        }

        // Handle auth state changes
        switch (event) {
          case 'SIGNED_IN':
            if (newSession?.user) {
              console.log("✅ User signed in:", newSession.user.email);
              setSession(newSession);
              const profile = await fetchUserProfile(newSession.user.id);
              if (mounted) setUserProfile(profile);
            }
            break;

          case 'SIGNED_OUT':
            console.log("👋 User signed out");
            setSession(null);
            setUserProfile(null);
            break;

          case 'TOKEN_REFRESHED':
            if (newSession) {
              console.log("🔄 Token refreshed");
              setSession(newSession);
            }
            break;

          case 'USER_UPDATED':
            if (newSession?.user) {
              console.log("📝 User updated");
              setSession(newSession);
              const profile = await fetchUserProfile(newSession.user.id);
              if (mounted) setUserProfile(profile);
            }
            break;

          default:
            break;
        }
      }
    );

    // Fallback timeout in case INITIAL_SESSION never fires
    const timeoutId = setTimeout(() => {
      if (mounted && !isInitialized) {
        console.warn("⏰ Timeout - forcing loading stop");
        isInitialized = true;
        setLoading(false);
      }
    }, 3000);

    // Cleanup
    return () => {
      console.log("🧹 Cleaning up auth");
      mounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []); // Empty dependency array - only run once

  // Loading screen - show while initializing OR while we have session but no profile yet
  if (loading || (session && !userProfile)) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column',
        gap: '16px',
        backgroundColor: '#fafafa'
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '5px solid #f3f3f3',
          borderTop: '5px solid #e91e63',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{ color: '#666', fontSize: '15px', fontWeight: '500' }}>
          Loading...
        </p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Helper
  const needsProfileCompletion = (profile) => {
    if (!profile) return false;
    if (profile.role !== 'student') return false;
    return !profile.profile_completed;
  };

  console.log("🎨 Rendering routes - Session:", !!session, "Profile:", userProfile?.role);

  return (
    <Router>
      <Routes>
        {/* Login */}
        <Route
          path="/"
          element={
            !session ? (
              <LoginPage setSession={setSession} />
            ) : needsProfileCompletion(userProfile) ? (
              <Navigate to="/profile-completion" replace />
            ) : userProfile?.role === "admin" ? (
              <Navigate to="/admin" replace />
            ) : userProfile?.role === "counselor" ? (
              <Navigate to="/counselor" replace />
            ) : (
              <Navigate to="/landing" replace />
            )
          }
        />

        {/* Reset Password */}
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Auth Callback */}
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* Profile Completion */}
        <Route
          path="/profile-completion"
          element={
            session && userProfile && needsProfileCompletion(userProfile) ? (
              <ProfileCompletionPage 
                user={session.user} 
                onComplete={refreshUserProfile}
              />
            ) : !session ? (
              <Navigate to="/" replace />
            ) : userProfile?.role === "admin" ? (
              <Navigate to="/admin" replace />
            ) : userProfile?.role === "counselor" ? (
              <Navigate to="/counselor" replace />
            ) : (
              <Navigate to="/landing" replace />
            )
          }
        />

        {/* Landing Page */}
        <Route
          path="/landing"
          element={
            session && userProfile?.profile_completed && userProfile.role === "student" ? (
              <LandingPage session={session} setSession={setSession} />
            ) : !session ? (
              <Navigate to="/" replace />
            ) : needsProfileCompletion(userProfile) ? (
              <Navigate to="/profile-completion" replace />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        {/* Articles */}
        <Route
          path="/articles"
          element={
            session && userProfile ? (
              <ArticlesPage session={session} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/articles/:emotion"
          element={
            session && userProfile ? (
              <ArticlesPage session={session} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        {/* Booking */}
        <Route
          path="/booking"
          element={
            session && userProfile?.profile_completed && userProfile.role === "student" ? (
              <BookingPage session={session} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        {/* Counselor */}
        <Route
          path="/counselor"
          element={
            session && userProfile?.role === "counselor" ? (
              <CounselorPage />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        {/* Admin */}
        <Route
          path="/admin"
          element={
            session && userProfile?.role === "admin" ? (
              <AdminPage />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        {/* About */}
        <Route
          path="/about"
          element={
            session && userProfile ? (
              <AboutPage session={session} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        {/* Profile */}
        <Route
          path="/profile"
          element={
            session && userProfile ? (
              <ProfilePage session={session} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}