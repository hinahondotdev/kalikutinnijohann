// backend/utils/emailService.js
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'onboarding@resend.dev';

// 🔧 TESTING MODE: Set this to your verified email for testing
const TESTING_MODE = process.env.NODE_ENV !== 'production';
const TEST_EMAIL = process.env.TEST_EMAIL || 'pangpasok18@gmail.com';

/**
 * Send booking confirmation to student
 */
async function sendBookingConfirmation(studentEmail, studentName, counselorName, date, time) {
  try {
    const formattedDate = new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const formattedTime = formatTime(time);

    // In testing mode, send to test email but show intended recipient in subject
    const recipientEmail = TESTING_MODE ? TEST_EMAIL : studentEmail;
    const subjectPrefix = TESTING_MODE ? `[TEST - To: ${studentEmail}] ` : '';

    const { data, error } = await resend.emails.send({
      from: SENDER_EMAIL,
      to: recipientEmail,
      subject: `${subjectPrefix}Consultation Booking Confirmed - Hinahon`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(90deg, #e91e63, #00bfa5); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .info-box { background: white; padding: 20px; margin: 20px 0; border-left: 4px solid #00bfa5; border-radius: 4px; }
            .test-banner { background: #fff3cd; padding: 15px; margin-bottom: 20px; border-left: 4px solid #856404; border-radius: 4px; }
            .button { display: inline-block; background: #00bfa5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            ${TESTING_MODE ? `
            <div class="test-banner">
              <strong>🧪 TEST EMAIL</strong><br>
              This email would be sent to: <strong>${studentEmail}</strong><br>
              Currently sent to your test email because domain is not verified.
            </div>
            ` : ''}
            <div class="header">
              <h1 style="margin: 0;">Hinahon</h1>
              <p style="margin: 10px 0 0 0;">Mental Health Consultation</p>
            </div>
            <div class="content">
              <h2>Booking Confirmed!</h2>
              <p>Hello ${studentName},</p>
              <p>Your consultation booking has been successfully submitted. We're here to support your mental health journey.</p>
              
              <div class="info-box">
                <h3 style="margin-top: 0; color: #e91e63;">Consultation Details</h3>
                <p><strong>Counselor:</strong> ${counselorName}</p>
                <p><strong>Date:</strong> ${formattedDate}</p>
                <p><strong>Time:</strong> ${formattedTime}</p>
                <p><strong>Status:</strong> <span style="color: #856404;">Pending Approval</span></p>
              </div>

              <h3>What Happens Next?</h3>
              <ol>
                <li>Your counselor will review your booking request</li>
                <li>You'll receive a confirmation email once approved</li>
                <li>A video call link will be provided in the confirmation</li>
                <li>Join the call at your scheduled time</li>
              </ol>

              <p><strong>Note:</strong> The video link will be accessible starting at your scheduled time and will remain active for 1 hour.</p>

              <p>If you have any questions or need to reschedule, please contact us as soon as possible.</p>

              <div class="footer">
                <p>This is an automated message from Hinahon Mental Health Services</p>
                <p>&copy; 2025 Team Hinahon. All Rights Reserved.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    });

    if (error) {
      console.error('Error sending booking confirmation:', error);
      return { success: false, error };
    }

    console.log(`✅ Booking confirmation sent to: ${recipientEmail}${TESTING_MODE ? ` (intended: ${studentEmail})` : ''}`);
    return { success: true, data };

  } catch (err) {
    console.error('Error in sendBookingConfirmation:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Send new booking notification to counselor
 */
async function sendCounselorNotification(counselorEmail, counselorName, studentName, studentEmail, date, time) {
  try {
    const formattedDate = new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const formattedTime = formatTime(time);

    // In testing mode, send to test email
    const recipientEmail = TESTING_MODE ? TEST_EMAIL : counselorEmail;
    const subjectPrefix = TESTING_MODE ? `[TEST - To: ${counselorEmail}] ` : '';

    const { data, error } = await resend.emails.send({
      from: SENDER_EMAIL,
      to: recipientEmail,
      subject: `${subjectPrefix}New Consultation Request - Hinahon`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(90deg, #e91e63, #00bfa5); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .info-box { background: white; padding: 20px; margin: 20px 0; border-left: 4px solid #e91e63; border-radius: 4px; }
            .test-banner { background: #fff3cd; padding: 15px; margin-bottom: 20px; border-left: 4px solid #856404; border-radius: 4px; }
            .button { display: inline-block; background: #e91e63; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            ${TESTING_MODE ? `
            <div class="test-banner">
              <strong>🧪 TEST EMAIL</strong><br>
              This email would be sent to: <strong>${counselorEmail}</strong><br>
              Currently sent to your test email because domain is not verified.
            </div>
            ` : ''}
            <div class="header">
              <h1 style="margin: 0;">Hinahon</h1>
              <p style="margin: 10px 0 0 0;">Counselor Dashboard</p>
            </div>
            <div class="content">
              <h2>New Consultation Request</h2>
              <p>Hello ${counselorName},</p>
              <p>You have received a new consultation booking request.</p>
              
              <div class="info-box">
                <h3 style="margin-top: 0; color: #e91e63;">Request Details</h3>
                <p><strong>Student:</strong> ${studentName}</p>
                <p><strong>Email:</strong> ${studentEmail}</p>
                <p><strong>Requested Date:</strong> ${formattedDate}</p>
                <p><strong>Requested Time:</strong> ${formattedTime}</p>
              </div>

              <p><strong>Action Required:</strong> Please log in to your counselor dashboard to review and respond to this request.</p>

              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/counselor" class="button">
                View Dashboard
              </a>

              <p style="margin-top: 30px; font-size: 14px; color: #666;">
                <strong>Note:</strong> Please respond to this request within 24 hours. The student is waiting for your confirmation.
              </p>

              <div class="footer">
                <p>This is an automated message from Hinahon Mental Health Services</p>
                <p>&copy; 2025 Team Hinahon. All Rights Reserved.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    });

    if (error) {
      console.error('Error sending counselor notification:', error);
      return { success: false, error };
    }

    console.log(`✅ Counselor notification sent to: ${recipientEmail}${TESTING_MODE ? ` (intended: ${counselorEmail})` : ''}`);
    return { success: true, data };

  } catch (err) {
    console.error('Error in sendCounselorNotification:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Send acceptance confirmation with video link
 */
async function sendAcceptanceNotification(studentEmail, studentName, counselorName, date, time, videoLink) {
  try {
    const formattedDate = new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const formattedTime = formatTime(time);

    // In testing mode, send to test email
    const recipientEmail = TESTING_MODE ? TEST_EMAIL : studentEmail;
    const subjectPrefix = TESTING_MODE ? `[TEST - To: ${studentEmail}] ` : '';

    const { data, error } = await resend.emails.send({
      from: SENDER_EMAIL,
      to: recipientEmail,
      subject: `${subjectPrefix}Consultation Approved - Video Link Included`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(90deg, #00bfa5, #00a88c); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .info-box { background: white; padding: 20px; margin: 20px 0; border-left: 4px solid #00bfa5; border-radius: 4px; }
            .video-box { background: #e6fff9; padding: 20px; margin: 20px 0; border: 2px solid #00bfa5; border-radius: 8px; text-align: center; }
            .test-banner { background: #fff3cd; padding: 15px; margin-bottom: 20px; border-left: 4px solid #856404; border-radius: 4px; }
            .button { display: inline-block; background: #00bfa5; color: white; padding: 15px 40px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
            .warning { background: #fff3cd; padding: 15px; border-left: 4px solid #856404; margin: 20px 0; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="container">
            ${TESTING_MODE ? `
            <div class="test-banner">
              <strong>🧪 TEST EMAIL</strong><br>
              This email would be sent to: <strong>${studentEmail}</strong><br>
              Currently sent to your test email because domain is not verified.
            </div>
            ` : ''}
            <div class="header">
              <h1 style="margin: 0;">✅ Consultation Approved!</h1>
            </div>
            <div class="content">
              <p>Hello ${studentName},</p>
              <p>Great news! Your consultation has been approved by your counselor.</p>
              
              <div class="info-box">
                <h3 style="margin-top: 0; color: #00bfa5;">Consultation Details</h3>
                <p><strong>Counselor:</strong> ${counselorName}</p>
                <p><strong>Date:</strong> ${formattedDate}</p>
                <p><strong>Time:</strong> ${formattedTime}</p>
                <p><strong>Status:</strong> <span style="color: #155724;">✓ Confirmed</span></p>
              </div>

              <div class="video-box">
                <h3 style="color: #00bfa5; margin-top: 0;">Your Video Call Link</h3>
                <p style="margin: 20px 0;">Click the button below to join your consultation:</p>
                <a href="${videoLink}" class="button">
                  🎥 Join Video Consultation
                </a>
                <p style="margin-top: 20px; font-size: 14px; color: #666;">
                  Or copy this link: <br>
                  <code style="background: white; padding: 5px 10px; border-radius: 4px; display: inline-block; margin-top: 10px; word-break: break-all;">${videoLink}</code>
                </p>
              </div>

              <div class="warning">
                <strong>⏰ Important:</strong>
                <ul style="margin: 10px 0;">
                  <li>The video link will be <strong>active at your scheduled time</strong></li>
                  <li>The link remains active for <strong>1 hour</strong> after the start time</li>
                  <li>Please join on time to make the most of your session</li>
                </ul>
              </div>

              <h3>Before Your Session:</h3>
              <ul>
                <li>✓ Test your camera and microphone</li>
                <li>✓ Find a quiet, private space</li>
                <li>✓ Have a stable internet connection</li>
                <li>✓ Prepare any questions or concerns you want to discuss</li>
              </ul>

              <p>We're here to support you. If you have any technical issues or need to reschedule, please contact us immediately.</p>

              <div class="footer">
                <p>This is an automated message from Hinahon Mental Health Services</p>
                <p>&copy; 2025 Team Hinahon. All Rights Reserved.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    });

    if (error) {
      console.error('Error sending acceptance notification:', error);
      return { success: false, error };
    }

    console.log(`✅ Acceptance notification sent to: ${recipientEmail}${TESTING_MODE ? ` (intended: ${studentEmail})` : ''}`);
    return { success: true, data };

  } catch (err) {
    console.error('Error in sendAcceptanceNotification:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Send rejection notification
 */
async function sendRejectionNotification(studentEmail, studentName, counselorName, date, time, reason) {
  try {
    const formattedDate = new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const formattedTime = formatTime(time);

    // In testing mode, send to test email
    const recipientEmail = TESTING_MODE ? TEST_EMAIL : studentEmail;
    const subjectPrefix = TESTING_MODE ? `[TEST - To: ${studentEmail}] ` : '';

    const { data, error } = await resend.emails.send({
      from: SENDER_EMAIL,
      to: recipientEmail,
      subject: `${subjectPrefix}Consultation Request Update - Hinahon`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #6c757d; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .info-box { background: white; padding: 20px; margin: 20px 0; border-left: 4px solid #6c757d; border-radius: 4px; }
            .test-banner { background: #fff3cd; padding: 15px; margin-bottom: 20px; border-left: 4px solid #856404; border-radius: 4px; }
            .button { display: inline-block; background: #00bfa5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            ${TESTING_MODE ? `
            <div class="test-banner">
              <strong>🧪 TEST EMAIL</strong><br>
              This email would be sent to: <strong>${studentEmail}</strong><br>
              Currently sent to your test email because domain is not verified.
            </div>
            ` : ''}
            <div class="header">
              <h1 style="margin: 0;">Consultation Request Update</h1>
            </div>
            <div class="content">
              <p>Hello ${studentName},</p>
              <p>We wanted to update you about your consultation request.</p>
              
              <div class="info-box">
                <h3 style="margin-top: 0;">Request Details</h3>
                <p><strong>Counselor:</strong> ${counselorName}</p>
                <p><strong>Date:</strong> ${formattedDate}</p>
                <p><strong>Time:</strong> ${formattedTime}</p>
                ${reason ? `<p><strong>Note:</strong> ${reason}</p>` : ''}
              </div>

              <p>Unfortunately, your counselor is unable to accommodate this particular time slot. Please don't be discouraged - this doesn't reflect on you or your needs.</p>

              <h3>What You Can Do:</h3>
              <ul>
                <li>Book another time slot that works better</li>
                <li>Choose a different counselor if available</li>
                <li>Contact us if you need assistance</li>
              </ul>

              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/booking" class="button">
                Book Another Time
              </a>

              <p style="margin-top: 30px;">Remember, seeking help is a sign of strength. We're here to support you on your mental health journey.</p>

              <div class="footer">
                <p>This is an automated message from Hinahon Mental Health Services</p>
                <p>&copy; 2025 Team Hinahon. All Rights Reserved.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    });

    if (error) {
      console.error('Error sending rejection notification:', error);
      return { success: false, error };
    }

    console.log(`✅ Rejection notification sent to: ${recipientEmail}${TESTING_MODE ? ` (intended: ${studentEmail})` : ''}`);
    return { success: true, data };

  } catch (err) {
    console.error('Error in sendRejectionNotification:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Send acceptance confirmation to counselor with video link
 */
async function sendCounselorAcceptanceNotification(counselorEmail, counselorName, studentName, studentEmail, date, time, videoLink) {
  try {
    console.log('🔧 sendCounselorAcceptanceNotification called');
    console.log('   Counselor email:', counselorEmail);
    console.log('   Student name:', studentName);
    
    const formattedDate = new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const formattedTime = formatTime(time);

    // In testing mode, send to test email
    const recipientEmail = TESTING_MODE ? TEST_EMAIL : counselorEmail;
    const subjectPrefix = TESTING_MODE ? `[TEST - To: ${counselorEmail}] ` : '';

    console.log('📧 Preparing to send counselor acceptance email to:', recipientEmail);

    const { data, error } = await resend.emails.send({
      from: SENDER_EMAIL,
      to: recipientEmail,
      subject: `${subjectPrefix}Consultation Accepted - Video Link & Student Details`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(90deg, #00bfa5, #00a88c); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .info-box { background: white; padding: 20px; margin: 20px 0; border-left: 4px solid #00bfa5; border-radius: 4px; }
            .video-box { background: #e6fff9; padding: 20px; margin: 20px 0; border: 2px solid #00bfa5; border-radius: 8px; text-align: center; }
            .test-banner { background: #fff3cd; padding: 15px; margin-bottom: 20px; border-left: 4px solid #856404; border-radius: 4px; }
            .button { display: inline-block; background: #00bfa5; color: white; padding: 15px 40px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
            .warning { background: #fff3cd; padding: 15px; border-left: 4px solid #856404; margin: 20px 0; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="container">
            ${TESTING_MODE ? `
            <div class="test-banner">
              <strong>🧪 TEST EMAIL - COUNSELOR COPY</strong><br>
              This email would be sent to: <strong>${counselorEmail}</strong><br>
              Currently sent to your test email because domain is not verified.
            </div>
            ` : ''}
            <div class="header">
              <h1 style="margin: 0;">✅ Consultation Confirmed!</h1>
              <p style="margin: 10px 0 0 0;">Counselor Copy</p>
            </div>
            <div class="content">
              <p>Hello ${counselorName},</p>
              <p>This is your confirmation that you've accepted a consultation session. Below are the complete details.</p>
              
              <div class="info-box">
                <h3 style="margin-top: 0; color: #00bfa5;">Session Details</h3>
                <p><strong>Student Name:</strong> ${studentName}</p>
                <p><strong>Student Email:</strong> ${studentEmail}</p>
                <p><strong>Date:</strong> ${formattedDate}</p>
                <p><strong>Time:</strong> ${formattedTime}</p>
                <p><strong>Status:</strong> <span style="color: #155724;">✓ Confirmed</span></p>
              </div>

              <div class="video-box">
                <h3 style="color: #00bfa5; margin-top: 0;">Your Video Call Link</h3>
                <p style="margin: 20px 0;">Click the button below to join the consultation:</p>
                <a href="${videoLink}" class="button">
                  🎥 Join Video Consultation
                </a>
                <p style="margin-top: 20px; font-size: 14px; color: #666;">
                  Or copy this link: <br>
                  <code style="background: white; padding: 5px 10px; border-radius: 4px; display: inline-block; margin-top: 10px; word-break: break-all;">${videoLink}</code>
                </p>
              </div>

              <div class="warning">
                <strong>⏰ Important Session Information:</strong>
                <ul style="margin: 10px 0;">
                  <li>The video link will be <strong>active at the scheduled time</strong></li>
                  <li>The link remains active for <strong>1 hour</strong> after the start time</li>
                  <li>Please join a few minutes early to ensure everything is working</li>
                  <li>The student has also received this video link via email</li>
                </ul>
              </div>

              <h3>Session Preparation Checklist:</h3>
              <ul>
                <li>✓ Review student information before the session</li>
                <li>✓ Ensure your camera and microphone are working</li>
                <li>✓ Choose a quiet, private space for the consultation</li>
                <li>✓ Have stable internet connection</li>
                <li>✓ Prepare any relevant materials or notes</li>
              </ul>

              <p>If you need to cancel or reschedule this session, please contact the student as soon as possible and update the booking status in your dashboard.</p>

              <div class="footer">
                <p>This is an automated message from Hinahon Mental Health Services</p>
                <p>&copy; 2025 Team Hinahon. All Rights Reserved.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    });

    if (error) {
      console.error('❌ Resend API error for counselor:', error);
      return { success: false, error };
    }

    console.log(`✅ Counselor acceptance notification sent to: ${recipientEmail}${TESTING_MODE ? ` (intended: ${counselorEmail})` : ''}`);
    return { success: true, data };

  } catch (err) {
    console.error('❌ Exception in sendCounselorAcceptanceNotification:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Helper function to format time
 */
function formatTime(timeString) {
  const [hours, minutes] = timeString.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}

/**
 * Send auto-rejection notification when slot is taken by another student
 */
async function sendAutoRejectionNotification(studentEmail, studentName, counselorName, date, time) {
  try {
    const formattedDate = new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const formattedTime = formatTime(time);

    const recipientEmail = TESTING_MODE ? TEST_EMAIL : studentEmail;
    const subjectPrefix = TESTING_MODE ? `[TEST - To: ${studentEmail}] ` : '';

    const { data, error } = await resend.emails.send({
      from: SENDER_EMAIL,
      to: recipientEmail,
      subject: `${subjectPrefix}Consultation Time Slot No Longer Available - Hinahon`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #ff9800; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .info-box { background: white; padding: 20px; margin: 20px 0; border-left: 4px solid #ff9800; border-radius: 4px; }
            .test-banner { background: #fff3cd; padding: 15px; margin-bottom: 20px; border-left: 4px solid #856404; border-radius: 4px; }
            .button { display: inline-block; background: #00bfa5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            ${TESTING_MODE ? `
            <div class="test-banner">
              <strong>🧪 TEST EMAIL</strong><br>
              This email would be sent to: <strong>${studentEmail}</strong>
            </div>
            ` : ''}
            <div class="header">
              <h1 style="margin: 0;">⚠️ Time Slot Update</h1>
            </div>
            <div class="content">
              <p>Hello ${studentName},</p>
              <p>We wanted to inform you about a change to your consultation request.</p>
              
              <div class="info-box">
                <h3 style="margin-top: 0; color: #ff9800;">Requested Time Slot</h3>
                <p><strong>Counselor:</strong> ${counselorName}</p>
                <p><strong>Date:</strong> ${formattedDate}</p>
                <p><strong>Time:</strong> ${formattedTime}</p>
              </div>

              <p><strong>What happened?</strong></p>
              <p>Unfortunately, this time slot was booked by another student while your request was pending. The counselor has accepted their consultation request for this specific time.</p>

              <p><strong>This is not a reflection of you or your needs.</strong> Time slots are handled on a first-accepted basis to ensure fair scheduling.</p>

              <h3>📅 What You Can Do Next:</h3>
              <ul>
                <li>Book a different time slot with the same counselor</li>
                <li>Choose a different counselor who may have availability</li>
                <li>Contact us if you need help finding available times</li>
              </ul>

              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/booking" class="button">
                View Available Time Slots
              </a>

              <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 14px; color: #666;">
                <strong>Remember:</strong> Your mental health matters. We're here to help you find the right time to connect with a counselor. Don't hesitate to book another slot that works for you.
              </p>

              <div class="footer">
                <p>This is an automated message from Hinahon Mental Health Services</p>
                <p>If you have any questions, please contact our support team</p>
                <p>&copy; 2025 Team Hinahon. All Rights Reserved.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    });

    if (error) {
      console.error('Error sending auto-rejection notification:', error);
      return { success: false, error };
    }

    console.log(`✅ Auto-rejection notification sent to: ${recipientEmail}${TESTING_MODE ? ` (intended: ${studentEmail})` : ''}`);
    return { success: true, data };

  } catch (err) {
    console.error('Error in sendAutoRejectionNotification:', err);
    return { success: false, error: err.message };
  }
}

module.exports = {
  sendBookingConfirmation,
  sendCounselorNotification,
  sendAcceptanceNotification,
  sendCounselorAcceptanceNotification,
  sendRejectionNotification,
  sendAutoRejectionNotification  // ✅ Add this export
};