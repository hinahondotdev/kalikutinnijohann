import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Footer from '../components/Footer';
import { filterExpiredSlots, isSlotExpired } from "../utils/availabilityUtils";
import logomark from "../assets/hinahon2.png";
import "../styles.css";

export default function BookingPage({ session }) {
  const navigate = useNavigate();
  const location = useLocation();
  
  const emotion = location.state?.emotion || 'general';
  
  const [counselorsWithSlots, setCounselorsWithSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isGuest = session?.isGuest;
  const user = session?.user;

  const emotionDisplay = {
    happy: { label: "Happy", icon: "🙂" },
    sad: { label: "Sad", icon: "😢" },
    angry: { label: "Angry", icon: "😡" },
    scared: { label: "Scared", icon: "😨" },
    worried: { label: "Worried", icon: "😟" },
    tired: { label: "Tired", icon: "😴" },
    disgusted: { label: "Disgusted", icon: "🤢" },
    overwhelmed: { label: "Overwhelmed", icon: "😵" },
    general: { label: "General Concern", icon: "💬" }
  };

  const currentEmotion = emotionDisplay[emotion] || emotionDisplay.general;

  useEffect(() => {
    console.log("BookingPage loaded with emotion:", emotion);
    fetchCounselorsWithAvailability();
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      console.log("Auto-refreshing counselor availability...");
      fetchCounselorsWithAvailability();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchCounselorsWithAvailability = async () => {
    try {
      setLoading(true);
      setError("");
      const today = new Date().toISOString().split('T')[0];
      
      console.log("=== FETCHING COUNSELORS WITH TODAY'S AVAILABILITY ===");
      console.log("Today's date:", today);

      // Fetch all counselors with photo, license, and department info
      const { data: counselorsData, error: counselorsError } = await supabase
        .from("users")
        .select("id, name, email, photo_url, license, department")
        .eq("role", "counselor");

      if (counselorsError) throw counselorsError;
      console.log("Counselors fetched:", counselorsData);

      // Fetch today's availability slots (unbooked and not expired)
      const { data: availabilityData, error: availabilityError } = await supabase
        .from("availability")
        .select("id, start_time, end_time, counselor_id, is_booked, date")
        .eq("date", today)
        .eq("is_booked", false)
        .order("start_time");

      if (availabilityError) throw availabilityError;
      console.log("Available slots for today:", availabilityData);

      // Filter out expired slots
      const activeSlots = filterExpiredSlots(availabilityData || []);
      console.log("Active (non-expired) slots:", activeSlots);

      // Map counselors with their available slots
      const counselorsWithAvailableSlots = counselorsData.map(counselor => {
        const slots = activeSlots.filter(slot => slot.counselor_id === counselor.id);
        return {
          ...counselor,
          availableSlots: slots
        };
      }).filter(counselor => counselor.availableSlots.length > 0);

      console.log("Counselors with available slots:", counselorsWithAvailableSlots);

      if (counselorsWithAvailableSlots.length === 0) {
        setError("No counselors have available time slots for today. Please check back tomorrow or contact support.");
      }

      setCounselorsWithSlots(counselorsWithAvailableSlots);
    } catch (err) {
      console.error("Error fetching counselors:", err);
      setError("Failed to load available counselors. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSlotSelect = (counselorId, slot) => {
    setSelectedSlot({ counselorId, slotId: slot.id, slot });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isGuest) {
      alert("Please sign in to book a consultation");
      navigate("/");
      return;
    }

    if (!selectedSlot) {
      setError("Please select a time slot");
      return;
    }

    setLoading(true);
    setError("");

    try {
      console.log("=== BOOKING PROCESS STARTED ===");
      console.log("Selected slot:", selectedSlot);

      // Verify slot is still available
      const { data: slotCheck, error: checkError } = await supabase
        .from("availability")
        .select("id, date, start_time, end_time, counselor_id, is_booked")
        .eq("id", selectedSlot.slotId)
        .single();

      if (checkError || !slotCheck) {
        throw new Error("Failed to verify slot availability");
      }

      // Check if slot has expired
      if (isSlotExpired(slotCheck.date, slotCheck.start_time)) {
        setError("Sorry, this time slot has already passed. Please select another time.");
        setSelectedSlot(null);
        await fetchCounselorsWithAvailability();
        setLoading(false);
        return;
      }

      // Check if slot is already booked
      if (slotCheck.is_booked === true) {
        setError("Sorry, this slot was just booked by someone else. Please select another time.");
        setSelectedSlot(null);
        await fetchCounselorsWithAvailability();
        setLoading(false);
        return;
      }

      console.log("✅ Slot is available, proceeding with booking...");

      // Mark slot as booked
      const { error: updateError } = await supabase
        .from("availability")
        .update({ is_booked: true })
        .eq("id", selectedSlot.slotId)
        .eq("is_booked", false);

      if (updateError) {
        throw new Error("Failed to reserve time slot");
      }

      // Create consultation
      const { data: consultationData, error: consultationError } = await supabase
        .from("consultations")
        .insert({
          student_id: user.id,
          counselor_id: slotCheck.counselor_id,
          date: slotCheck.date,
          time: slotCheck.start_time,
          status: "pending",
          availability_id: selectedSlot.slotId,
          reason: emotion
        })
        .select()
        .single();

      if (consultationError) {
        // Rollback: unmark the slot
        await supabase
          .from("availability")
          .update({ is_booked: false })
          .eq("id", selectedSlot.slotId);
        
        throw new Error("Failed to create consultation");
      }

      console.log("✅ Consultation created:", consultationData);

      // Try to send email notifications
      try {
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/bookings/notify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            consultationId: consultationData.id
          })
        });

        if (response.ok) {
          console.log('✅ Email notifications sent successfully');
        }
      } catch (emailErr) {
        console.warn('⚠️ Email notification error (booking still successful):', emailErr);
      }

      alert(`✅ Consultation request submitted successfully!\n\nReason: ${currentEmotion.icon} ${currentEmotion.label}\n\nYou will receive an email notification once the counselor responds.`);
      navigate("/landing");

    } catch (err) {
      console.error("❌ Error booking consultation:", err);
      setError(`Failed to book consultation: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timeString) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    });
  };

  if (loading && counselorsWithSlots.length === 0) {
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
      Talk to a Professional Counselor
    </div>
  </div>
</div>
        </header>
        <main style={{ padding: "40px 24px", textAlign: "center" }}>
          <div style={{ marginTop: "100px" }}>
            <div style={{ 
              display: "inline-block",
              width: "50px",
              height: "50px",
              border: "4px solid #f3f3f3",
              borderTop: "4px solid var(--teal)",
              borderRadius: "50%",
              animation: "spin 1s linear infinite"
            }}></div>
            <p style={{ marginTop: "20px", color: "#666" }}>
              Loading available counselors...
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="landing-root">
      <header className="landing-header">
        <div className="header-left">
          <div className="logo-top">Hinahon</div>
          <div className="tagline-mini">Book a Consultation</div>
        </div>
        <div className="header-right">
          <button 
            onClick={() => navigate("/landing")}
            style={{ 
              background: "none", 
              border: "none", 
              color: "#666", 
              cursor: "pointer",
              font: "inherit"
            }}
          >
            ← Back to Home
          </button>
        </div>
      </header>

      <main style={{ padding: "40px 24px", maxWidth: "1400px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <h1 style={{ color: "var(--pink)", fontSize: "36px", margin: "0 0 12px 0" }}>
            Book Your Consultation
          </h1>
          <div style={{ 
            display: "inline-flex", 
            alignItems: "center", 
            gap: "12px",
            backgroundColor: "#f0f9ff",
            padding: "12px 24px",
            borderRadius: "12px",
            marginTop: "16px"
          }}>
            <span style={{ fontSize: "32px" }}>{currentEmotion.icon}</span>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: "12px", color: "#666", fontWeight: "600" }}>
                CONSULTATION REASON
              </div>
              <div style={{ fontSize: "18px", color: "#333", fontWeight: "700" }}>
                {currentEmotion.label}
              </div>
            </div>
          </div>
          <p style={{ marginTop: "16px", color: "#666", fontSize: "14px" }}>
            📅 Showing available counselors for <strong>today</strong>
          </p>
        </div>

        {isGuest ? (
          <div style={{ 
            textAlign: "center", 
            padding: "40px", 
            backgroundColor: "#f9f9f9", 
            borderRadius: "12px",
            margin: "20px 0"
          }}>
            <h3 style={{ color: "var(--pink)", marginBottom: "16px" }}>
              Sign In Required
            </h3>
            <p style={{ marginBottom: "20px", color: "#666" }}>
              You need to sign in to book a consultation with our counselors.
            </p>
            <button
              onClick={() => navigate("/")}
              style={{
                padding: "12px 32px",
                backgroundColor: "var(--teal)",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "16px",
                fontWeight: "600",
                cursor: "pointer"
              }}
            >
              Go to Login
            </button>
          </div>
        ) : error && counselorsWithSlots.length === 0 ? (
          <div style={{
            textAlign: "center",
            padding: "40px",
            backgroundColor: "#fff3cd",
            borderRadius: "12px",
            border: "1px solid #ffc107"
          }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>😔</div>
            <h3 style={{ color: "#856404", marginBottom: "12px" }}>
              No Available Slots
            </h3>
            <p style={{ color: "#856404", marginBottom: "20px" }}>
              {error}
            </p>
            <button
              onClick={() => navigate("/landing")}
              style={{
                padding: "12px 24px",
                backgroundColor: "var(--teal)",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "600"
              }}
            >
              Back to Home
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && (
              <div style={{
                padding: "12px",
                backgroundColor: "#ffebee",
                color: "#c62828",
                borderRadius: "8px",
                marginBottom: "20px",
                border: "1px solid #f5c6cb"
              }}>
                {error}
              </div>
            )}

            <div style={{
              display: "flex",
              flexDirection: "column",
              gap: "24px",
              marginBottom: selectedSlot ? "100px" : "24px"
            }}>
              {counselorsWithSlots.map(counselor => (
                <div
                  key={counselor.id}
                  style={{
                    backgroundColor: "white",
                    borderRadius: "16px",
                    padding: "32px",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08), 0 8px 24px rgba(0, 191, 165, 0.12)",
                    borderBottom: "10px solid var(--teal)",
                    transition: "all 0.3s ease",
                    background: "linear-gradient(135deg, #ffffff 0%, #fafffe 100%)",
                    minHeight: "380px",
                    display: "flex",
                    alignItems: "stretch"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.1), 0 12px 32px rgba(0, 191, 165, 0.18)";
                    e.currentTarget.style.transform = "translateY(-2px)";
                    //e.currentTarget.style.borderColor = "rgba(0, 191, 165, 0.4)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.08), 0 8px 24px rgba(0, 191, 165, 0.12)";
                    e.currentTarget.style.transform = "translateY(0)";
                    //e.currentTarget.style.borderColor = "rgba(0, 191, 165, 0.2)";
                  }}
                >
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "240px 1fr",
                    gap: "32px",
                    width: "100%"
                  }}>
                    {/* LEFT: Counselor Photo */}
                    <div style={{ 
                      display: "flex", 
                      alignItems: "flex-start",
                      justifyContent: "center"
                    }}>
                      {counselor.photo_url ? (
                        <img
                          src={counselor.photo_url}
                          alt={counselor.name || counselor.email}
                          style={{
                            width: "240px",
                            height: "316px",
                            objectFit: "cover",
                            borderRadius: "12px",
                            border: "2px solid #00bfa5",
                            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.1)"
                          }}
                        />
                      ) : (
                        <div style={{
                          width: "240px",
                          height: "316px",
                          borderRadius: "12px",
                          backgroundColor: "#00bfa5",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "white",
                          fontSize: "84px",
                          fontWeight: "700",
                          border: "2px solid #00bfa5",
                          boxShadow: "0 4px 16px rgba(0, 0, 0, 0.1)"
                        }}>
                          {(counselor.name || counselor.email).charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* RIGHT SIDE: Details and Slots */}
                    <div style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "20px"
                    }}>
                      {/* TOP RIGHT: Counselor Details */}
                      <div style={{
                        paddingBottom: "20px",
                        borderBottom: "2px solid rgba(0, 191, 165, 0.15)"
                      }}>
                        <div style={{
                          fontSize: "16px",
                          color: "#00bfa5",
                          fontWeight: "700",
                          textTransform: "uppercase",
                          letterSpacing: "1.2px",
                          marginBottom: "6px"
                        }}>
                          {counselor.department ? `Counselor - ${counselor.department}` : 'Counselor'}
                        </div>
                        <h2 style={{
                          margin: "0 0 6px 0",
                          color: "#e91e63",
                          fontSize: "34px",
                          fontWeight: "700",
                          lineHeight: "1.1"
                        }}>
                          {counselor.name || counselor.email}
                        </h2>
                        {counselor.license && (
                          <p style={{
                            margin: "0",
                            color: "#666",
                            fontSize: "17px",
                            fontWeight: "500",
                            lineHeight: "1.4"
                          }}>
                            {counselor.license}
                          </p>
                        )}
                      </div>

                      {/* BOTTOM RIGHT: Available Slots */}
                      <div style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column"
                      }}>
                        <h4 style={{
                          margin: "0 0 14px 0",
                          color: "#333",
                          fontSize: "14px",
                          fontWeight: "700",
                          textTransform: "uppercase",
                          letterSpacing: "0.8px"
                        }}>
                          AVAILABLE TODAY
                        </h4>
                        <div style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(5, 1fr)",
                          gap: "10px",
                          alignContent: "start",
                          minHeight: "180px"
                        }}>
                          {counselor.availableSlots.map(slot => {
                            const isSelected = selectedSlot?.slotId === slot.id;
                            return (
                              <button
                                key={slot.id}
                                type="button"
                                onClick={() => handleSlotSelect(counselor.id, slot)}
                                style={{
                                  padding: "14px 8px",
                                  border: isSelected ? "2px solid #00bfa5" : "1px solid #e0e0e0",
                                  borderRadius: "8px",
                                  backgroundColor: isSelected ? "#00bfa5" : "white",
                                  color: isSelected ? "white" : "#333",
                                  cursor: "pointer",
                                  fontSize: "12px",
                                  fontWeight: isSelected ? "700" : "600",
                                  transition: "all 0.2s ease",
                                  textAlign: "center",
                                  boxShadow: isSelected ? "0 2px 8px rgba(0, 191, 165, 0.3)" : "0 1px 3px rgba(0, 0, 0, 0.08)",
                                  minHeight: "50px",
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "center",
                                  justifyContent: "center"
                                }}
                                onMouseEnter={(e) => {
                                  if (!isSelected) {
                                    e.currentTarget.style.borderColor = "#00bfa5";
                                    e.currentTarget.style.backgroundColor = "#f0f9ff";
                                    e.currentTarget.style.transform = "scale(1.05)";
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!isSelected) {
                                    e.currentTarget.style.borderColor = "#e0e0e0";
                                    e.currentTarget.style.backgroundColor = "white";
                                    e.currentTarget.style.transform = "scale(1)";
                                  }
                                }}
                              >
                                {formatTime(slot.start_time)}
                                <br />
                                <span style={{ fontSize: "11px", opacity: 0.8 }}>
                                  - {formatTime(slot.end_time)}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Fixed Bottom Confirmation Bar */}
            {selectedSlot && (
              <div style={{
                position: "fixed",
                bottom: 0,
                left: 0,
                right: 0,
                backgroundColor: "white",
                padding: "20px 24px",
                boxShadow: "0 -4px 20px rgba(0, 0, 0, 0.15)",
                zIndex: 100,
                animation: "slideUp 0.3s ease",
                borderTop: "3px solid #00bfa5"
              }}>
                <div style={{
                  maxWidth: "1400px",
                  margin: "0 auto",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "20px",
                  flexWrap: "wrap"
                }}>
                  <div>
                    <div style={{ fontSize: "14px", color: "#666", marginBottom: "4px" }}>
                      Selected Appointment
                    </div>
                    <div style={{ fontSize: "18px", fontWeight: "700", color: "#333" }}>
                      {counselorsWithSlots.find(c => c.id === selectedSlot.counselorId)?.name || 'Counselor'} •{' '}
                      {formatTime(selectedSlot.slot.start_time)} - {formatTime(selectedSlot.slot.end_time)}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "12px" }}>
                    <button
                      type="button"
                      onClick={() => setSelectedSlot(null)}
                      style={{
                        padding: "14px 28px",
                        backgroundColor: "white",
                        color: "#666",
                        border: "2px solid #e0e0e0",
                        borderRadius: "12px",
                        fontSize: "16px",
                        fontWeight: "700",
                        cursor: "pointer",
                        transition: "all 0.3s ease"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#f5f5f5";
                        e.currentTarget.style.borderColor = "#999";
                        e.currentTarget.style.color = "#333";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "white";
                        e.currentTarget.style.borderColor = "#e0e0e0";
                        e.currentTarget.style.color = "#666";
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      style={{
                        padding: "14px 32px",
                        backgroundColor: loading ? "#ccc" : "#00bfa5",
                        color: "white",
                        border: "none",
                        borderRadius: "12px",
                        fontSize: "16px",
                        fontWeight: "700",
                        cursor: loading ? "not-allowed" : "pointer",
                        boxShadow: "0 4px 12px rgba(0, 191, 165, 0.3)",
                        transition: "all 0.3s ease"
                      }}
                      onMouseEnter={(e) => {
                        if (!loading) {
                          e.currentTarget.style.transform = "translateY(-2px)";
                          e.currentTarget.style.boxShadow = "0 6px 16px rgba(0, 191, 165, 0.4)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 191, 165, 0.3)";
                      }}
                    >
                      {loading ? "Booking..." : "Confirm Booking"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </form>
        )}
      </main>

      <style>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          [style*="gridTemplateColumns: \"auto 1fr\""] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <Footer />
    </div>
  );
}