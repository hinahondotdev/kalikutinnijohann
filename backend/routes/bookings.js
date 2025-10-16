// backend/routes/bookings.js
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { authenticateUser } = require('../middleware/auth');
const { 
  sendBookingConfirmation, 
  sendCounselorNotification,
  sendAcceptanceNotification,
  sendCounselorAcceptanceNotification,
  sendRejectionNotification 
} = require('../utils/emailService');

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * POST /api/bookings/notify
 * Send email notifications after consultation booking
 * Called when student creates a new booking
 */
router.post('/notify', authenticateUser, async (req, res) => {
  try {
    const { consultationId } = req.body;

    if (!consultationId) {
      return res.status(400).json({ error: 'Consultation ID is required' });
    }

    // Fetch consultation details
    const { data: consultation, error } = await supabase
      .from('consultations')
      .select(`
        id,
        date,
        time,
        status,
        student_id,
        counselor_id,
        student:student_id(name, email),
        counselor:counselor_id(name, email)
      `)
      .eq('id', consultationId)
      .single();

    if (error || !consultation) {
      console.error('Consultation fetch error:', error);
      return res.status(404).json({ error: 'Consultation not found' });
    }

    // Check authorization (student who created it or admin)
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', req.user.id)
      .single();

    const isAuthorized = 
      userData?.role === 'admin' || 
      consultation.student_id === req.user.id;

    if (!isAuthorized) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Prepare email data
    const studentName = consultation.student?.name || consultation.student?.email?.split('@')[0] || 'Student';
    const counselorName = consultation.counselor?.name || consultation.counselor?.email?.split('@')[0] || 'Counselor';

    // Send both emails
    const results = {
      studentEmail: null,
      counselorEmail: null,
      errors: []
    };

    // Send to student
    try {
      const studentResult = await sendBookingConfirmation(
        consultation.student.email,
        studentName,
        counselorName,
        consultation.date,
        consultation.time
      );
      results.studentEmail = studentResult.success ? 'sent' : 'failed';
      if (!studentResult.success) {
        results.errors.push({ recipient: 'student', error: studentResult.error });
      }
      console.log('✅ Student email:', results.studentEmail);
    } catch (err) {
      console.error('❌ Student email error:', err);
      results.studentEmail = 'error';
      results.errors.push({ recipient: 'student', error: err.message });
    }

    // Send to counselor
    try {
      const counselorResult = await sendCounselorNotification(
        consultation.counselor.email,
        counselorName,
        studentName,
        consultation.student.email,
        consultation.date,
        consultation.time
      );
      results.counselorEmail = counselorResult.success ? 'sent' : 'failed';
      if (!counselorResult.success) {
        results.errors.push({ recipient: 'counselor', error: counselorResult.error });
      }
      console.log('✅ Counselor email:', results.counselorEmail);
    } catch (err) {
      console.error('❌ Counselor email error:', err);
      results.counselorEmail = 'error';
      results.errors.push({ recipient: 'counselor', error: err.message });
    }

    return res.json({
      success: true,
      message: 'Email notifications processed',
      results
    });

  } catch (err) {
    console.error('Error in booking notification endpoint:', err);
    return res.status(500).json({ 
      error: 'Failed to send notifications',
      message: err.message 
    });
  }
});

/**
 * POST /api/bookings/notify-acceptance
 * Send acceptance notification with video link
 * Called after counselor accepts consultation
 */
router.post('/notify-acceptance', authenticateUser, async (req, res) => {
  try {
    const { consultationId } = req.body;

    if (!consultationId) {
      return res.status(400).json({ error: 'Consultation ID is required' });
    }

    // Fetch consultation details
    const { data: consultation, error } = await supabase
      .from('consultations')
      .select(`
        id,
        date,
        time,
        status,
        video_link,
        counselor_id,
        student:student_id(name, email),
        counselor:counselor_id(name, email)
      `)
      .eq('id', consultationId)
      .single();

    if (error || !consultation) {
      return res.status(404).json({ error: 'Consultation not found' });
    }

    // Check authorization (must be counselor or admin)
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', req.user.id)
      .single();

    const isAuthorized = 
      userData?.role === 'admin' || 
      consultation.counselor_id === req.user.id;

    if (!isAuthorized) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Verify consultation is accepted and has video link
    if (consultation.status !== 'accepted') {
      return res.status(400).json({ error: 'Consultation must be accepted first' });
    }

    if (!consultation.video_link) {
      return res.status(400).json({ error: 'Video link not generated yet' });
    }

    // Prepare email data
    const studentName = consultation.student?.name || consultation.student?.email?.split('@')[0] || 'Student';
    const counselorName = consultation.counselor?.name || consultation.counselor?.email?.split('@')[0] || 'Counselor';

    // Send acceptance email with video link
    const result = await sendAcceptanceNotification(
      consultation.student.email,
      studentName,
      counselorName,
      consultation.date,
      consultation.time,
      consultation.video_link
    );

    if (!result.success) {
      console.error('Failed to send acceptance email:', result.error);
      return res.status(500).json({ 
        error: 'Failed to send acceptance notification',
        details: result.error 
      });
    }

    console.log('✅ Acceptance notification sent to:', consultation.student.email);

    return res.json({
      success: true,
      message: 'Acceptance notification sent successfully'
    });

  } catch (err) {
    console.error('Error in acceptance notification endpoint:', err);
    return res.status(500).json({ 
      error: 'Failed to send acceptance notification',
      message: err.message 
    });
  }
});

/**
 * POST /api/bookings/notify-rejection
 * Send rejection notification
 * Called after counselor rejects consultation
 */
router.post('/notify-rejection', authenticateUser, async (req, res) => {
  try {
    const { consultationId, reason } = req.body;

    if (!consultationId) {
      return res.status(400).json({ error: 'Consultation ID is required' });
    }

    // Fetch consultation details
    const { data: consultation, error } = await supabase
      .from('consultations')
      .select(`
        id,
        date,
        time,
        status,
        counselor_id,
        student:student_id(name, email),
        counselor:counselor_id(name, email)
      `)
      .eq('id', consultationId)
      .single();

    if (error || !consultation) {
      return res.status(404).json({ error: 'Consultation not found' });
    }

    // Check authorization (must be counselor or admin)
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', req.user.id)
      .single();

    const isAuthorized = 
      userData?.role === 'admin' || 
      consultation.counselor_id === req.user.id;

    if (!isAuthorized) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Prepare email data
    const studentName = consultation.student?.name || consultation.student?.email?.split('@')[0] || 'Student';
    const counselorName = consultation.counselor?.name || consultation.counselor?.email?.split('@')[0] || 'Counselor';

    // Send rejection email
    const result = await sendRejectionNotification(
      consultation.student.email,
      studentName,
      counselorName,
      consultation.date,
      consultation.time,
      reason || ''
    );

    if (!result.success) {
      console.error('Failed to send rejection email:', result.error);
      return res.status(500).json({ 
        error: 'Failed to send rejection notification',
        details: result.error 
      });
    }

    console.log('✅ Rejection notification sent to:', consultation.student.email);

    return res.json({
      success: true,
      message: 'Rejection notification sent successfully'
    });

  } catch (err) {
    console.error('Error in rejection notification endpoint:', err);
    return res.status(500).json({ 
      error: 'Failed to send rejection notification',
      message: err.message 
    });
  }
});

module.exports = router;