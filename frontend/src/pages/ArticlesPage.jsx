import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Footer from '../components/Footer';
import logomark from "../assets/hinahon2.png";
import "../styles.css";

export default function ArticlesPage({ session }) {
  const { emotion } = useParams();
  const navigate = useNavigate();
  const [articles, setArticles] = useState([]);
  const [filteredArticles, setFilteredArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState(emotion || "all");
  const [showDropdown, setShowDropdown] = useState(false);

  const emotionFilters = [
    { label: "All", value: "all", icon: "📚" },
    { label: "Happy", value: "happy", icon: "🙂" },
    { label: "Sad", value: "sad", icon: "😢" },
    { label: "Angry", value: "angry", icon: "😡" },
    { label: "Scared", value: "scared", icon: "😨" },
    { label: "Worried", value: "worried", icon: "😟" },
    { label: "Tired", value: "tired", icon: "😴" },
    { label: "Disgusted", value: "disgusted", icon: "🤢" },
    { label: "Overwhelmed", value: "overwhelmed", icon: "😵" },
  ];

  useEffect(() => {
    fetchArticles();
  }, []);

  useEffect(() => {
    if (emotion) {
      console.log("ArticlesPage received emotion from URL:", emotion);
      setSelectedFilter(emotion);
    }
  }, [emotion]);

  useEffect(() => {
    console.log("Filtering articles for:", selectedFilter);
    if (selectedFilter === "all") {
      setFilteredArticles(articles);
    } else {
      const filtered = articles.filter(
        (article) => article.emotion_tag === selectedFilter
      );
      console.log("Filtered articles:", filtered.length, "found");
      setFilteredArticles(filtered);
    }
  }, [selectedFilter, articles]);

  const fetchArticles = async () => {
    try {
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .order("emotion_tag")
        .order("title");

      if (error) throw error;
      console.log("Total articles fetched:", data?.length || 0);
      setArticles(data || []);
    } catch (err) {
      console.error("Error fetching articles:", err);
      alert("Failed to load articles");
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filter) => {
    console.log("Filter changed to:", filter);
    setSelectedFilter(filter);
    if (filter === "all") {
      navigate("/articles", { replace: true });
    } else {
      navigate(`/articles/${filter}`, { replace: true });
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleBack = () => {
    navigate("/landing");
  };

  if (loading) {
    return (
      <div className="landing-root">
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid var(--pink)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
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
      Mental Health Reads
    </div>
  </div>
</div>
        <div className="header-right">
          <button
            className="btn-profile"
            onClick={handleBack}
            style={{ borderColor: "var(--pink)", color: "var(--pink)" }}
          >
            ← Back
          </button>
          {session && !session.isGuest && (
            <button className="btn-logout" onClick={handleSignOut}>
              Sign Out
            </button>
          )}
        </div>
      </header>

      <main style={{ padding: "40px 24px", maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ marginBottom: "32px", textAlign: "center" }}>
          <h1 className="article-head">
            Read Something That Helps
          </h1>
          <p  className="article-sub">
            Take a moment to find words that resonate with how you're feeling
          </p>
        </div>

      {/* Emotion Filter Section */}
      <div style={{ marginBottom: "40px", textAlign: "center" }}>
        {/* Desktop View: Button Filters */}
        <div className="emotion-filters-desktop">
          {emotionFilters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => handleFilterChange(filter.value)}
              style={{
                padding: "10px 20px",
                borderRadius: "24px",
                border:
                  selectedFilter === filter.value
                    ? "2px solid var(--teal)"
                    : "2px solid #e0e0e0",
                background:
                  selectedFilter === filter.value ? "var(--teal)" : "white",
                color: selectedFilter === filter.value ? "white" : "#666",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "600",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                margin: "6px",
              }}
            >
              <span>{filter.icon}</span>
              {filter.label}
            </button>
          ))}
        </div>

        {/* Mobile View: Dropdown Filter */}
        <div className="emotion-filters-mobile">
          <select
            value={selectedFilter}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="emotion-dropdown"
          >
            {emotionFilters.map((filter) => (
              <option key={filter.value} value={filter.value}>
                {filter.icon} {filter.label}
              </option>
            ))}
          </select>
        </div>
      </div>

        <div style={{
          textAlign: "center",
          color: "#666",
          fontSize: "14px",
          marginBottom: "24px"
        }}>
          {filteredArticles.length === 0 ? (
            <p>No articles found for this emotion</p>
          ) : (
            <p>
              Showing {filteredArticles.length} article{filteredArticles.length !== 1 ? 's' : ''}
              {selectedFilter !== "all" && (
                <span> for <strong style={{ color: "var(--teal)" }}>
                  {emotionFilters.find(f => f.value === selectedFilter)?.label}
                </strong></span>
              )}
            </p>
          )}
        </div>

        {filteredArticles.length > 0 ? (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: "24px"
          }}>
            {filteredArticles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        ) : (
          <div style={{
            textAlign: "center",
            padding: "60px 20px",
            backgroundColor: "#f9f9f9",
            borderRadius: "12px"
          }}>
            <div style={{ fontSize: "64px", marginBottom: "16px" }}>🔭</div>
            <h3 style={{ color: "#666", marginBottom: "8px" }}>
              No articles found
            </h3>
            <p style={{ color: "#999", fontSize: "14px" }}>
              Try selecting a different emotion filter
            </p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

function ArticleCard({ article }) {
  const [expanded, setExpanded] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);

  const emotionColors = {
    happy: { bg: "#fff9e6", color: "#f59e0b" },
    sad: { bg: "#e6f2ff", color: "#3b82f6" },
    angry: { bg: "#ffe6e6", color: "#ef4444" },
    scared: { bg: "#f3e6ff", color: "#a855f7" },
    worried: { bg: "#fff0e6", color: "#f97316" },
    tired: { bg: "#e6f3ff", color: "#06b6d4" },
    disgusted: { bg: "#ffe6f5", color: "#ec4899" },
    overwhelmed: { bg: "#e6fff9", color: "#10b981" },
  };

  const colors = emotionColors[article.emotion_tag] || { bg: "#f3f4f6", color: "#6b7280" };

  // Close modal on ESC key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setShowImageModal(false);
      }
    };

    if (showImageModal) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [showImageModal]);

  const handleImageClick = (e) => {
    e.stopPropagation(); // Prevent card click event
    setShowImageModal(true);
  };

  const handleModalClose = (e) => {
    // Only close if clicking the backdrop, not the image
    if (e.target === e.currentTarget) {
      setShowImageModal(false);
    }
  };

  return (
    <>
      <div style={{
        backgroundColor: "white",
        borderRadius: "12px",
        boxShadow: "var(--card-shadow)",
        overflow: "hidden",
        transition: "transform 0.2s, box-shadow 0.2s",
        border: "1px solid #f0f0f0"
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.boxShadow = "0 20px 40px rgba(18,18,18,0.12)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "var(--card-shadow)";
      }}>
        {/* Article Image - Clickable */}
        {article.image_url && (
          <div 
            onClick={handleImageClick}
            style={{
              width: "100%",
              height: "200px",
              backgroundImage: `url(${article.image_url})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              cursor: "pointer",
              position: "relative",
              transition: "filter 0.2s"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.filter = "brightness(0.9)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.filter = "brightness(1)";
            }}
          >
            {/* Zoom indicator overlay */}
            <div style={{
              position: "absolute",
              bottom: "8px",
              right: "8px",
              backgroundColor: "rgba(0, 0, 0, 0.6)",
              color: "white",
              padding: "4px 8px",
              borderRadius: "4px",
              fontSize: "11px",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "4px"
            }}>
              🔍 Click to enlarge
            </div>
          </div>
        )}

        {/* Article Content */}
        <div style={{ padding: "20px" }}>
          <div style={{
            display: "inline-block",
            padding: "4px 12px",
            borderRadius: "12px",
            backgroundColor: colors.bg,
            color: colors.color,
            fontSize: "12px",
            fontWeight: "600",
            marginBottom: "12px",
            textTransform: "capitalize"
          }}>
            {article.emotion_tag}
          </div>

          <h3 style={{
            fontSize: "20px",
            fontWeight: "600",
            color: "var(--text)",
            marginBottom: "12px",
            lineHeight: "1.3"
          }}>
            {article.title}
          </h3>

          <p style={{
            color: "#666",
            fontSize: "14px",
            lineHeight: "1.6",
            marginBottom: "16px"
          }}>
            {expanded 
              ? article.content 
              : `${article.content.substring(0, 150)}${article.content.length > 150 ? '...' : ''}`
            }
          </p>

          {article.content.length > 150 && (
            <button
              onClick={() => setExpanded(!expanded)}
              style={{
                background: "none",
                border: "none",
                color: "var(--teal)",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "600",
                padding: "0"
              }}
            >
              {expanded ? "Show less ↑" : "Read more →"}
            </button>
          )}
        </div>
      </div>

      {/* Fullscreen Image Modal */}
      {showImageModal && article.image_url && (
        <div
          onClick={handleModalClose}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.95)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
            padding: "20px",
            cursor: "zoom-out",
            animation: "fadeIn 0.2s ease-in"
          }}
        >
          {/* Close button */}
          <button
            onClick={() => setShowImageModal(false)}
            style={{
              position: "absolute",
              top: "20px",
              right: "20px",
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              backgroundColor: "rgba(255, 255, 255, 0.9)",
              border: "none",
              cursor: "pointer",
              fontSize: "24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s",
              padding: "0",
              boxSizing: "border-box",
              zIndex: 10000
              
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "white";
              e.currentTarget.style.transform = "scale(1.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.9)";
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            ✕
          </button>

          {/* Image info bar */}
          <div style={{
            position: "absolute",
            bottom: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "rgba(255, 255, 255, 0.9)",
            padding: "12px 24px",
            borderRadius: "24px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            fontSize: "14px",
            fontWeight: "600",
            color: "#333"
          }}>
            <span style={{
              padding: "4px 8px",
              borderRadius: "8px",
              backgroundColor: colors.bg,
              color: colors.color,
              fontSize: "12px"
            }}>
              {article.emotion_tag}
            </span>
            <span>{article.title}</span>
            <span style={{ color: "#999", fontSize: "12px" }}>
              Press ESC or click outside to close
            </span>
          </div>

          {/* The Image */}
          <img
            src={article.image_url}
            alt={article.title}
            style={{
              maxWidth: "95%",
              maxHeight: "95%",
              objectFit: "contain",
              borderRadius: "8px",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)",
              cursor: "default",
              animation: "zoomIn 0.3s ease-out"
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes zoomIn {
          from {
            transform: scale(0.9);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}