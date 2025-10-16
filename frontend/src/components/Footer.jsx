import React, { useState } from 'react';
import '../styles.css';

const Footer = () => {
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showContact, setShowContact] = useState(false);

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
    <>
      <footer className="app-footer-new">
        <div className="footer-container-new">
          {/* Top Section: Quote */}
          <div className="footer-quote">
            "In Hinahon, your Mental Wellness is our priority."
          </div>

          {/* Middle Section: Icons and Links */}
          <div className="footer-middle">
            {/* Social Icons */}
            <div className="footer-social-icons">
              <a
                href="https://www.facebook.com/LPUCATC"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-icon-circle"
                aria-label="Facebook"
              >
                <svg width="28" height="28" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>

              <a
                href="catc@lpubatangas.edu.ph"
                className="footer-icon-circle"
                aria-label="Email"
              >
                <svg width="28" height="28" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                </svg>
              </a>

              <a
                href="https://lpubatangas.edu.ph/counseling-and-testing-center/"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-icon-circle"
                aria-label="Website"
              >
                <svg width="28" height="28" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                </svg>
              </a>
            </div>

            {/* Divider */}
            <div className="footer-divider"></div>

            {/* Links Section */}
            <div className="footer-links-section">
              <button
                onClick={() => setShowTerms(true)}
                className="footer-link-text"
              >
                Terms and Conditions
              </button>
              <button
                onClick={() => setShowPrivacy(true)}
                className="footer-link-text"
              >
                Privacy Policy
              </button>
            </div>

            {/* Divider */}
            <div className="footer-divider"></div>

            {/* Crisis Hotline */}
            <div className="footer-crisis-section">
              <div className="footer-crisis-title">CRISIS HOTLINE</div>
              <div className="footer-crisis-subtitle">Help is Available. You are not alone.</div>
              <a href="tel:09195871553" className="footer-crisis-number">0919-587-1553</a>
            </div>
          </div>

          {/* Bottom Section: Copyright */}
          <div className="footer-bottom">
            <div className="footer-separator"></div>
            <p className="footer-copyright">@2025 TEAM HINAHON | All Rights Reserved.</p>
          </div>
        </div>
      </footer>

      {/* Terms & Conditions Modal */}
      <Modal
        isOpen={showTerms}
        onClose={() => setShowTerms(false)}
        title="Terms & Conditions"
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

      {/* Privacy Policy Modal */}
      <Modal
        isOpen={showPrivacy}
        onClose={() => setShowPrivacy(false)}
        title="Privacy Policy"
      >
        <div className="footer-modal-body">
          <p className="footer-last-updated">
            Last Updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>

          <h3>1. Introduction</h3>
          <p>
            Hinahon ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mental health consultation platform.
          </p>

          <h3>2. Information We Collect</h3>
          <p>We collect the following types of information:</p>
          <ul>
            <li><strong>Personal Information:</strong> Name, email address, student ID, birthday, department, program, and year level</li>
            <li><strong>Account Information:</strong> Login credentials and authentication data</li>
            <li><strong>Consultation Data:</strong> Booking details, session notes, emotional state selections, and communication with counselors</li>
            <li><strong>Technical Data:</strong> IP address, browser type, device information, and usage patterns</li>
          </ul>

          <h3>3. How We Use Your Information</h3>
          <p>We use your information to:</p>
          <ul>
            <li>Provide and maintain our mental health consultation services</li>
            <li>Connect you with appropriate counselors</li>
            <li>Send booking confirmations and notifications</li>
            <li>Improve our platform and user experience</li>
            <li>Ensure platform security and prevent fraud</li>
            <li>Comply with legal obligations</li>
            <li>Provide customer support</li>
          </ul>

          <h3>4. Information Sharing and Disclosure</h3>
          <p>We do NOT sell your personal information. We may share your information only in the following circumstances:</p>
          <ul>
            <li><strong>With Counselors:</strong> Your basic information and consultation details are shared with assigned counselors</li>
            <li><strong>With Your Consent:</strong> When you explicitly authorize us to share information</li>
            <li><strong>Legal Requirements:</strong> When required by law or to protect rights and safety</li>
            <li><strong>Service Providers:</strong> With trusted third-party services that help us operate our platform</li>
          </ul>

          <h3>5. Data Security</h3>
          <p>We implement appropriate technical and organizational security measures to protect your information, including:</p>
          <ul>
            <li>Encrypted data transmission (SSL/TLS)</li>
            <li>Secure database storage with access controls</li>
            <li>Regular security audits and updates</li>
            <li>Authentication and authorization protocols</li>
            <li>Confidentiality agreements with staff and counselors</li>
          </ul>

          <h3>6. Your Rights and Choices</h3>
          <p>You have the right to:</p>
          <ul>
            <li>Access and review your personal information</li>
            <li>Update or correct your information through your profile</li>
            <li>Request deletion of your account and associated data</li>
            <li>Opt-out of non-essential communications</li>
            <li>Request a copy of your data</li>
          </ul>

          <h3>7. Data Retention</h3>
          <p>
            We retain your information for as long as necessary to provide our services and comply with legal obligations. Consultation records may be retained longer for professional and legal requirements.
          </p>

          <h3>8. Children's Privacy</h3>
          <p>
            Our services are intended for users aged 13 and above. We do not knowingly collect information from children under 13. If we become aware of such collection, we will promptly delete the information.
          </p>

          <h3>9. Changes to Privacy Policy</h3>
          <p>
            We may update this Privacy Policy periodically. We will notify users of significant changes via email or platform notification. Your continued use after changes constitutes acceptance.
          </p>

          <h3>10. Contact Us</h3>
          <p>
            For privacy-related questions or to exercise your rights, please contact us at privacy@hinahon.ph or call 0919-587-1553
          </p>
        </div>
      </Modal>

      {/* Contact Modal */}
      <Modal
        isOpen={showContact}
        onClose={() => setShowContact(false)}
        title="Contact Us"
      >
        <div className="footer-contact-body">
          <div className="footer-contact-icon">📞</div>
          
          <h3 className="footer-contact-title">Get in Touch With Us</h3>

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
              <span className="footer-contact-emoji">📱</span>
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
          </div>

          <div className="footer-contact-note">
            <strong>💡 Need immediate help?</strong>
            <p>If you're experiencing a mental health emergency, please call 911 or visit your nearest emergency room.</p>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default Footer;