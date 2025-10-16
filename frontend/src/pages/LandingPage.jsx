import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Footer from '../components/Footer';
import { checkVideoLinkAccess, getConsultationStatusBadge } from "../utils/consultationTimeUtils";
import logomark from "../assets/hinahon2.png";
import logo from "../assets/hinahon.png";
import logo1 from "../assets/lpunigga.png";
import logo2 from "../assets/catc.png";
import bgImage2 from "../assets/bg-lotus.jpg";
import "../styles.css";

export default function LandingPage({ session, setSession }) {
  const navigate = useNavigate();
  const user = session?.user;

  const [selectedEmotion, setSelectedEmotion] = useState(null);
  const [allConsultations, setAllConsultations] = useState([]);
  const [displayedConsultations, setDisplayedConsultations] = useState([]);
  const [loadingConsultations, setLoadingConsultations] = useState(true);
  const [userName, setUserName] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [showBookingsModal, setShowBookingsModal] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [pendingEmotion, setPendingEmotion] = useState(null);
  const [hasConsented, setHasConsented] = useState(false);
  const [hasOngoingConsultation, setHasOngoingConsultation] = useState(false);
  
  const observerTarget = useRef(null);
  const ITEMS_PER_PAGE = 3;

  useEffect(() => {
    if (user) {
      fetchUserName();
      fetchConsultations();
      checkConsentStatus();
    }
  }, [user]);

  // Setup intersection observer for infinite scroll in modal
  useEffect(() => {
    if (!showBookingsModal) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          loadMoreConsultations();
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [showBookingsModal, hasMore, isLoadingMore, displayedConsultations.length]);

  const fetchUserName = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("name")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      setUserName(data?.name || user.email?.split("@")[0] || "User");
    } catch (err) {
      console.error("Error fetching user name:", err);
      setUserName(user.email?.split("@")[0] || "User");
    }
  };

  const checkConsentStatus = () => {
    try {
      const consentKey = `tele_counseling_consent_${user.id}`;
      const consentStatus = localStorage.getItem(consentKey);
      if (consentStatus === 'accepted') {
        setHasConsented(true);
      }
    } catch (err) {
      console.error("Error checking consent status:", err);
    }
  };

  const fetchConsultations = async () => {
    try {
      const { data, error } = await supabase
        .from("consultations")
        .select(`
          id,
          date,
          time,
          status,
          video_link,
          reason,
          rejection_reason,
          meeting_ended,
          start_time,
          end_time,
          counselor:counselor_id(name, email)
        `)
        .eq("student_id", user.id)
        .order("date", { ascending: true })
        .order("time", { ascending: true });

      if (error) throw error;
      
      const sortedConsultations = prioritizeConsultations(data || []);
      
      // Check if there's any ongoing consultation
      const hasOngoing = sortedConsultations.some(consultation => {
        const accessInfo = checkVideoLinkAccess(consultation.date, consultation.time);
        return consultation.status === 'accepted' && 
               !consultation.meeting_ended && 
               accessInfo.canAccess && 
               accessInfo.reason === 'active';
      });
      setHasOngoingConsultation(hasOngoing);
      
      setAllConsultations(sortedConsultations);
      setDisplayedConsultations(sortedConsultations.slice(0, ITEMS_PER_PAGE));
      setHasMore(sortedConsultations.length > ITEMS_PER_PAGE);
    } catch (err) {
      console.error("Error fetching consultations:", err);
    } finally {
      setLoadingConsultations(false);
    }
  };

  const prioritizeConsultations = (consultations) => {
    const categorized = consultations.map(consultation => {
      const accessInfo = checkVideoLinkAccess(consultation.date, consultation.time);
      const consultDate = new Date(`${consultation.date}T${consultation.time}`);
      
      let priority = 0;
      let category = '';
      
      if (consultation.status === 'accepted' && !consultation.meeting_ended && accessInfo.canAccess && accessInfo.reason === 'active') {
        priority = 1;
        category = 'ongoing';
      }
      else if (consultation.status === 'pending') {
        priority = 2;
        category = 'pending';
      }
      else if (consultation.status === 'accepted' && !consultation.meeting_ended && accessInfo.reason === 'not_started') {
        priority = 3;
        category = 'upcoming';
      }
      else if (consultation.meeting_ended || consultation.status === 'completed') {
        priority = 5;
        category = 'completed';
      }
      else {
        priority = 4;
        category = 'past';
      }
      
      return { ...consultation, priority, category, consultDate, accessInfo };
    });
    
    // Sort by date descending (newest first)
    return categorized.sort((a, b) => {
      return b.consultDate - a.consultDate;
    });
  };

  const loadMoreConsultations = () => {
    if (isLoadingMore) return;
    
    setIsLoadingMore(true);
    
    setTimeout(() => {
      const currentLength = displayedConsultations.length;
      const nextBatch = allConsultations.slice(
        currentLength,
        currentLength + ITEMS_PER_PAGE
      );
      
      setDisplayedConsultations(prev => [...prev, ...nextBatch]);
      setHasMore(currentLength + ITEMS_PER_PAGE < allConsultations.length);
      setIsLoadingMore(false);
    }, 300);
  };

  async function handleSignOut() {
    await supabase.auth.signOut();
    setSession(null);
    navigate("/");
  }

  const emotions = [
    { label: "Happy", icon: "🙂", tag: "happy" },
    { label: "Sad", icon: "😢", tag: "sad" },
    { label: "Angry", icon: "😡", tag: "angry" },
    { label: "Scared", icon: "😨", tag: "scared" },
    { label: "Worried", icon: "😟", tag: "worried" },
    { label: "Tired", icon: "😴", tag: "tired" },
    { label: "Disgusted", icon: "🤢", tag: "disgusted" },
    { label: "Overwhelmed", icon: "😵", tag: "overwhelmed" },
  ];

  function handleBookAppointment() {
    const emotion = emotions.find(e => e.label === selectedEmotion);
    const emotionTag = emotion?.tag || 'general';
    
    // Check if user has already consented
    if (hasConsented) {
      // Skip consent modal and go directly to booking
      navigate('/booking', { state: { emotion: emotionTag } });
    } else {
      // Show consent modal for first-time users
      setPendingEmotion(emotionTag);
      setShowConsentModal(true);
    }
  }

  function handleConsentAccept() {
    try {
      // Save consent to localStorage
      const consentKey = `tele_counseling_consent_${user.id}`;
      localStorage.setItem(consentKey, 'accepted');
      setHasConsented(true);
    } catch (err) {
      console.error("Error saving consent:", err);
    }
    
    setShowConsentModal(false);
    navigate('/booking', { state: { emotion: pendingEmotion } });
  }

  function handleConsentReject() {
    setShowConsentModal(false);
    setPendingEmotion(null);
  }

  function handleReadArticles() {
    const emotion = emotions.find(e => e.label === selectedEmotion);
    const emotionTag = emotion?.tag || 'happy';
    navigate(`/articles/${emotionTag}`);
  }

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  const formatTime = (timeStr) => {
    const [hours, minutes] = timeStr.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getStatusColor = (status, date, time) => {
    return getConsultationStatusBadge(status, date, time);
  };

  return (
    
<div
  className="landing-root"
  style={{
    minHeight: "100vh",
    backgroundImage: `
      radial-gradient(
        circle at center,
        rgba(255,255,255,0) 100%    /* fully transparent edges */
      ),
      url(${bgImage2})
    `,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
  }}
>
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
      A Mental Health Booking Solution
    </div>
  </div>
</div>

        <div className="header-right">
          <nav style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <button
              onClick={() => navigate("/about")}
              style={{
                background: "none",
                border: "none",
                color: "#666",
                cursor: "pointer",
                font: "inherit",
                fontSize: "15px",
                fontWeight: "500",
                padding: "8px 12px",
                borderRadius: "6px",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = "#f5f5f5";
                e.target.style.color = "var(--pink)";
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = "transparent";
                e.target.style.color = "#666";
              }}
            >
              About
            </button>
            <button
              onClick={() => navigate("/articles")}
              style={{
                background: "none",
                border: "none",
                color: "#666",
                cursor: "pointer",
                font: "inherit",
                fontSize: "15px",
                fontWeight: "500",
                padding: "8px 12px",
                borderRadius: "6px",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = "#f5f5f5";
                e.target.style.color = "var(--teal)";
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = "transparent";
                e.target.style.color = "#666";
              }}
            >
              Articles
            </button>
          </nav>

          <button
            className="btn-profile"
            onClick={() => navigate("/profile")}
          >
            Profile
          </button>
          <button className="btn-logout" onClick={handleSignOut}>
            Sign Out
          </button>
        </div>
      </header>

      <main className="landing-hero">
        <div className="hero-inner">
          <div className="greeting">
            <div className="greet-small">
              Hello, <span style={{color:  "#c71e70ff" }}>{userName}</span> !
            </div>

            <h2 className="brand-display" style={{ marginTop: 10, marginLeft: 15}}>
              Welcome Back!
            </h2>

            <p className="hero-note" style={{ marginLeft: 30 }}>
                We're glad you're here! This is your safe space to reflect and feel supported.
            </p>

            <div className="emotion-section">
              <div className="feeling-ask" style={{ marginRight: 25 }}>How are you feeling today?</div>

              <div className="emotions-grid" role="list" aria-label="Emotions">
                {emotions.map((e) => (
                  <button
                    key={e.label}
                    className={`emotion ${selectedEmotion === e.label ? "selected" : ""}`}
                    type="button"
                    onClick={() => setSelectedEmotion(e.label)}
                    aria-label={`Select ${e.label} emotion`}
                  >
                    <div className="emotion-circle">{e.icon}</div>
                    <div className="emotion-label">{e.label}</div>
                  </button>
                ))}
              </div>

              <div className="post-actions">
                {selectedEmotion && (
                  <p className="selected-note" style={{ marginRight: 35 }}>
                    You're feeling <strong>{selectedEmotion}</strong>. Take a breath — what feels right for you next?”
                  </p>
                )}
                <div className="action-buttons">
                  {/* Always visible */}
                  <button
                    className="btn-action view-bookings"
                    onClick={() => setShowBookingsModal(true)}
                  >
                    📋 Check my Bookings
                    {hasOngoingConsultation && (
                      <span className="ongoing-indicator">
                        <span className="pulse-dot"></span>
                        ACTIVE NOW
                      </span>
                    )}
                  </button>
                  
                  {/* Only show when emotion is selected */}
                  {selectedEmotion && (
                    <>
                      <button
                        className="btn-action primary"
                        onClick={handleBookAppointment}
                      >
                        📅 Talk to Someone
                      </button>
                      <button
                        className="btn-action secondary"
                        onClick={handleReadArticles}
                      >
                        📖 Find Helpful Reads
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* Bookings Modal */}
      {showBookingsModal && (
        <div className="modal-overlay" onClick={() => setShowBookingsModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>💬 Your Consultations</h3>
              <button 
                className="modal-close"
                onClick={() => setShowBookingsModal(false)}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <div className="modal-content">
              {loadingConsultations ? (
                <p style={{ color: "#666", fontSize: "14px", textAlign: "center", padding: "20px" }}>
                  Loading...
                </p>
              ) : allConsultations.length === 0 ? (
                <div style={{ 
                  textAlign: "center", 
                  padding: "40px 20px",
                  color: "#666"
                }}>
                  <div style={{ fontSize: "48px", marginBottom: "16px" }}>📅</div>
                  <p style={{ fontSize: "16px", marginBottom: "8px", fontWeight: "500" }}>
                    No consultations yet
                  </p>
                  <p style={{ fontSize: "14px", color: "#999" }}>
                    Book your first appointment to get started!
                  </p>
                </div>
              ) : (
                <>
                  <div className="consultations-list">
                    {displayedConsultations.map((consultation) => {
                      const statusInfo = getStatusColor(consultation.status, consultation.date, consultation.time);
                      const accessInfo = consultation.accessInfo || checkVideoLinkAccess(consultation.date, consultation.time);
                      
                      return (
                        <div key={consultation.id} className="consultation-card">
                          <div className="consultation-header">
                            <div>
                              <div className="counselor-name">
                                {consultation.counselor?.name || consultation.counselor?.email || "Counselor"}
                              </div>
                              <div className="consultation-datetime">
                                📅 {formatDate(consultation.date)} • 🕐 {formatTime(consultation.time)}
                              </div>
                            </div>
                            <span className="status-badge" style={{
                              backgroundColor: statusInfo.bg,
                              color: statusInfo.color
                            }}>
                              {statusInfo.text}
                            </span>
                          </div>

                          {consultation.reason && (
                            <div className="consultation-reason">
                              <p className="reason-label">Reason:</p>
                              <p className="reason-text">{consultation.reason}</p>
                            </div>
                          )}

                          {consultation.status === "rejected" && consultation.rejection_reason && (
                            <div className="rejection-reason">
                              <p className="reason-label">Rejection Reason:</p>
                              <p className="reason-text">{consultation.rejection_reason}</p>
                            </div>
                          )}

                          {consultation.status === "accepted" && consultation.video_link && !consultation.meeting_ended && (
                            <>
                              {accessInfo.canAccess ? (
                                <div>
                                  <a
                                    href={consultation.video_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="video-link-button"
                                  >
                                    🎥 Join Video Call
                                  </a>
                                  <p className="access-message success">
                                    {accessInfo.message}
                                  </p>
                                </div>
                              ) : (
                                <div>
                                  <button disabled className="video-link-button disabled">
                                    🎥 Join Video Call
                                  </button>
                                  <p className={`access-message ${accessInfo.reason === 'expired' ? 'error' : 'warning'}`}>
                                    {accessInfo.message}
                                  </p>
                                </div>
                              )}
                            </>
                          )}

                          {consultation.status === "pending" && (
                            <p className="access-message warning">
                              Waiting for counselor to accept...
                            </p>
                          )}

                          {consultation.meeting_ended && (
                            <p className="access-message completed">
                              ✅ Meeting completed
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {hasMore && (
                    <div ref={observerTarget} className="load-more-trigger">
                      {isLoadingMore ? (
                        <div className="loading-spinner">
                          <div className="spinner" />
                          Loading more...
                        </div>
                      ) : (
                        "Scroll for more"
                      )}
                    </div>
                  )}

                  {!hasMore && displayedConsultations.length > ITEMS_PER_PAGE && (
                    <div className="no-more-items">
                      No more consultations
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Informed Consent Modal */}
      {showConsentModal && (
        <div className="modal-overlay" onClick={handleConsentReject}>
          <div className="modal-container consent-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Informed Consent for Tele-Counseling</h3>
              <button 
                className="modal-close"
                onClick={handleConsentReject}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <div className="modal-content">
              <div className="consent-content">
                <div className="consent-icon">
                  📋
                </div>
                
                <div className="consent-text">
                  <p>
                    By proceeding with this booking, I acknowledge and agree to the following:
                  </p>
                  
                  <ul className="consent-list">
                    <li>
                      I am <strong>willing to undergo tele-counseling</strong> services through this platform.
                    </li>
                    <li>
                      I understand that I will be <strong>disclosing my concerns or problems</strong> with my guidance counselor.
                    </li>
                    <li>
                      I consent to participate in online counseling sessions and understand the nature of virtual mental health services.
                    </li>
                    <li>
                      I understand that all information shared will be kept confidential in accordance with professional guidelines.
                    </li>
                  </ul>

                  <p className="consent-note">
                    Please click "I Accept" if you agree to proceed with booking your counseling session.
                  </p>
                </div>
              </div>

              <div className="consent-actions">
                <button 
                  className="btn-consent reject"
                  onClick={handleConsentReject}
                >
                  I Decline
                </button>
                <button 
                  className="btn-consent accept"
                  onClick={handleConsentAccept}
                >
                  I Accept
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}