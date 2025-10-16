// FILE: src/pages/AboutPage.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Footer from '../components/Footer';
import logomark from "../assets/hinahon2.png";
import "../styles.css";

export default function AboutPage({ session }) {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

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
      Learn About the Developers
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
          {session && !session.isGuest && (
            <button className="btn-logout" onClick={handleSignOut}>
              Sign Out
            </button>
          )}
        </div>
      </header>

      <main style={{ padding: "60px 24px", maxWidth: "1200px", margin: "0 auto" }}>
        {/* Hero Section */}
        <div style={{ textAlign: "center", marginBottom: "60px" }}>
          <h1 style={{
            fontSize: "89px",
            color: "var(--pink)",
            marginBottom: "16px",
            fontFamily: "'Playfair Display', serif",
            lineHeight: "1.2"
          }}>
            About Hinahon
          </h1>
          <p style={{
            fontSize: "19px",
            color: "#666",
            maxWidth: "700px",
            margin: "0 auto",
            lineHeight: "1.6"
          }}>
            A Digital Solution for Accessible Mental Health Services at LPU Batangas
          </p>
        </div>

        {/* Meet the Developers */}
        <section style={{
          backgroundColor: "white",
          borderRadius: "16px",
          padding: "48px",
          marginBottom: "40px",
          boxShadow: "var(--card-shadow)",
          border: "1px solid #f0f0f0"
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "32px"
          }}>
            <h2 style={{
              fontSize: "36px",
              color: "var(--pink)",
              margin: "0",
              fontFamily: "'Playfair Display', serif"
            }}>
              Meet the Developers
            </h2>
          </div>

          <p style={{ 
            color: "#666", 
            fontSize: "16px", 
            lineHeight: "1.8",
            marginBottom: "32px" 
          }}>
            Hinahon is developed by a passionate team of Information Technology students from Lyceum of the Philippines University - Batangas, dedicated to leveraging technology to address mental health accessibility challenges within our university community.
          </p>

          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "24px" 
          }}>
            {[
              { name: "Marc Jethro Bayaborda", role: "Lead Developer", email: "marcjethrobayaborda@lpubatangas.edu.ph" },
              { name: "Leandre Basit", role: "Project Lead", email: "leandrebasit@lpubatangas.edu.ph" },
              { name: "Elmar Johann Boniel", role: "UI/UX Designer", email: "elmarjohannboniel@lpubatangas.edu.ph" }
            ].map((dev, index) => (
              <div key={index} style={{
                backgroundColor: "#f8f9fa",
                padding: "24px",
                borderRadius: "12px",
                border: "1px solid #e0e0e0",
                textAlign: "center"
              }}>
                <div style={{
                  width: "80px",
                  height: "80px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, var(--pink), var(--teal))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                  color: "white",
                  fontSize: "32px",
                  fontWeight: "600"
                }}>
                  {dev.name.split(' ').map(n => n[0]).join('')}
                </div>
                <h3 style={{
                  margin: "0 0 4px 0",
                  fontSize: "18px",
                  color: "var(--text)",
                  fontWeight: "600"
                }}>
                  {dev.name}
                </h3>
                <p style={{
                  margin: "0 0 8px 0",
                  fontSize: "14px",
                  color: "var(--teal)",
                  fontWeight: "500"
                }}>
                  {dev.role}
                </p>
                <p style={{
                  margin: "0",
                  fontSize: "13px",
                  color: "#999"
                }}>
                  {dev.email}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Rationale */}
        <section style={{
          backgroundColor: "white",
          borderRadius: "16px",
          padding: "48px",
          marginBottom: "40px",
          boxShadow: "var(--card-shadow)",
          border: "1px solid #f0f0f0"
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "24px"
          }}>
            <h2 style={{
              fontSize: "36px",
              color: "var(--teal)",
              margin: "0",
              fontFamily: "'Playfair Display', serif"
            }}>
              Rationale
            </h2>
          </div>

          <div style={{ color: "#444", fontSize: "16px", lineHeight: "1.8" }}>
            <p style={{ marginBottom: "20px" }}>
              Mental health issues among Filipino students have escalated significantly, particularly in the aftermath of the COVID-19 pandemic. Studies show that a substantial number of students experience anxiety, depression, and stress, yet many struggle to access timely professional support due to various barriers including:
            </p>

            <ul style={{ 
              marginBottom: "20px",
              paddingLeft: "24px",
              color: "#666"
            }}>
              <li style={{ marginBottom: "8px" }}>Limited availability of mental health professionals in educational institutions</li>
              <li style={{ marginBottom: "8px" }}>Long waiting times for counseling appointments</li>
              <li style={{ marginBottom: "8px" }}>Geographic limitations and transportation challenges</li>
              <li style={{ marginBottom: "8px" }}>Social stigma associated with seeking mental health services</li>
              <li style={{ marginBottom: "8px" }}>Lack of awareness about available mental health resources</li>
            </ul>

            <p style={{ 
              marginBottom: "0",
              backgroundColor: "#e6fff9",
              padding: "20px",
              borderRadius: "8px",
              borderLeft: "4px solid var(--teal)"
            }}>
              <strong>Hinahon addresses these challenges</strong> by providing a digital platform that makes mental health counseling accessible, convenient, and destigmatized. Our solution leverages technology to connect students with professional counselors through secure video consultations, eliminating geographical barriers and reducing wait times.
            </p>
          </div>
        </section>

        {/* Objectives */}
        <section style={{
          backgroundColor: "white",
          borderRadius: "16px",
          padding: "48px",
          marginBottom: "40px",
          boxShadow: "var(--card-shadow)",
          border: "1px solid #f0f0f0"
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "24px"
          }}>
            <h2 style={{
              fontSize: "36px",
              color: "var(--pink)",
              margin: "0",
              fontFamily: "'Playfair Display', serif"
            }}>
              Project Objectives
            </h2>
          </div>

          <div style={{ color: "#444", fontSize: "16px", lineHeight: "1.8" }}>
            <p style={{ marginBottom: "24px" }}>
              The Hinahon platform aims to achieve the following objectives:
            </p>

            <div style={{ display: "grid", gap: "20px" }}>
              {[
                {
                  num: "01",
                  title: "Improve Accessibility",
                  desc: "Provide students with 24/7 access to book counseling appointments at their convenience, reducing barriers to mental health support."
                },
                {
                  num: "02",
                  title: "Reduce Stigma",
                  desc: "Create a private, discreet platform that normalizes mental health care and encourages students to seek help without fear of judgment."
                },
                {
                  num: "03",
                  title: "Enable Remote Consultations",
                  desc: "Facilitate secure video conferencing between students and licensed counselors, eliminating geographical constraints and transportation barriers."
                },
                {
                  num: "04",
                  title: "Streamline Appointment Management",
                  desc: "Implement an efficient booking system that allows counselors to manage their schedules and students to easily find available time slots."
                },
                {
                  num: "05",
                  title: "Provide Educational Resources",
                  desc: "Offer emotion-based articles and mental health resources to help students understand and manage their mental well-being."
                },
                {
                  num: "06",
                  title: "Ensure Data Privacy and Security",
                  desc: "Implement robust security measures to protect sensitive student information and maintain confidentiality in all consultations."
                }
              ].map((objective, index) => (
                <div key={index} style={{
                  display: "flex",
                  gap: "20px",
                  alignItems: "flex-start",
                  padding: "20px",
                  backgroundColor: index % 2 === 0 ? "#fff" : "#f8f9fa",
                  borderRadius: "12px",
                  border: "1px solid #e0e0e0"
                }}>
                  <div style={{
                    fontSize: "28px",
                    fontWeight: "700",
                    color: "var(--teal)",
                    fontFamily: "'Playfair Display', serif",
                    minWidth: "45px"
                  }}>
                    {objective.num}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{
                      margin: "0 0 8px 0",
                      fontSize: "18px",
                      color: "var(--text)",
                      fontWeight: "600"
                    }}>
                      {objective.title}
                    </h3>
                    <p style={{ margin: "0", color: "#666", fontSize: "15px", lineHeight: "1.6" }}>
                      {objective.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Collaboration with CATC */}
        <section style={{
          backgroundColor: "white",
          borderRadius: "16px",
          padding: "48px",
          marginBottom: "40px",
          boxShadow: "var(--card-shadow)",
          border: "1px solid #f0f0f0"
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "24px"
          }}>
            <h2 style={{
              fontSize: "36px",
              color: "var(--teal)",
              margin: "0",
              fontFamily: "'Playfair Display', serif"
            }}>
              Collaboration with CATC
            </h2>
          </div>

          <div style={{ color: "#444", fontSize: "16px", lineHeight: "1.8" }}>
            <p style={{ marginBottom: "20px" }}>
              Hinahon is developed in collaboration with the <strong>Counseling and Testing Center (CATC)</strong> of Lyceum of the Philippines University - Batangas, ensuring that our platform meets the professional standards and requirements for mental health service delivery within our university.
            </p>

            <div style={{
              backgroundColor: "#f8f9fa",
              padding: "24px",
              borderRadius: "12px",
              border: "1px solid #e0e0e0",
              marginBottom: "20px"
            }}>
              <h3 style={{
                margin: "0 0 16px 0",
                fontSize: "20px",
                color: "var(--pink)",
                fontWeight: "600"
              }}>
                Key Partnership Benefits:
              </h3>
              <ul style={{ 
                margin: "0",
                paddingLeft: "24px",
                color: "#666"
              }}>
                <li style={{ marginBottom: "12px" }}>
                  <strong>Professional Guidance:</strong> CATC counselors provide expert input on platform features and counseling workflow requirements
                </li>
                <li style={{ marginBottom: "12px" }}>
                  <strong>Licensed Counselors:</strong> All counselors on the platform are licensed professionals affiliated with CATC
                </li>
                <li style={{ marginBottom: "12px" }}>
                  <strong>Quality Assurance:</strong> CATC ensures that all counseling services meet professional and ethical standards
                </li>
                <li style={{ marginBottom: "12px" }}>
                  <strong>Student Integration:</strong> Seamless integration with existing university counseling services and student support systems
                </li>
                <li style={{ marginBottom: "0" }}>
                  <strong>Resource Sharing:</strong> Access to CATC's mental health resources and educational materials for platform content
                </li>
              </ul>
            </div>

            <div style={{
              backgroundColor: "#fff9e6",
              padding: "20px",
              borderRadius: "8px",
              border: "1px solid #ffe082",
              display: "flex",
              alignItems: "flex-start",
              gap: "16px"
            }}>
              <span style={{ fontSize: "24px" }}>💡</span>
              <div>
                <p style={{ margin: "0", color: "#666" }}>
                  <strong>Partnership Contact:</strong> For inquiries about our collaboration with CATC or to learn more about the Hinahon platform, please contact:
                </p>
                <p style={{ 
                  margin: "12px 0 0 0", 
                  color: "var(--teal)",
                  fontWeight: "600" 
                }}>
                  CATC - Lyceum of the Philippines University - Batangas<br />
                  Email: catc@lpubatangas.edu.ph<br />
                  Phone: (043) 723-0706
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}